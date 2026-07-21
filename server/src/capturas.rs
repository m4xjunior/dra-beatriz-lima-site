//! Endpoints de persistência das capturas do mesh 3D (`/api/capturas`).
//!
//! Guarda SÓ pontos numéricos (landmarks do MediaPipe: x,y,z normalizados),
//! nunca frame de vídeo/imagem — é isso que torna o dado não-identificável
//! como foto e mantém o payload leve. Um arquivo JSON por captura em
//! `dados/capturas/{uuid}.json`, nome gerado pelo servidor (nunca aceito do
//! cliente, para não abrir path traversal).
//!
//! Protótipo de usuário único: sem auth/token, sem lock de arquivo (corrida
//! GET/DELETE concorrente no mesmo id é risco aceito nesta etapa — ver ADR
//! no README). CORS permissivo aplicado globalmente em `main.rs`.

use std::{
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    Json, Router,
    extract::Path as AxumPath,
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Pasta de dados, relativa à raiz do crate `server/` (dentro do crate porque
/// é inteiramente gerida pelo próprio servidor — ao contrário de `../dist`,
/// que é gerado pelo Astro, fora do crate).
const CAPTURAS_DIR: &str = "dados/capturas";

const VARIANTES_VALIDAS: [&str; 2] = ["hero", "inline"];
const MIN_QUADROS: usize = 20;
const MAX_QUADROS: usize = 60;
const MIN_PONTOS_POR_QUADRO: u32 = 400;
const MAX_PONTOS_POR_QUADRO: u32 = 500;
const LIMITE_COORDENADA: f32 = 10.0;

/// Corpo recebido do cliente ao criar uma captura. Não inclui `capturaId`,
/// `criadoEmUnixMs` nem `totalQuadros` — esses são derivados pelo servidor.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NovaCaptura {
    versao_esquema: u32,
    variante: String,
    fps_alvo: u32,
    pontos_por_quadro: u32,
    quadros: Vec<Vec<f32>>,
}

/// Shape completo persistido em disco — idêntico ao corpo de resposta do GET.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Captura {
    captura_id: Uuid,
    criado_em_unix_ms: u64,
    versao_esquema: u32,
    variante: String,
    fps_alvo: u32,
    pontos_por_quadro: u32,
    total_quadros: u32,
    quadros: Vec<Vec<f32>>,
}

/// Resposta trimada do POST — o cliente já tem os quadros em memória, não faz
/// sentido ecoar de volta ~600KB de JSON.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RespostaCriacao {
    captura_id: Uuid,
    criado_em_unix_ms: u64,
    total_quadros: u32,
}

#[derive(Debug, Serialize)]
struct RespostaErro {
    erro: String,
}

fn erro_json(status: StatusCode, mensagem: impl Into<String>) -> Response {
    (status, Json(RespostaErro { erro: mensagem.into() })).into_response()
}

/// Monta o `Router` das rotas de captura. Sintaxe `{id}` (axum 0.8) — NUNCA
/// `:id`, que panica sem `.without_v07_checks()`.
pub fn rotas() -> Router {
    Router::new()
        .route("/api/capturas", post(criar))
        .route("/api/capturas/{id}", get(buscar).delete(apagar))
}

/// Valida o conteúdo de uma `NovaCaptura` segundo as regras do contrato.
/// Retorna a primeira violação encontrada, em PT-BR, pronta para o corpo 400.
fn validar(captura: &NovaCaptura) -> Result<(), String> {
    if captura.versao_esquema != 1 {
        return Err("versaoEsquema deve ser exatamente 1".to_string());
    }

    if !VARIANTES_VALIDAS.contains(&captura.variante.as_str()) {
        return Err("variante deve ser \"hero\" ou \"inline\"".to_string());
    }

    if !(MIN_QUADROS..=MAX_QUADROS).contains(&captura.quadros.len()) {
        return Err(format!(
            "quadros deve conter entre {MIN_QUADROS} e {MAX_QUADROS} itens (recebido {})",
            captura.quadros.len()
        ));
    }

    if !(MIN_PONTOS_POR_QUADRO..=MAX_PONTOS_POR_QUADRO).contains(&captura.pontos_por_quadro) {
        return Err(format!(
            "pontosPorQuadro deve estar entre {MIN_PONTOS_POR_QUADRO} e {MAX_PONTOS_POR_QUADRO} (recebido {})",
            captura.pontos_por_quadro
        ));
    }

    let tamanho_esperado = captura.pontos_por_quadro as usize * 3;

    for (indice, quadro) in captura.quadros.iter().enumerate() {
        if quadro.len() != tamanho_esperado {
            return Err(format!(
                "quadro {indice} tem {} números, esperado {tamanho_esperado} (pontosPorQuadro * 3)",
                quadro.len()
            ));
        }

        for &valor in quadro {
            if !valor.is_finite() {
                return Err(format!("quadro {indice} contém um número não finito"));
            }
            if !(-LIMITE_COORDENADA..=LIMITE_COORDENADA).contains(&valor) {
                return Err(format!(
                    "quadro {indice} contém uma coordenada fora da faixa permitida (±{LIMITE_COORDENADA})"
                ));
            }
        }
    }

    Ok(())
}

