# Servidor estático — Dra. Beatriz Lima Design System

Servidor mínimo em Rust (axum + tower-http) para servir em produção o build
estático gerado por `astro build` (pasta `../dist`), self-hosted — sem
Vercel/Netlify/Render.

## Build

```bash
cargo build --release
```

Binário final em `target/release/bl-design-system-server`.

## Rodar

```bash
# a partir da pasta server/ (o path relativo ../dist depende do cwd)
PORT=8080 ./target/release/bl-design-system-server
```

- `PORT`: porta de escuta. Default `8080` se ausente ou inválida (loga um aviso
  nesse segundo caso, nunca panica).
- `RUST_LOG`: nível de log via `tracing` (ex.: `RUST_LOG=debug`). Default `info`.

O servidor escuta em `0.0.0.0:<PORT>`.

## Comportamento

- Serve os arquivos estáticos de `../dist` via `tower_http::services::ServeDir`.
- Respostas comprimidas automaticamente (`gzip`/`br`/`deflate`/`zstd`) via
  `CompressionLayer`, conforme o `Accept-Encoding` do cliente.
- Rotas não encontradas: serve `dist/404.html` (a página `404.astro` já
  compilada pelo `astro build`) se existir; caso contrário, cai para um 404
  textual simples. Nunca falha em tempo de compilação — só em runtime, e de
  forma graciosa, se `dist/` ainda não existir (útil quando o build do Astro
  roda em paralelo, em outra sessão/agente).
- Logs estruturados via `tracing` (sem `println!`).

## Deploy self-hosted (ex.: OTUS)

1. `astro build` na raiz do projeto (gera `../dist` relativo a este `server/`).
2. `cargo build --release` aqui.
3. Rodar o binário via `systemd`/`pm2`/`tmux` com `PORT` fixo, atrás de um
   reverse proxy (Nginx/Apache) ou túnel (Cloudflare Tunnel) apontando para
   `127.0.0.1:<PORT>`.
4. Working directory do processo deve ser esta pasta (`server/`), já que o
   caminho do build é resolvido como `../dist`.
