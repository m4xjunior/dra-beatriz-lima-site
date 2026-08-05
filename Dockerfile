# syntax=docker/dockerfile:1
# Build multi-stage: site Next.js (apps/web) + servidor Rust (apps/server),
# numa única imagem. Context desta imagem é a RAIZ do monorepo.
#
# Trocado de Astro para Next.js em 05/08/2026, junto com a remoção de
# apps/site. Duas diferenças que importam em relação ao stage anterior:
#
# 1. A saída é `out/` (next build com output:'export'), não `dist/`.
# 2. O CSS do design system vive na RAIZ (styles.css + tokens/), FORA de
#    apps/web, e é importado por app/globals.css com caminho relativo.
#    Por isso os dois são copiados para dentro da imagem — sem eles o
#    build falha na resolução do @import, e falha no build, que é onde
#    se quer falhar.

# --- Stage 1: build do site Next.js -------------------------------
FROM node:22-slim AS next-builder
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci
# Design system da raiz: o @import de app/globals.css sobe três níveis.
COPY styles.css /app/styles.css
COPY tokens /app/tokens
COPY apps/web/next.config.mjs apps/web/jsconfig.json ./
COPY apps/web/app ./app
COPY apps/web/components ./components
COPY apps/web/lib ./lib
COPY apps/web/dados ./dados
# next/font baixa as fontes no BUILD e auto-hospeda. Isto exige rede
# durante o build; sem ela o passo falha aqui, visivelmente, em vez de
# servir página sem a fonte da marca em produção.
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
ENV DIST_DIR=/app/site
COPY --from=rust-builder /app/target/release/bl-design-system-server ./bl-design-system-server
COPY --from=next-builder /app/apps/web/out /app/site

ENV PORT=8080
EXPOSE 8080
CMD ["./bl-design-system-server"]
