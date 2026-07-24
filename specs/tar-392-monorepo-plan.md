# tar-392 · Front 1 — Formalização do Monorepo (`apps/site` + `apps/server`)

> **Status:** PLANO PRONTO — **NÃO EXECUTAR ainda.**
> Ordem acordada (coord. `dra-beatriz-s010`): 1º Rafa commita o **cache Redis** em `server/`; 2º Claude Design landa a **refatoração visual**; 3º `s010` dá **sinal verde** → então executo o move de uma vez (`scripts/tar-392-migrate-monorepo.sh`).
> Owner do front 1 (monorepo): `lexusfx-s005`. Branch: `wip/fundo-vivo`.

## Objetivo

Passar da estrutura atual (Astro na raiz + `server/` Rust) para um monorepo explícito, **sem quebrar** o build Astro nem o CI, mantendo um único deploy Docker.

## Estrutura alvo

```
Dra. Beatriz Lima — Design System/
├── Cargo.toml                # NOVO — Cargo workspace: members = ["apps/server"]
├── Cargo.lock                # movido de server/Cargo.lock (lock do workspace)
├── package.json              # NOVO (raiz) — npm workspaces: ["apps/site"] (private)
├── docker-compose.yml        # paths ajustados
├── Dockerfile                # paths ajustados (context continua a RAIZ)
├── .github/workflows/ci.yml  # working-directory ajustado
├── apps/
│   ├── site/                 # App Astro
│   │   ├── package.json      # (era a raiz)
│   │   ├── package-lock.json
│   │   ├── astro.config.mjs
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   └── public/
│   └── server/               # Crate Rust axum (era server/)
│       ├── Cargo.toml
│       ├── src/
│       └── dados/
└── (design-system source, FICA na raiz)  # tokens/ tokens.json styles.css guidelines/
                                          # motion/ templates/ deck/ specs/ _ds_* etc.
```

**Racional dos limites:** confirmado por recon — o `src/` do Astro **não importa** nenhum arquivo da raiz, e `motion/ styles.css tokens/ guidelines/ deck/ templates/` **não são servidos** (public/ só tem `design-system/ favicon* imagens/`; `dist/` confirma). São **fonte do design-system**, não fazem parte do build do site → permanecem na raiz. (Podem virar `packages/design-system/` num passo futuro; fora do escopo desta tarefa.)

## Mapa de moves (via `git mv`, preserva histórico)

| De (raiz) | Para |
|---|---|
| `server/` | `apps/server/` |
| `package.json`, `package-lock.json` | `apps/site/` |
| `astro.config.mjs`, `tsconfig.json` | `apps/site/` |
| `src/`, `public/` | `apps/site/` |
| `apps/server/Cargo.lock` | `Cargo.lock` (raiz do workspace) |

Fica na raiz: `tokens/ tokens.json styles.css guidelines/ motion/ templates/ deck/ specs/ readme.md _ds_*.js/json _adherence.oxlintrc.json thumbnail.html Deck do Design System.pdf .github/ .gitignore .env.example Dockerfile docker-compose.yml`.

## Mudanças de configuração (mesmo commit do move)

### 1. `Cargo.toml` (raiz — NOVO)
```toml
[workspace]
resolver = "2"
members = ["apps/server"]
```

### 2. Sem npm workspace na raiz
`apps/site` fica **standalone** (seu próprio `package.json` + `package-lock.json`). Docker e CI rodam `npm ci` dentro de `apps/site`. Um `package.json` raiz com `"workspaces"` faria o `npm ci` no filho exigir o lockfile na raiz → erro `EUSAGE`. (Cargo workspace na raiz continua — só o npm que fica por app.)

### 3. `apps/server/src/main.rs` — path do `dist` (OBRIGATÓRIO)
Hoje: `let dist_dir = Arc::new(PathBuf::from("../dist"));` (relativo à raiz do crate `server/`).
Após o move o crate vira `apps/server/`, então `../dist` apontaria `apps/dist` (errado → site 404).
**Fix (env-configurável, segue regra Rust: sem hardcode de path de deploy):**
```rust
let dist_dir = Arc::new(PathBuf::from(
    std::env::var("DIST_DIR").unwrap_or_else(|_| "../site/dist".to_string()),
));
```
- Dev/local (rodando de `apps/server/`): `../site/dist` → raiz/`dist` ✓
- Docker: define `DIST_DIR=/app/dist` (absoluto) no runtime ✓

### 4. `Dockerfile` (context continua a RAIZ)
- Stage Astro: `COPY apps/site/package.json apps/site/package-lock.json ./` → `npm ci` → `COPY apps/site/astro.config.mjs apps/site/tsconfig.json ./` → `COPY apps/site/src ./src` → `COPY apps/site/public ./public` → `npm run build`.
- Stage Rust (workspace): `WORKDIR /app` → `COPY Cargo.toml Cargo.lock ./` → `COPY apps/server ./apps/server` → `cargo build --release -p bl-design-system-server`. Binário em `/app/target/release/bl-design-system-server`.
- Runtime: `WORKDIR /app/apps/server`, `ENV DIST_DIR=/app/dist`, copia binário + `COPY --from=astro-builder /app/dist /app/dist`. `dados/` fica em `/app/apps/server/dados`.

### 5. `docker-compose.yml`
- Volume `capturas_dados:/app/server/dados` → `capturas_dados:/app/apps/server/dados`.
- (Quando o Redis do Rafa entrar, ele adiciona o serviço `redis` + `REDIS_URL` aqui — front 2, não é meu.)

### 6. `.github/workflows/ci.yml`
- Job `site-astro`: `defaults.run.working-directory: apps/site` (npm ci / astro check / build).
- Job `servidor-rust`: `working-directory: apps/server` → **remover** e rodar da raiz (`cargo build/test --release` do workspace); `Swatinem/rust-cache` `workspaces: .`.

## Verificação pós-move (o script roda e falha se quebrar)
1. `cd apps/site && npm ci && npx astro check && npm run build` → `dist/` gerado igual ao atual.
2. `cargo build --release -p bl-design-system-server` (da raiz) → compila.
3. Rodar o binário local e `curl` a home → 200 servindo `dist/` (valida o `DIST_DIR`/`../site/dist`).
4. `dados/capturas` gravável a partir de `apps/server/`.

## Riscos / notas
- **`main.rs` (dist path)** é a única mudança de CÓDIGO — feita no commit do move, DEPOIS do Redis do Rafa já estar em `main.rs`/`cache.rs` (evita conflito). Se o Rafa tocar as linhas do `dist_dir`, reconcilio na hora do move.
- `Cargo.lock` → raiz; rodar `cargo build` regenera coerente com o workspace.
- Nada de `styles.css`/`tokens` no move (não são do build) — se no futuro o site passar a consumi-los, aí sim entram em `apps/site/` ou viram package.
- Commit único e atômico (move + configs + main.rs), mensagem `refactor(monorepo): apps/site + apps/server (tar-392)`.
