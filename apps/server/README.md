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

## Deploy via Docker (qualquer VPS com Docker) — caminho mais simples

`Dockerfile` e `docker-compose.yml` ficam na **raiz do projeto** (não aqui em
`server/`), porque o build empacota o site Astro + este servidor numa imagem
só. Dimensionado para a infra real do documento do projeto: 4 vCPU / 8 GB RAM,
sem GPU — só dois serviços leves (Postgres + este binário).

```bash
# na raiz do projeto
cp .env.example .env   # ajuste POSTGRES_PASSWORD antes de subir em produção
docker compose up -d --build
```

Isso sobe Postgres (com `pg_isready` como healthcheck) e o app (site estático
+ `/api/capturas` + `/api/simulacoes`) na porta `APP_PORT` (default `8080`).
Dados de captura e o banco Postgres persistem em volumes nomeados
(`postgres_dados`, `capturas_dados`) — sobrevivem a `docker compose down`
(sem `-v`) e a rebuilds da imagem. **Testado de verdade nesta máquina**:
build limpo, `POST/GET /api/simulacoes` e `POST /api/capturas` respondendo
certo, dado persistindo depois de `down`+`up` de novo.

Qual VPS/provedor hospeda isto continua sendo decisão do usuário (Hetzner,
Fly.io, Railway, um droplet qualquer com Docker) — este Dockerfile só torna
o "como" trivial, não decide o "onde".

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

## API de simulações (`/api/simulacoes`) — esqueleto Fase 1 MVP

Ver `specs/001-simulacao-mvp-skeleton.md` (raiz do projeto) para a spec
completa. Módulo `src/simulacoes.rs` — **plugável de propósito**: hoje só
existe `ProvedorMock` (sem custo, sem chamada de rede); trocar pelo provedor
pago real (Perfect Corp/YouCam ou outro, decisão do usuário ainda em aberto)
é implementar o trait `ProvedorSimulacao` numa struct nova, sem tocar nos
handlers HTTP.

- `POST /api/simulacoes` — `{procedimentoSlug, capturaId?}` → `202` com
  `{id, status:"processando"}`. Processa em background (o provedor real
  também seria uma chamada de rede assíncrona) e atualiza o status.
- `GET /api/simulacoes/{id}` — estado atual (`processando`/`concluido`/
  `falhou`), sempre com `aviso` regulatório no corpo. Front faz polling.

### Postgres — **opcional**, nunca derruba o servidor

- `DATABASE_URL`: string de conexão Postgres. Default (se ausente):
  `postgres://localhost/estetica_beatriz` — o banco de desenvolvimento local
  (Homebrew `postgresql@16`), já criado.
- Se a conexão falhar OU exceder 5s (timeout explícito — sem ele, um host
  que não responde pode travar a inicialização por ~2min no macOS em vez de
  recusar na hora), o servidor sobe normalmente mesmo assim: `/api/capturas`
  e os arquivos estáticos continuam funcionando; só `/api/simulacoes`
  responde `503` até o Postgres voltar (precisa reiniciar o processo para
  reconectar — não há retry automático nesta etapa).
- Tabela `simulacoes` é criada automaticamente (`CREATE TABLE IF NOT EXISTS`)
  na primeira conexão bem-sucedida — sem ferramenta de migração externa
  nesta etapa (protótipo).

## Variáveis de ambiente — visão geral

| Variável | Usada em | Default se ausente |
|---|---|---|
| `PORT` | `server/` (este binário) | `8080` |
| `DATABASE_URL` | `server/` (este binário) | `postgres://localhost/estetica_beatriz` |
| `RUST_LOG` | `server/` (este binário) | `info` |
| `PUBLIC_API_BASE_URL` | build do Astro (frontend) | `""` (mesma origem — só funciona quando o front e este servidor estão atrás do mesmo domínio; se o site estiver só no Cloudflare Pages, sem este backend por perto, configure a URL pública onde este servidor estiver rodando) |

Ver `.env.example` na raiz do projeto.
