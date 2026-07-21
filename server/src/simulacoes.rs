//! Esqueleto do módulo de simulação estética (`/api/simulacoes`) — Fase 1
//! MVP, ver specs/001-simulacao-mvp-skeleton.md.
//!
//! Plugável de propósito: `ProvedorSimulacao` é o ponto de extensão para o
//! provedor pago real (Perfect Corp/YouCam ou equivalente) — hoje só existe
//! `ProvedorMock` (sem custo, sem chamada de rede). Trocar de provedor depois
//! é implementar o trait numa struct nova e passar ela em `rotas()`; nenhum
//! handler HTTP muda.
//!
//! Postgres é OPCIONAL na inicialização: se a conexão falhar, `/api/simulacoes`
//! responde 503 — a persistência de capturas e o servir estático continuam
//! funcionando normalmente (uma dependência ausente não derruba o binário
//! inteiro).

use std::sync::Arc;

use axum::{
    Json, Router,
    extract::{Path as AxumPath, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

const PROCEDIMENTOS_VALIDOS: [&str; 5] = [
    "preenchimento-labial",
    "bioestimuladores-de-colageno",
    "toxina-botulinica-harmonizacao",
    "peelings",
    "protocolos-de-pele",
];

const AVISO_REGULATORIO: &str = "Ilustração / expectativa — não é uma previsão do seu resultado.";

/// Ponto de extensão para o provedor real — trocar de mock para produção é
/// implementar este trait numa struct nova, sem tocar nos handlers HTTP.
/// `async_trait` porque o trait precisa ser `dyn`-compatível (guardado como
/// `Arc<dyn ProvedorSimulacao>` no estado da aplicação).
#[async_trait::async_trait]
trait ProvedorSimulacao: Send + Sync {
    fn nome(&self) -> &'static str;
    async fn processar(&self, procedimento_slug: &str, captura_id: Option<Uuid>) -> anyhow::Result<Option<String>>;
}

/// Simula a latência assíncrona de um provedor real (a API paga também
/// seria uma chamada de rede demorada), mas não chama nada nem custa nada.
/// Não inventa uma URL de imagem externa — devolve `None` e deixa o status
/// "concluido" comunicar que o mock terminou.
struct ProvedorMock;

#[async_trait::async_trait]
impl ProvedorSimulacao for ProvedorMock {
    fn nome(&self) -> &'static str {
        "mock"
    }

    async fn processar(
        &self,
        _procedimento_slug: &str,
        _captura_id: Option<Uuid>,
    ) -> anyhow::Result<Option<String>> {
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        Ok(None)
    }
}

struct AppState {
    pool: PgPool,
    provedor: Arc<dyn ProvedorSimulacao>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NovaSimulacao {
    procedimento_slug: String,
    captura_id: Option<Uuid>,
}

#[derive(Debug, sqlx::FromRow)]
struct SimulacaoLinha {
    id: Uuid,
    procedimento_slug: String,
    captura_id: Option<Uuid>,
    status: String,
    provedor: String,
    resultado_url: Option<String>,
    criado_em: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RespostaSimulacao {
    id: Uuid,
    status: String,
    procedimento_slug: String,
    captura_id: Option<Uuid>,
    provedor: String,
    resultado_url: Option<String>,
    criado_em: chrono::DateTime<chrono::Utc>,
    aviso: &'static str,
}

impl From<SimulacaoLinha> for RespostaSimulacao {
    fn from(s: SimulacaoLinha) -> Self {
        Self {
            id: s.id,
            status: s.status,
            procedimento_slug: s.procedimento_slug,
            captura_id: s.captura_id,
            provedor: s.provedor,
            resultado_url: s.resultado_url,
            criado_em: s.criado_em,
            aviso: AVISO_REGULATORIO,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RespostaCriacao {
    id: Uuid,
    status: &'static str,
}

#[derive(Debug, Serialize)]
struct RespostaErro {
    erro: String,
}

fn erro_json(status: StatusCode, mensagem: impl Into<String>) -> Response {
    (status, Json(RespostaErro { erro: mensagem.into() })).into_response()
}

/// Tempo máximo para a tentativa inicial de conexão. Sem isso, uma
/// `DATABASE_URL` para um host que não responde (porta fechada atrás de
/// firewall, por exemplo — visto na prática: uma porta fechada no macOS
/// pode ficar ~2min em vez de recusar na hora) trava o `main()` inteiro
/// antes de servir a primeira requisição estática, o que anula o ponto de
/// Postgres ser "opcional".
const TIMEOUT_CONEXAO_INICIAL: std::time::Duration = std::time::Duration::from_secs(5);

/// Conecta ao Postgres e garante a tabela `simulacoes`. Retorna `None` (sem
/// panicar, e sem travar a inicialização por mais que `TIMEOUT_CONEXAO_INICIAL`)
/// se a conexão ou a migração falharem — quem chama decide o fallback (ver
/// `rotas`).
pub async fn conectar(database_url: &str) -> Option<PgPool> {
    let tentativa = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url);

    let pool = match tokio::time::timeout(TIMEOUT_CONEXAO_INICIAL, tentativa).await {
        Ok(Ok(pool)) => pool,
        Ok(Err(erro)) => {
            tracing::warn!(%erro, "não foi possível conectar ao Postgres — /api/simulacoes ficará indisponível (capturas e estático continuam normalmente)");
            return None;
        }
        Err(_) => {
            tracing::warn!(
                timeout_s = TIMEOUT_CONEXAO_INICIAL.as_secs(),
                "conexão ao Postgres excedeu o tempo limite — /api/simulacoes ficará indisponível (capturas e estático continuam normalmente)"
            );
            return None;
        }
    };

    if let Err(erro) = migrar(&pool).await {
        tracing::error!(%erro, "falha ao aplicar migração de simulacoes — /api/simulacoes ficará indisponível");
        return None;
    }

    Some(pool)
}

async fn migrar(pool: &PgPool) -> anyhow::Result<()> {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS simulacoes (
            id UUID PRIMARY KEY,
            procedimento_slug TEXT NOT NULL,
            captura_id UUID,
            status TEXT NOT NULL DEFAULT 'processando',
            provedor TEXT NOT NULL DEFAULT 'mock',
            resultado_url TEXT,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
        )"#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Monta o `Router` das rotas de simulação. Se `pool` for `None` (Postgres
/// indisponível na inicialização), monta rotas equivalentes que respondem
/// 503 — nunca deixa a rota simplesmente não existir (isso pareceria um 404
/// de "endpoint não existe" em vez de "está fora do ar agora").
pub fn rotas(pool: Option<PgPool>) -> Router {
    match pool {
        Some(pool) => {
            let estado = Arc::new(AppState {
                pool,
                provedor: Arc::new(ProvedorMock),
            });
            Router::new()
                .route("/api/simulacoes", post(criar))
                .route("/api/simulacoes/{id}", get(buscar))
                .with_state(estado)
        }
        None => Router::new()
            .route("/api/simulacoes", post(indisponivel))
            .route("/api/simulacoes/{id}", get(indisponivel)),
    }
}

async fn indisponivel() -> Response {
    erro_json(
        StatusCode::SERVICE_UNAVAILABLE,
        "recurso de simulação indisponível (banco de dados não conectado)",
    )
}

/// `POST /api/simulacoes` — valida o procedimento, grava status "processando"
/// e devolve 202 imediatamente; o processamento roda em background (o
/// provedor real também seria uma chamada de rede demorada, então o
/// esqueleto já modela o fluxo assíncrono desde já, mesmo com o mock).
async fn criar(State(estado): State<Arc<AppState>>, Json(nova): Json<NovaSimulacao>) -> Response {
    if !PROCEDIMENTOS_VALIDOS.contains(&nova.procedimento_slug.as_str()) {
        return erro_json(
            StatusCode::BAD_REQUEST,
            format!(
                "procedimentoSlug desconhecido — válidos: {}",
                PROCEDIMENTOS_VALIDOS.join(", ")
            ),
        );
    }

    let id = Uuid::new_v4();
    let provedor_nome = estado.provedor.nome();

    let inserido = sqlx::query(
        "INSERT INTO simulacoes (id, procedimento_slug, captura_id, status, provedor) \
         VALUES ($1, $2, $3, 'processando', $4)",
    )
    .bind(id)
    .bind(&nova.procedimento_slug)
    .bind(nova.captura_id)
    .bind(provedor_nome)
    .execute(&estado.pool)
    .await;

    if let Err(erro) = inserido {
        tracing::error!(%erro, "falha ao registrar simulação");
        return erro_json(
            StatusCode::INTERNAL_SERVER_ERROR,
            "não foi possível registrar a simulação agora",
        );
    }

    tracing::info!(simulacao_id = %id, procedimento = %nova.procedimento_slug, provedor = %provedor_nome, "simulação registrada, processando em background");

    let pool = estado.pool.clone();
    let provedor = Arc::clone(&estado.provedor);
    let slug = nova.procedimento_slug.clone();
    let captura_id = nova.captura_id;
    tokio::spawn(async move {
        let resultado = provedor.processar(&slug, captura_id).await;
        let (status, resultado_url): (&str, Option<String>) = match resultado {
            Ok(url) => ("concluido", url),
            Err(erro) => {
                tracing::error!(%erro, simulacao_id = %id, "falha no provedor de simulação");
                ("falhou", None)
            }
        };

        if let Err(erro) = sqlx::query("UPDATE simulacoes SET status = $1, resultado_url = $2 WHERE id = $3")
            .bind(status)
            .bind(resultado_url)
            .bind(id)
            .execute(&pool)
            .await
        {
            tracing::error!(%erro, simulacao_id = %id, "falha ao atualizar status da simulação");
        }
    });

    (
        StatusCode::ACCEPTED,
        Json(RespostaCriacao { id, status: "processando" }),
    )
        .into_response()
}

/// `GET /api/simulacoes/{id}` — devolve o estado atual (poll simples; sem
/// WebSocket/SSE nesta etapa, o front faz polling do status).
async fn buscar(State(estado): State<Arc<AppState>>, AxumPath(id): AxumPath<Uuid>) -> Response {
    let resultado = sqlx::query_as::<_, SimulacaoLinha>(
        "SELECT id, procedimento_slug, captura_id, status, provedor, resultado_url, criado_em \
         FROM simulacoes WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&estado.pool)
    .await;

    match resultado {
        Ok(Some(linha)) => Json(RespostaSimulacao::from(linha)).into_response(),
        Ok(None) => erro_json(StatusCode::NOT_FOUND, "simulação não encontrada"),
        Err(erro) => {
            tracing::error!(%erro, simulacao_id = %id, "falha ao buscar simulação");
            erro_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                "não foi possível buscar a simulação agora",
            )
        }
    }
}
