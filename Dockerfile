# syntax=docker/dockerfile:1
#
# Build multi-stage: site Astro (estático) + servidor Rust, empacotados
# numa única imagem final — deploy em qualquer VPS vira `docker compose up`,
# sem precisar de Node/Rust instalados no host. Context desta imagem é a
# RAIZ do projeto (não server/), porque o stage do Astro precisa de src/,
# public/, package.json etc. da raiz.

# --- Stage 1: build do site Astro (estático) ---------------------------
FROM node:22-slim AS astro-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY astro.config.mjs tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# --- Stage 2: build do servidor Rust (release, otimizado) ---------------
FROM rust:1-slim-bookworm AS rust-builder
WORKDIR /app/server
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*
COPY server/Cargo.toml server/Cargo.lock ./
COPY server/src ./src
RUN cargo build --release

# --- Stage 3: runtime — só os binários/arquivos finais, sem toolchain ---
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY --from=rust-builder /app/server/target/release/bl-design-system-server ./bl-design-system-server
COPY --from=astro-builder /app/dist /app/dist

ENV PORT=8080
EXPOSE 8080
CMD ["./bl-design-system-server"]
