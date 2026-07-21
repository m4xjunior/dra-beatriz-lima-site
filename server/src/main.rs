//! Servidor estático self-hosted para o build do Astro (`astro build` -> `../dist`).
//!
//! Sem dependência de Vercel/Netlify/Render: sobe um binário único (axum + tower-http)
//! que serve os arquivos gerados e comprime as respostas. Pensado para rodar atrás de
//! um reverse proxy / túnel (ex.: Cloudflare Tunnel) na mesma linha da infra do OTUS.

use std::{net::SocketAddr, path::PathBuf, sync::Arc};

use anyhow::Context;
use axum::{
    Router,
    extract::{Request, State},
    http::{StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
};
use tower_http::{
    compression::CompressionLayer, services::ServeDir, trace::TraceLayer,
};
use tracing_subscriber::EnvFilter;

const DEFAULT_PORT: u16 = 8080;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    // Caminho relativo à raiz do crate (server/), então ../dist aponta para
    // "Dra. Beatriz Lima — Design System/dist" independente do cwd de invocação
    // (o binário é tipicamente rodado via `cargo run`/systemd com working-dir = server/).
    let dist_dir = Arc::new(PathBuf::from("../dist"));

    if !dist_dir.is_dir() {
        tracing::warn!(
            dist = %dist_dir.display(),
            "pasta de build do Astro ainda não existe — servindo 404 até o build ser gerado"
        );
    }

    let serve_dir = ServeDir::new(dist_dir.as_ref().clone());

    let app = Router::new()
        .fallback_service(serve_dir)
        .layer(middleware::from_fn_with_state(
            Arc::clone(&dist_dir),
            not_found_fallback,
        ))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http());

    let port = read_port();
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .with_context(|| format!("falha ao abrir o listener TCP em {addr}"))?;

    tracing::info!(%addr, dist = %dist_dir.display(), "servidor estático no ar");

    axum::serve(listener, app)
        .await
        .context("erro fatal ao servir requisições HTTP")?;

    Ok(())
}

/// Intercepta respostas 404 do ServeDir e tenta servir `dist/404.html` (a página
/// 404.astro já compilada pelo build). Se o arquivo não existir, cai para um
/// 404 textual simples — nunca panica por causa de um build incompleto.
async fn not_found_fallback(
    State(dist_dir): State<Arc<PathBuf>>,
    request: Request,
    next: Next,
) -> Response {
    let response = next.run(request).await;

    if response.status() != StatusCode::NOT_FOUND {
        return response;
    }

    let custom_404 = dist_dir.join("404.html");
    match tokio::fs::read(&custom_404).await {
        Ok(bytes) => (
            StatusCode::NOT_FOUND,
            [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
            bytes,
        )
            .into_response(),
        Err(_) => (
            StatusCode::NOT_FOUND,
            [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
            "404 Not Found",
        )
            .into_response(),
    }
}

/// Lê PORT do ambiente sem panicar: ausente ou inválida cai no default (8080),
/// logando um aviso nesse segundo caso para não mascarar erro de config.
fn read_port() -> u16 {
    match std::env::var("PORT") {
        Ok(raw) => raw.parse::<u16>().unwrap_or_else(|_| {
            tracing::warn!(valor = %raw, "PORT inválida, usando default {DEFAULT_PORT}");
            DEFAULT_PORT
        }),
        Err(_) => DEFAULT_PORT,
    }
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();
}