fn caminho_arquivo(id: Uuid) -> PathBuf {
    Path::new(CAPTURAS_DIR).join(format!("{id}.json"))
}

/// `POST /api/capturas` — valida, gera id/timestamp, grava em disco.
async fn criar(Json(nova): Json<NovaCaptura>) -> Response {
    if let Err(mensagem) = validar(&nova) {
        return erro_json(StatusCode::BAD_REQUEST, mensagem);
    }

    let captura_id = Uuid::new_v4();
    let criado_em_unix_ms = match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duracao) => duracao.as_millis() as u64,
        Err(erro) => {
            tracing::error!(%erro, "relógio do sistema antes de UNIX_EPOCH");
            return erro_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                "não foi possível salvar a captura agora",
            );
        }
    };

    let total_quadros = nova.quadros.len() as u32;

    let captura = Captura {
        captura_id,
        criado_em_unix_ms,
        versao_esquema: nova.versao_esquema,
        variante: nova.variante,
        fps_alvo: nova.fps_alvo,
        pontos_por_quadro: nova.pontos_por_quadro,
        total_quadros,
        quadros: nova.quadros,
    };

    if let Err(erro) = salvar_no_disco(&captura).await {
        tracing::error!(captura_id = %captura_id, %erro, "falha ao salvar captura em disco");
        return erro_json(
            StatusCode::INTERNAL_SERVER_ERROR,
            "não foi possível salvar a captura agora",
        );
    }

    tracing::info!(
        captura_id = %captura_id,
        total_quadros,
        variante = %captura.variante,
        "captura salva em disco"
    );

    (
        StatusCode::CREATED,
        Json(RespostaCriacao {
            captura_id,
            criado_em_unix_ms,
            total_quadros,
        }),
    )
        .into_response()
}

async fn salvar_no_disco(captura: &Captura) -> anyhow::Result<()> {
    use anyhow::Context;

    tokio::fs::create_dir_all(CAPTURAS_DIR)
        .await
        .with_context(|| format!("falha ao criar diretório {CAPTURAS_DIR}"))?;

    let bytes = serde_json::to_vec(captura).context("falha ao serializar captura para JSON")?;

    let caminho = caminho_arquivo(captura.captura_id);
    tokio::fs::write(&caminho, bytes)
        .await
        .with_context(|| format!("falha ao escrever arquivo {}", caminho.display()))?;

    Ok(())
}

/// `GET /api/capturas/{id}` — devolve o JSON cru salvo em disco (o próprio
/// servidor escreveu nesse formato, então ler-e-devolver direto evita um
/// round-trip desnecessário de desserializar/reserializar).
async fn buscar(AxumPath(id): AxumPath<Uuid>) -> Response {
    let caminho = caminho_arquivo(id);

    match tokio::fs::read(&caminho).await {
        Ok(bytes) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/json")],
            bytes,
        )
            .into_response(),
        Err(erro) if erro.kind() == std::io::ErrorKind::NotFound => {
            erro_json(StatusCode::NOT_FOUND, "captura não encontrada")
        }
        Err(erro) => {
            tracing::error!(captura_id = %id, %erro, "falha de IO ao ler captura");
            erro_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                "não foi possível ler a captura agora",
            )
        }
    }
}

/// `DELETE /api/capturas/{id}` — apaga o arquivo, distinguindo "não existe"
/// (404) de qualquer outra falha de IO (500).
async fn apagar(AxumPath(id): AxumPath<Uuid>) -> Response {
    let caminho = caminho_arquivo(id);

    match tokio::fs::remove_file(&caminho).await {
        Ok(()) => {
            tracing::info!(captura_id = %id, "captura apagada");
            StatusCode::NO_CONTENT.into_response()
        }
        Err(erro) if erro.kind() == std::io::ErrorKind::NotFound => {
            erro_json(StatusCode::NOT_FOUND, "captura não encontrada")
        }
        Err(erro) => {
            tracing::error!(captura_id = %id, %erro, "falha de IO ao apagar captura");
            erro_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                "não foi possível apagar a captura agora",
            )
        }
    }
}
