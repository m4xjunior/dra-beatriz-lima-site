# Spec 002 — Status da Fase 1 MVP (checkpoint)

> Fragmento spec-driven de acompanhamento, não de planejamento — registra o
> que já existe, o que foi testado de verdade, e o que trava em decisão de
> negócio (não técnica) antes de continuar. Ver `001-simulacao-mvp-skeleton.md`
> para o contrato original.

## O que existe e foi testado de ponta a ponta

| Peça | Onde | Testado como |
|---|---|---|
| Site Astro (landing, catálogo de 5 procedimentos, páginas individuais) | `src/pages/` | `astro build` limpo, screenshots desktop/mobile |
| Mesh facial 3D ao vivo (MediaPipe FaceLandmarker, client-side) | `src/components/FaceViewer3D.astro` + `face-viewer-3d-camera.ts` | Câmera real do usuário (confirmado por ele) + câmera fake via Playwright |
| Salvar/rever/apagar captura (só pontos, nunca imagem) | `server/src/capturas.rs` + `src/pages/simulacao-3d/ver.astro` | POST/GET/DELETE via curl e via browser real (Playwright, imagem de rosto real) |
| Esqueleto de simulação (`ProvedorMock`) | `server/src/simulacoes.rs` + `src/pages/simulacoes/testar.astro` | POST/GET via curl e via browser real; transição `processando`→`concluido` |
| Captura amarrada à simulação (`capturaId`) | `src/pages/simulacao-3d/ver.astro` | Fluxo completo via Playwright: câmera→salvar→escolher procedimento→simular→status |
| Resiliência (Postgres fora do ar não derruba o resto) | `server/src/simulacoes.rs::conectar` | Testado matando a porta do banco — timeout de 5s, 503 no `/api/simulacoes`, `/api/capturas` e estático continuam |
| Site público estático | Cloudflare Pages | `curl` de conteúdo (não só status) confirmando `/`, `/procedimentos`, `/simulacao-3d` |
| Repositório | GitHub `m4xjunior/dra-beatriz-lima-site` (público) | `git log`/`gh repo view` confirmando push e visibilidade |

## O que está rodando agora, localmente

- Binário `server/target/release/bl-design-system-server` em background, porta
  8080, conectado a `postgres://localhost/estetica_beatriz` (Postgres 16 via
  Homebrew). Serve estático + `/api/capturas` + `/api/simulacoes` juntos —
  esta é a topologia onde as duas APIs funcionam de verdade hoje.
- Cloudflare Pages serve só os arquivos estáticos — `/api/*` responde 404 lá
  (esperado, documentado, com fallback gracioso no frontend).

## O que trava numa decisão de negócio, não técnica

- **Provedor de simulação real** (Perfect Corp, YouCam, outro) — sem isso,
  `ProvedorMock` continua sendo a única implementação, e nenhum resultado
  visual de simulação existe de verdade (só o fluxo assíncrono, sem imagem).
- **Em qual VPS/provedor publicar o backend** — o "como" já está resolvido
  (`Dockerfile` + `docker-compose.yml` na raiz, testado de verdade: build
  limpo, API respondendo dentro do container, dado persistindo em volume
  depois de `down`+`up`). Falta só decidir o host (Hetzner, Fly.io, Railway,
  um droplet qualquer com Docker) — sem isso, o site publicado no Cloudflare
  Pages continua com `/api/*` em 404 pra visitantes reais.

## O que é Fase 0/2/3 do documento do projeto, deliberadamente fora desta sessão

- Fase 0 (jurídico: TCLE formal, RIPD, validação de escopo regulatório) —
  exige assessoria jurídica real, não é trabalho de engenharia.
- Fase 2 (app nativo iOS/ARKit, FLAME 2023 Open, reconstrução 3D fiel) —
  meses de trabalho, dependente da Fase 0.
- Fase 3 (ERP interno GPUI, CFTV, pagamentos Asaas, NFS-e) — sistemas
  internos da clínica física, não fazem parte do funil público construído
  até aqui.
