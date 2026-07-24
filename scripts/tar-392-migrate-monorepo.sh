#!/usr/bin/env bash
# tar-392 · Front 1 — migração para monorepo apps/site + apps/server
# ------------------------------------------------------------------
# NÃO RODAR até o sinal verde do coord. (dra-beatriz-s010):
#   1º Rafa commita o Redis  ·  2º Claude Design landa o visual  ·  3º green light
# Uso (da raiz do repo, branch wip/fundo-vivo):  bash scripts/tar-392-migrate-monorepo.sh
# Faz git mv (preserva histórico) + reescreve Dockerfile/compose/CI + workspaces
# + ajusta o path do dist no main.rs, e VERIFICA os builds no final.
set -euo pipefail

# --- guardas ------------------------------------------------------
[ -f astro.config.mjs ] && [ -d server ] || { echo "ERRO: rode da RAIZ do repo (antes do move)."; exit 1; }
BR="$(git rev-parse --abbrev-ref HEAD)"
[ "$BR" = "wip/fundo-vivo" ] || { echo "ERRO: branch atual '$BR' != wip/fundo-vivo."; exit 1; }
[ -d apps ] && { echo "ERRO: apps/ já existe — move parece já feito. Abortando."; exit 1; }
echo "==> Migração monorepo em '$(pwd)' (branch $BR)"

# --- 1) moves (git mv preserva histórico) -------------------------
mkdir -p apps
git mv server apps/server
mkdir -p apps/site
git mv package.json package-lock.json astro.config.mjs tsconfig.json src public apps/site/
git mv apps/server/Cargo.lock Cargo.lock   # lock passa a ser do workspace

# --- 2) Cargo workspace na raiz -----------------------------------
cat > Cargo.toml <<'EOF'
[workspace]
resolver = "2"
members = ["apps/server"]
EOF

# --- 3) package.json raiz (npm workspaces) ------------------------
cat > package.json <<'EOF'
{
  "name": "dra-beatriz-lima-monorepo",
  "private": true,
  "workspaces": ["apps/site"]
}
EOF

# --- 4) main.rs: dist path configurável por env -------------------
MAIN="apps/server/src/main.rs"
grep -q 'PathBuf::from("../dist")' "$MAIN" || { echo "AVISO: linha do dist mudou no main.rs — ajuste manual (ver plano)."; }
perl -0pi -e 's{Arc::new\(PathBuf::from\("\.\./dist"\)\)}{Arc::new(PathBuf::from(std::env::var("DIST_DIR").unwrap_or_else(|_| "../../dist".to_string())))}g' "$MAIN"

# --- 5) Dockerfile (context = raiz) -------------------------------
cat > Dockerfile <<'EOF'
# syntax=docker/dockerfile:1
# Build multi-stage: site Astro (apps/site) + servidor Rust (apps/server),
# numa única imagem. Context desta imagem é a RAIZ do monorepo.

# --- Stage 1: build do site Astro ---------------------------------
FROM node:22-slim AS astro-builder
WORKDIR /app
COPY apps/site/package.json apps/site/package-lock.json ./
RUN npm ci
COPY apps/site/astro.config.mjs apps/site/tsconfig.json ./
COPY apps/site/src ./src
COPY apps/site/public ./public
RUN npm run build

# --- Stage 2: build do servidor Rust (workspace) ------------------
FROM rust:1-slim-bookworm AS rust-builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock ./
COPY apps/server ./apps/server
RUN cargo build --release -p bl-design-system-server

# --- Stage 3: runtime ---------------------------------------------
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/server
ENV DIST_DIR=/app/dist
COPY --from=rust-builder /app/target/release/bl-design-system-server ./bl-design-system-server
COPY --from=astro-builder /app/dist /app/dist

ENV PORT=8080
EXPOSE 8080
CMD ["./bl-design-system-server"]
EOF

# --- 6) docker-compose.yml (só o path do volume muda) -------------
perl -0pi -e 's{/app/server/dados}{/app/apps/server/dados}g' docker-compose.yml

# --- 7) CI ---------------------------------------------------------
cat > .github/workflows/ci.yml <<'EOF'
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  site-astro:
    name: Site (Astro)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/site
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: apps/site/package-lock.json
      - run: npm ci
      - run: npx astro check
      - run: npm run build

  servidor-rust:
    name: Servidor (Rust)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: "."
      - run: cargo build --release -p bl-design-system-server
      - run: cargo test --release
EOF

echo "==> Moves e configs aplicados. Verificando builds..."

# --- 8) verificação ------------------------------------------------
( cd apps/site && npm ci && npx astro check && npm run build )
cargo build --release -p bl-design-system-server
echo "==> OK: Astro build + cargo build passaram."
echo "==> Confira 'git status', rode o binário e curl a home (valida DIST_DIR/../../dist), depois:"
echo "    git add -A && git commit -m 'refactor(monorepo): apps/site + apps/server (tar-392)'"
