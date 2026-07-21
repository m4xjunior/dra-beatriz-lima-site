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

## API de capturas 3D (`/api/capturas`)

Endpoints novos (módulo `src/capturas.rs`), mesclados no mesmo `Router` que
serve o build estático — mesma porta, mesmo processo. Guardam **só os pontos
numéricos** do mesh (landmarks x,y,z do MediaPipe, normalizados), **nunca**
foto/frame de vídeo — é isso que torna o dado não-identificável como imagem.

- `POST /api/capturas` — recebe `{versaoEsquema, variante, fpsAlvo,
  pontosPorQuadro, quadros}` (JSON, até 4 MiB), valida o conteúdo, gera um
  `capturaId` (UUID v4) e grava em `dados/capturas/{capturaId}.json`. Devolve
  `201` com `{capturaId, criadoEmUnixMs, totalQuadros}` (resposta trimada de
  propósito — o cliente já tem os quadros em memória).
- `GET /api/capturas/{id}` — devolve o JSON completo salvo (`200`) ou
  `{"erro": "captura não encontrada"}` (`404`) se o id não existir/já foi
  apagado.
- `DELETE /api/capturas/{id}` — apaga o arquivo (`204`) ou `404` se não
  existir.

Validações do POST (400 se qualquer uma falhar): `versaoEsquema == 1`;
`variante` é `"hero"` ou `"inline"`; `quadros.len()` entre 20 e 60; `pontosPorQuadro`
entre 400 e 500; todo quadro tem `pontosPorQuadro * 3` números; todo número é
finito e está em `[-10.0, 10.0]`.

### Onde os dados ficam

`server/dados/capturas/*.json` — um arquivo por captura, nome = `capturaId`.
Pasta **ignorada no git** (`server/.gitignore` tem `/dados/`) porque contém
coordenadas derivadas de rosto real de visitantes (dado pessoal sob a LGPD,
mesmo não sendo imagem) — **nunca deve ser commitada**.

### CORS e limite de corpo

- `tower_http::cors::CorsLayer::permissive()` aplicado a todo o app (wildcard
  `*`, qualquer método/header) — sem auth nesta etapa, protótipo de usuário
  único.
- `DefaultBodyLimit::max(4 MiB)` em todas as rotas (o default do axum é 2 MiB,
  perto demais do pior caso do payload de captura).

### Dívida técnica documentada (aceita para o protótipo)

Sem autenticação: qualquer um que descubra um `capturaId` (UUID v4, 122 bits
aleatórios) pode ler ou apagar aquela captura via API, de qualquer origem
(CORS permissivo). Aceitável para dado numérico não-identificável como
imagem num protótipo; se a feature avançar para produção, introduzir um
token de posse por sessão.
