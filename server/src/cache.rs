//! Cache de resposta HTTP em Redis, para as rotas `/api/*` (GET). Escopo: tar-392 fase 1
//! (ver coordenação com dra-beatriz-s010 — fase 2, monorepo, fica pra depois).
//!
//! DEGRADAÇÃO GRACIOSA (mesmo critério de `simulacoes::conectar`): sem `REDIS_URL` no
//! ambiente, o cache fica DESABILITADO — o servidor nunca deixa de subir nem de responder
//! por causa do Redis. Erros de comando/conexão em runtime também nunca derrubam a
//! requisição: um cache miss "silencioso" é sempre preferível a um 500.
//!
//! INVALIDAÇÃO: só por TTL (`CACHE_TTL_SEGUNDOS`, default abaixo) — sem invalidação ativa.
//! Como as rotas cacheadas hoje (`/api/simulacoes/{id}`, `/api/capturas/{id}`) são de
//! status/consulta, um TTL curto é aceitável: o pior caso é servir um estado com poucos
//! segundos de atraso, nunca dados de outra rota/query (a chave inclui a query ordenada).

use std::sync::Arc;

use axum::{
    body::{Body, to_bytes},
    extract::{Request, State},
    http::{HeaderValue, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use deadpool_redis::{Config as RedisConfig, Pool, Runtime, redis::AsyncCommands};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// TTL default quando `CACHE_TTL_SEGUNDOS` não está definida ou é inválida.
const TTL_SEGUNDOS_DEFAULT: u64 = 30;

/// Tamanho máximo de corpo que vale a pena CACHEAR — respostas maiores só desperdiçam
/// memória do Redis para um caso de uso que hoje é status JSON pequeno. NÃO é um limite de
/// leitura: uma resposta maior que isso ainda é servida ao cliente por inteiro, só não é
/// gravada no Redis (ver `guardar_se_cacheavel`).
const TAMANHO_MAXIMO_CACHEAVEL: usize = 256 * 1024;

/// Teto absoluto de leitura do corpo em memória — proteção contra um handler futuro que
/// devolva algo gigantesco sem querer (streaming de arquivo, por exemplo) travar o processo.
/// Bem acima de qualquer resposta real da API hoje (status JSON pequeno); se isso disparar,
/// é sinal de bug em outro lugar (uma rota que não devia estar sob este middleware).
const LIMITE_ABSOLUTO_LEITURA: usize = 16 * 1024 * 1024;

#[derive(Debug, thiserror::Error)]
enum ErroCache {
    #[error("falha ao obter conexão do pool Redis: {0}")]
    Conexao(#[from] deadpool_redis::PoolError),
    #[error("falha ao executar comando Redis: {0}")]
    Comando(#[from] deadpool_redis::redis::RedisError),
    #[error("falha ao (des)serializar entrada de cache: {0}")]
    Serializacao(#[from] serde_json::Error),
}

/// Estado do cache — clonável (o pool do deadpool já é `Arc` por dentro) para uso em
/// `axum::middleware::from_fn_with_state`.
#[derive(Clone)]
pub struct CacheRedis {
    pool: Option<Pool>,
    ttl_segundos: u64,
}

impl CacheRedis {
    /// Lê `REDIS_URL`/`CACHE_TTL_SEGUNDOS` do ambiente. Sem `REDIS_URL` (ausente ou vazia),
    /// devolve um cache DESABILITADO — nunca falha, nunca bloqueia o arranque do servidor.
    pub fn desde_entorno() -> Self {
        let ttl_segundos = std::env::var("CACHE_TTL_SEGUNDOS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .filter(|&v| v > 0)
            .unwrap_or(TTL_SEGUNDOS_DEFAULT);

        let Some(redis_url) = std::env::var("REDIS_URL").ok().filter(|v| !v.is_empty()) else {
            tracing::info!("REDIS_URL ausente — cache de resposta desabilitado");
            return Self { pool: None, ttl_segundos };
        };

        let pool = match RedisConfig::from_url(redis_url).create_pool(Some(Runtime::Tokio1)) {
            Ok(pool) => Some(pool),
            Err(erro) => {
                tracing::warn!(%erro, "não foi possível criar o pool Redis — cache de resposta desabilitado");
                None
            }
        };

        Self { pool, ttl_segundos }
    }
}

/// Entrada serializada no Redis — guarda o suficiente para reconstruir a `Response` original.
#[derive(Debug, Serialize, Deserialize)]
struct EntradaCache {
    status: u16,
    content_type: Option<String>,
    corpo: Vec<u8>,
}

/// Chave de cache: hash sha256 de método (sempre GET aqui) + path + query com parâmetros
/// ORDENADOS — `?b=2&a=1` e `?a=1&b=2` têm de bater na mesma chave. O hash evita chaves
/// gigantes/com caracteres especiais no Redis quando a query é grande; `cache:v1:` prefixa
/// e versiona o formato (mudar o formato da entrada = trocar o prefixo, nunca reaproveitar
/// chaves de um formato antigo).
fn chave_cache(req: &Request) -> String {
    let path = req.uri().path();
    let mut pares: Vec<(String, String)> = req
        .uri()
        .query()
        .map(|q| url::form_urlencoded::parse(q.as_bytes()).into_owned().collect())
        .unwrap_or_default();
    pares.sort();
    let query_ordenada =
        pares.into_iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join("&");
    let canonico = format!("GET:{path}?{query_ordenada}");
    let hash = Sha256::digest(canonico.as_bytes());
    let hash_hex = hash.iter().map(|b| format!("{b:02x}")).collect::<String>();
    format!("cache:v1:{hash_hex}")
}

/// Middleware de cache — aplicar só nas sub-rotas `/api/*` que fazem sentido cachear
/// (GET, idempotentes). Requisições não-GET passam direto, nunca são cacheadas.
///
/// Roda hoje só dentro de `router_api` (ver `main.rs`), então o `starts_with("/api/")`
/// abaixo é redundante NA PRÁTICA — mas fica como defense-in-depth: se algum dia este
/// middleware for movido/reaproveitado num router mais amplo por engano, ele continua
/// só afetando `/api/*`, nunca o estático do Astro.
///
/// ORDEM COM COMPRESSÃO: este middleware fica DENTRO de `router_api`, que é mesclado em
/// `app` ANTES do `.layer(CompressionLayer::new())` (aplicado no `app` já mesclado, em
/// `main.rs`). Layers aplicados por último envolvem os anteriores por fora — na resposta,
/// o corpo passa por este middleware (que lê/cacheia) ANTES de chegar à compressão. Ou
/// seja, o que fica gravado no Redis é sempre o corpo NÃO-comprimido — se um dia a ordem
/// em `main.rs` mudar (CompressionLayer entrar dentro de `router_api`), isso quebra essa
/// premissa e precisa ser revisto aqui também.
pub async fn camada_cache(
    State(cache): State<Arc<CacheRedis>>,
    req: Request,
    next: Next,
) -> Response {
    if !req.uri().path().starts_with("/api/") {
        return next.run(req).await;
    }
    let Some(pool) = &cache.pool else {
        return next.run(req).await;
    };
    if req.method() != axum::http::Method::GET {
        return next.run(req).await;
    }

    let chave = chave_cache(&req);

    match buscar(pool, &chave).await {
        Ok(Some(entrada)) => {
            return reconstruir_resposta(entrada);
        }
        Ok(None) => {}
        Err(erro) => {
            tracing::warn!(%erro, chave = %chave, "falha ao consultar o cache — seguindo sem cache (miss)");
        }
    }

    let resposta = next.run(req).await;
    guardar_se_cacheavel(pool.clone(), chave, resposta, cache.ttl_segundos).await
}

async fn buscar(pool: &Pool, chave: &str) -> Result<Option<EntradaCache>, ErroCache> {
    let mut conexao = pool.get().await?;
    let bruto: Option<Vec<u8>> = conexao.get(chave).await?;
    match bruto {
        Some(bytes) => Ok(Some(serde_json::from_slice(&bytes)?)),
        None => Ok(None),
    }
}

fn reconstruir_resposta(entrada: EntradaCache) -> Response {
    let status = StatusCode::from_u16(entrada.status).unwrap_or(StatusCode::OK);
    let mut resposta = (status, entrada.corpo).into_response();
    if let Some(ct) = entrada.content_type
        && let Ok(valor) = HeaderValue::from_str(&ct)
    {
        resposta.headers_mut().insert(header::CONTENT_TYPE, valor);
    }
    resposta.headers_mut().insert("x-cache", HeaderValue::from_static("HIT"));
    resposta
}

/// Lê o corpo INTEIRO (até `LIMITE_ABSOLUTO_LEITURA`, bem acima de qualquer resposta real)
/// e só então decide se ele é pequeno o bastante para valer a pena cachear
/// (`TAMANHO_MAXIMO_CACHEAVEL`). As duas coisas são propositalmente separadas: "não cabe no
/// cache" NUNCA pode significar "não chega ao cliente" — bug real da primeira versão deste
/// módulo, corrigido após revisão do s002/s010 (ver histórico do commit).
async fn guardar_se_cacheavel(
    pool: Pool,
    chave: String,
    resposta: Response,
    ttl_segundos: u64,
) -> Response {
    let status = resposta.status();
    let content_type = resposta
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);
    let (partes, corpo) = resposta.into_parts();

    let bytes = match to_bytes(corpo, LIMITE_ABSOLUTO_LEITURA).await {
        Ok(bytes) => bytes,
        Err(erro) => {
            // Corpo maior que `LIMITE_ABSOLUTO_LEITURA` (16MB) — não dá pra bufferizar em
            // memória nem pra cachear nem pra reenviar íntegro por este caminho. Isso indica
            // uma rota que não devia estar sob este middleware, não um caso normal da API.
            tracing::error!(%erro, chave = %chave, "corpo da resposta excede o teto absoluto de leitura — não é possível servir por este caminho");
            return (StatusCode::INTERNAL_SERVER_ERROR, "erro interno ao processar resposta").into_response();
        }
    };

    if status.is_success() {
        if bytes.len() <= TAMANHO_MAXIMO_CACHEAVEL {
            let entrada = EntradaCache { status: status.as_u16(), content_type, corpo: bytes.to_vec() };
            // Guarda em background: quem pediu a página não deve esperar o round-trip do
            // Redis para receber a resposta que já está pronta em `bytes`.
            tokio::spawn(async move {
                if let Err(erro) = escrever(&pool, &chave, &entrada, ttl_segundos).await {
                    tracing::warn!(%erro, chave = %chave, "falha ao gravar no cache — resposta já foi servida normalmente");
                }
            });
        } else {
            tracing::debug!(chave = %chave, tamanho = bytes.len(), "resposta maior que o limite cacheável — servindo íntegra, sem cachear");
        }
    }

    Response::from_parts(partes, Body::from(bytes))
}

async fn escrever(
    pool: &Pool,
    chave: &str,
    entrada: &EntradaCache,
    ttl_segundos: u64,
) -> Result<(), ErroCache> {
    let bytes = serde_json::to_vec(entrada)?;
    let mut conexao = pool.get().await?;
    let _: () = conexao.set_ex(chave, bytes, ttl_segundos).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request as HttpRequest;

    #[test]
    fn chave_cache_ordena_query_params() {
        let r1 = HttpRequest::builder().uri("/api/simulacoes/x?b=2&a=1").body(Body::empty()).unwrap();
        let r2 = HttpRequest::builder().uri("/api/simulacoes/x?a=1&b=2").body(Body::empty()).unwrap();
        assert_eq!(chave_cache(&r1), chave_cache(&r2));
    }

    #[test]
    fn chave_cache_diferencia_paths_diferentes() {
        let r1 = HttpRequest::builder().uri("/api/simulacoes/x").body(Body::empty()).unwrap();
        let r2 = HttpRequest::builder().uri("/api/simulacoes/y").body(Body::empty()).unwrap();
        assert_ne!(chave_cache(&r1), chave_cache(&r2));
    }

    /// Regressão do bug real (revisão s002/s010): uma resposta MAIOR que
    /// `TAMANHO_MAXIMO_CACHEAVEL` tem de chegar ÍNTEGRA ao cliente — só não é cacheada.
    /// A versão original devolvia `Body::empty()` nesse caso, descartando o corpo.
    #[tokio::test]
    async fn guardar_se_cacheavel_nunca_descarta_corpo_grande_demais_pra_cachear() {
        let corpo_grande = vec![b'x'; TAMANHO_MAXIMO_CACHEAVEL + 1024];
        let resposta = (StatusCode::OK, corpo_grande.clone()).into_response();

        // URL bem-formada mas nunca discada nesse caminho (corpo grande demais pula
        // qualquer chamada ao pool) — só precisa type-check, `deadpool` não conecta
        // até o primeiro `.get()`.
        let pool = RedisConfig::from_url("redis://127.0.0.1:1/")
            .create_pool(Some(Runtime::Tokio1))
            .expect("config de pool bem-formada não deveria falhar ao construir");

        let resultado = guardar_se_cacheavel(pool, "cache:v1:teste".into(), resposta, 30).await;

        assert_eq!(resultado.status(), StatusCode::OK);
        let bytes = to_bytes(resultado.into_body(), usize::MAX).await.unwrap();
        assert_eq!(bytes.as_ref(), corpo_grande.as_slice());
    }

    #[test]
    fn desde_entorno_desabilita_sem_redis_url() {
        // SAFETY: teste single-threaded de leitura de env var isolada (nenhum outro teste
        // deste módulo toca REDIS_URL); `std::env::set_var`/`remove_var` são `unsafe` desde
        // a edition 2024 por causa de mutação global compartilhada entre threads.
        unsafe {
            std::env::remove_var("REDIS_URL");
        }
        let cache = CacheRedis::desde_entorno();
        assert!(cache.pool.is_none());
    }
}
