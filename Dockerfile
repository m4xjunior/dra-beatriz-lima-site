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
