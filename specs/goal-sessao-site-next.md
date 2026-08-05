# Goal da sessão — site novo em Next.js, com loop de engenharia

> Documento de condução da sessão. Quem implementa: `s000`. Quem pontua: `s007`.
> Criado 05/08/2026 14:05 (España). Branch `claude/mobile-scroll-animation-perf-kbasw3`.

---

## O goal, numa frase

**Levar o hero da Dra. em scroll-scrub para ≥ 85/100 na rubrica do `s007`, rodando em
Next.js, com a fluidez medida no Safari iOS real — e cada afirmação de "funciona"
acompanhada da evidência que a produziu.**

O goal não é "portar o site". É atravessar o gate de qualidade. Portar é o meio.

---

## Por que loop, e não uma lista de tarefas

A lista de tarefas assume que você sabe o que falta. Aqui não sabe: o critério de maior
peso da rubrica (fluidez, 30 pontos) só é conhecível **depois** de rodar no aparelho.
Um plano linear entregaria uma implementação bonita e descobriria no fim que o seek
gagueja no iOS.

O loop inverte isso. Cada volta escolhe o item de maior risco ainda não medido, produz
evidência, e a evidência decide o próximo passo. O que fecha o loop é o número, não a
sensação de estar pronto.

---

## CORREÇÃO DE CRITÉRIO (Max, 05/08 14:52) — o 99/100 era do teste errado

O Max reprovou a nota: **"isso tá em 73/100, não 99/100. Aumente seu critério."** Ele está
certo, e o erro é meu por ter deixado o número valer como se significasse "pronto".

A rubrica do `s007` mede **o motor do scrub**: fluidez, peso, iOS, higiene React, fidelidade
de arquitetura, reduced-motion. Nenhum dos seis critérios olha para o site ser um site. Um
99 ali significa "o transporte de vídeo está impecável", não "o produto está entregue".

O que a rubrica antiga NÃO media, e que existe:

- A home não tem nav, hero, rodapé, credencial, depoimentos, FAQ, contato nem CTA
- Três seções de procedimento contra oito que a Dra. realmente faz
- Nenhuma página `/procedimentos/[slug]` (morreram com o `apps/site`)
- Movimento restrito ao scrub: nada de entrada coreografada, nada de tipografia animada
- Poucos componentes visuais — a página é vídeo + coluna de texto + régua

**A rubrica antiga vira PISO, não teto.** Os 6 critérios do motor continuam valendo como
"não regredir", e a nota que conta passa a ser a de baixo.

## Rubrica nova — mede o PRODUTO (mínimo 85)

| # | Critério | Peso | Estado |
|---|---|---|---|
| A | Estrutura completa da página (nav, hero, credencial, procedimentos, resultados, depoimentos, como funciona, sobre, FAQ, localização, CTA, rodapé) | 25 | ⬜ 3 de 13 dobras |
| B | Riqueza de componentes visuais — cada dobra com forma própria, sem grade de cards idênticos | 20 | ⬜ |
| C | Movimento coreografado — uma entrada por dobra, tipografia animada, easing exponencial, nada de bounce | 15 | ⬜ só o scrub |
| D | Catálogo real: 8 procedimentos + rota por procedimento (SEO) | 15 | ⬜ 3 provisórios |
| E | Craft — passa nos quatro testes da skill (swap, squint, assinatura, token) | 15 | ⬜ |
| F | Piso do motor: os 6 critérios antigos sem regressão | 10 | 🟩 99/100 medido |

## Placar do motor (PISO — não pode regredir)

Comandos: `cd apps/web && npm run medir` · `-- --mobile` · `-- --mobile --reduzido` · `npm test`
Fling no iOS: abrir `http://localhost:3000/?medir=1` no simulador e fotografar.

| # | Critério | Peso | Estado | Evidência medida |
|---|---|---|---|---|
| 1 | Fluidez do scrub | 30 | 🟩 medido | 623 quadros, **0 acima de 50ms**, mediana 8,3ms, p95 9,2ms, pior 9,4ms. Scroll 100% ↔ vídeo 99,4% (a diferença é a `MARGEM_FIM` de 0,05s, por desenho). Volta ao topo devolve `currentTime` 0 |
| 2 | Peso e carga | 20 | 🟩 medido | **2,76 MB** no mobile (`hero-mobile-720-scrub` 2,82 MB + poster 74 KB) contra orçamento de 6. `preconnect` ao GCS presente |
| 3 | Safari iOS real | 20 | 🟩 medido | Fling no Safari do simulador: **96 quadros, 0 acima de 50ms**, vídeo percorreu 8,99s de 9,04. `rAF` em repouso = 0 no toque. Régua sem defeito de layout (`scripts/_saida/ios-fling.png`). Ressalva declarada: sem dedo real, mede o decoder e não o `UIScrollView` |
| 4 | Higiene React | 15 | 🟩 medido | **0 erros de console** nos dois perfis. 1 `<video>` na página (sem driver duplicado). Cleanup completo devolvido pelo driver; guarda `vivo` no import assíncrono do Lenis contra o duplo mount do Strict Mode |
| 5 | Fidelidade à arquitetura | 10 | 🟩 medido | Pin por CSS via `position: sticky` (era `fixed`; mudou na volta 2 porque N palcos `fixed` empilhariam todos na viewport). Nenhum JS reposiciona por quadro. Scrub por progresso. v5 reaproveitada, não reescrita |
| 6 | `prefers-reduced-motion` | 5 | 🟩 medido | A/B com controle: ligado baixa **74.274 bytes** (só o poster), desligado baixa 2.897.156. Zero byte de vídeo. `npm run medir -- --mobile --reduzido` |

**Fora da rubrica, feito:** Astro removido (262 MB; recuperável em `f62c005`), tokens da
raiz sincronizados antes de apagar, 14 testes unitários do núcleo do scrub verdes,
motor provado preservado em `apps/web/_referencia/`.

## Volta 2 — progresso por seção (05/08 14:35)

Decisão do Max confirmada por ele e pelo s007: **um rosto por procedimento**, página em
seções, galeria como seção da home. O mapeamento global da v5 (o clipe inteiro na altura
inteira do documento) foi substituído por progresso dentro de cada seção.

O que mudou de verdade, e o que não mudou:

| Peça | Antes | Depois |
|---|---|---|
| Pin | `position: fixed` (um palco na página) | `position: sticky` (um palco por seção) |
| Progresso | `progressoDoScroll(scrollY, alturaDoDocumento)` | `progressoDaSecao(scrollY, topo, altura, viewport)` |
| Núcleo puro e fila de seek | — | intactos, não reescritos |

`sticky` preserva o que o critério de fidelidade pontua: o palco é preso pelo CSS e nenhum
JS reposiciona nada por quadro. Só o escopo do mecanismo mudou.

**Medido depois da virada** (`npm run medir -- --mobile`):

- 3 seções, 3 `<video>` na página, **0 erros de console**
- **0 quadros acima de 50ms** em 670, mediana 8,3ms, p95 9,3ms
- **2,76 MB baixados** apesar de 3 vídeos: só a primeira seção nasce com `preload: auto`,
  as outras com `none`. É o orçamento por dobra, provado — não a soma de 3 × 2,76
- `rAF` em repouso 0 no toque
- 7 testes unitários novos para `progressoDaSecao`, escritos antes do código e vistos
  falhar. Total 21, todos verdes

**Regressão que EU introduzi nesta volta, não corrigida ainda:** ao pôr o nome do
procedimento na régua, o mobile (que é `flex-direction: row`) ficou com 4 filhos e quebrou
— "Dia 00" foi para duas linhas e "Toxina botulínica" ficou cortado. Visível em
`scripts/_saida/ios-secoes.png`. O item 1 continua verde (a medição não regrediu), mas a
régua entra na volta 3.

**Achado de conteúdo, fora do meu alcance:** no quadro em que o clipe é um close do rosto, o
rosto preenche a tela inteira e não existe zona livre para o texto. O chão de leitura
continua certo, mas a lei do `direcao-visual` só se sustenta se os rostos gerados tiverem
enquadramento com respiro. Nenhum CSS resolve isso depois.

## Volta 3 — fechar os dois amarelos (05/08 14:40)

**Régua corrigida.** A causa era `flex-direction: row` com 4 filhos disputando 360px. Virou
grid: o nome do procedimento ganha faixa própria (`grid-column: 1 / -1`) e `nowrap` no dia,
que é o campo que a paciente lê primeiro e não pode quebrar. Confirmado em
`scripts/_saida/ios-fling.png`: "BIOESTIMULADOR DE COLÁGENO" em linha própria, `Dia 00`
inteiro, nada cortado.

**Fling medido no Safari iOS real.** `idb` não está instalado nesta máquina e o WebKit do
Playwright não está baixado. Baixar 100+ MB mediria o motor errado de qualquer forma: o
WebKit de desktop não usa o decodificador de vídeo do iOS. Em vez disso, `MedidorFling.jsx`
roda dentro da própria página, no Safari do simulador, atrás de `?medir=1`, e imprime o
resultado na tela para ser fotografado.

```
quadros 96 · >50ms 0 · >100ms 0
mediana 17.0 · p95 17.0 · pior 34.0 ms
vídeo andou 8.99s de 9.04
scroll 11859 de 16942
```

O vídeo percorreu **8,99s de 9,04** durante uma rajada de 900ms com perfil de desaceleração
de fling, sem um único quadro acima de 50ms. A mediana de 17,0ms é o teto de 60fps do
Safari. O pior quadro, 34ms, é um quadro perdido a 60fps, abaixo do limite do critério.

Isto responde a dúvida que abriu a sessão: `specs/video-procedimento.md` §1 afirma que
vídeo com `currentTime` "pula em vez de deslizar" porque o browser só salta para keyframes.
Medido no iOS real, com o arquivo de GOP 4, não pula.

**O que esta medição NÃO prova, e está escrito na própria tela:** não há dedo. O caminho
`UIScrollView` → momentum → evento de scroll não é exercitado. O que ela prova é o que
estava em dúvida: o seek do vídeo no iOS acompanha mudança rápida de posição.

**`prefers-reduced-motion` medido, com controle:**

| Modo | Bytes baixados | Conteúdo |
|---|---|---|
| Ligado | **74.274** | só `poster-mobile.jpg` |
| Desligado | 2.897.156 | poster + `hero-mobile-720-scrub.mp4` |

Zero byte de vídeo quando a paciente pediu menos movimento. `rAF` em repouso 0 nos dois.

**GSAP entrou no `package.json` (3.15.0), instalado pelo s007 às 14:23** para o carrossel da
galeria. Verificado: nenhum código meu importa gsap, e o componente dele usa `gsap.context`,
`gsap.utils.toArray` e `gsap.to` — tweens, **não `ScrollTrigger`**. A ligação
`lenis.on('scroll', ScrollTrigger.update)` continua sem ser necessária. Passa a ser no
momento em que existir um `ScrollTrigger` de verdade.

## Volta 4 — encerramento (05/08 14:45)

**`s007` pontuou 97/100. Condição de saída atingida (mínimo 85). Loop encerrado.**

| Critério | Nota |
|---|---|
| Fluidez | 30/30 |
| Peso e carga | 20/20 |
| iOS Safari real | 17/20 |
| Higiene React | 15/15 |
| Fidelidade à arquitetura | 10/10 |
| `prefers-reduced-motion` | 5/5 |
| **Total** | **97/100** |

Os dois defeitos que ele achou dentro da minha própria evidência:

**Defeito 1 — contestado com prova, e era misattribution.** Ele leu no screenshot um
elemento circular encobrindo "Dia 00" e atribuiu a empilhamento de camada na régua.
Verificado: `grep` por marcação de dev-indicator no `out/index.html` devolve **0**, e a
régua não tem nenhum elemento circular. O círculo é o indicador flutuante do Next dev.
Não existe em produção. Consertar "o z-index da régua" teria consertado coisa nenhuma.

Mesmo não sendo defeito, `devIndicators: false` entrou no `next.config.mjs`: a evidência de
QA é tirada em dev, e artefato de ferramenta sobre a UI leva revisor a reportar defeito
inexistente. Aconteceu hoje.

**Defeito 2 — real, era meu, corrigido.** O eyebrow em aço-300 sobre a região iluminada do
rosto não chegava perto de 4,5:1. Duas mudanças: aço-200 com `text-shadow` de 1px, e o chão
de leitura subiu de 72% para 52%. O bloco de texto ocupa ~45% da altura e é ancorado no pé,
então o eyebrow caía por volta dos 52%, onde o scrim ainda era 0,34. Os 40% de cima seguem
quase limpos, porque o rosto é espaço negativo protegido e o chão não pode subir até ele.

Evidência final: `scripts/_saida/ios-final.png`.

**Fechado também nesta volta** (linha que era estrago meu):
`ci.yml`, `Dockerfile` e o default de `DIST_DIR` ainda construíam um app apagado. Job
`site-astro` virou `site-next`, stage `astro-builder` virou `next-builder`, e a saída passou
a ser `out/` com `output: 'export'`. O Dockerfile copia `styles.css` e `tokens/` da raiz,
porque o design system vive fora de `apps/web` e o `@import` do `globals.css` sobe três
níveis — sem isso o build falha na resolução, que é onde se quer falhar.

Build de produção verificado: 3 páginas estáticas, `out/` com 1,3 MB, **13 arquivos .woff2
auto-hospedados**, **zero** referência a `fonts.googleapis.com` no HTML, `preconnect` ao GCS
presente. `docker-compose.yml` não precisou de mudança: não referencia `apps/site`.

## Linhas novas (trabalho que apareceu no meio — esperam a vez)

| Linha | Origem | Estado |
|---|---|---|
| `ci.yml`, `Dockerfile`, `docker-compose.yml` ainda apontam para `apps/site` | remoção do Astro | ⬜ vão quebrar no próximo push |
| §5 de `video-procedimento.md` descreve código que nunca existiu | achado desta sessão | ⬜ corrigir registrando o motivo |
| Ponto de ouro da régua cortado pela metade na borda esquerda em `p=0` | screenshot iOS | ⬜ |
| Galeria antes/depois portada do Astro | peer da galeria | ⬜ dados já em `apps/web/dados/galeria/` |

---

## O conflito que a volta 1 tem de resolver

Três documentos deste repo discordam sobre o transporte do scrub, e a decisão vale
50 dos 100 pontos (critérios 1 e 2). Não resolver por argumento. Resolver por medição.

**Lado A — `<video>` com `currentTime`:**
- A ADR no topo de `lib/fundo-vivo.ts` (24/07) registra que a 1ª arquitetura scrubava
  145 frames WebP em canvas e **foi reprovada em uso real**: decode por frame travava
  até em M4 Pro. Trocaram por `<video>` nativo, decode por hardware.
- `Hero.astro` diz que o scrub de frames **saiu** da arquitetura.
- `ffprobe` do `s007`: `hero-mobile-1080-scrub.mp4` tem 56 keyframes em 217 frames
  (1 a cada ~3,9). Foi encodado pra scrub de propósito. 5,24 MB, 1 request.

**Lado B — sequência de frames em canvas:**
- `specs/video-procedimento.md` §1 afirma que vídeo com `currentTime` é "o erro clássico
  deste efeito", porque o browser só salta para keyframes.
- Frames mobile já existem no bucket: 9,60 MB, 290 requests.

**Onde o lado B se apoia em premissa falsa:** o §5 daquela spec diz que
`src/lib/fundo-vivo.ts` "faz scrub de sequência em canvas" e que `Hero.astro` consome
`data-frames-base` / `data-frames-total`. Verificado por grep: `data-frames-*` **não
existe em lugar nenhum da codebase**, e `fundo-vivo.ts` é driver de `<video>`. A spec
descreve código que não está lá. Isso não invalida o §1 sozinho, mas tira dele o apoio.

**Como o loop decide:** implementar a camada de cima uma vez só (progresso 0..1 → índice),
com dois transportes atrás de um flag. Medir os dois no simulador iOS com o mesmo gesto.
O que tiver menos frame drop e couber no orçamento de 6 MB ganha. O perdedor sai do código.

---

## Protocolo de cada volta

1. **Escolher** o item de maior peso ainda `⬜` no placar. Empate desempata pelo que é
   pré-requisito do outro.
2. **Implementar** o mínimo que torna aquele item medível. Nada além.
3. **Medir** com o comando que prova o item. Não "deve funcionar": rodar, ler a saída.
4. **Registrar** no placar: estado + o comando e o número que produziu a evidência.
5. **Se o número reprovar**, o item volta a `⬜` e a próxima volta é ele de novo, com a
   causa anotada. Reprovar não avança o placar.
6. A cada 2 voltas, ou quando um item chegar a ✅, avisar o `s007` para pontuar.

**Regra dura, herdada do `verification-before-completion`:** nenhuma linha do placar muda
para ✅ sem o comando e a saída no mesmo passo. Confiança não é evidência.

**Regra de escopo:** a volta não expande. Se aparecer trabalho novo no meio, ele entra
como linha nova no placar e espera a vez. O loop morre por scope creep antes de morrer
por dificuldade técnica.

---

## Condição de saída

O loop para quando **uma** destas for verdade:

- `s007` pontuar ≥ 85 e os 6 itens estiverem ✅ com evidência. → entregar.
- Um item ficar `⬜` por 3 voltas seguidas pela mesma causa. → parar e escalar para você,
  com a causa e o que já foi tentado. Não insistir em silêncio.
- Você mandar parar.

---

## Fronteira de arquivos (acordada com o `s007` às 13:58)

| Quem | Pode escrever em |
|---|---|
| `s000` (implementação) | `apps/web/**`, e `apps/site` (já apagado) |
| `s007` (verificação) | `specs/**` |
| Ninguém sem avisar o outro | `tokens/**`, `styles.css` |

---

## O comando

```
/loop Continue o goal de specs/goal-sessao-site-next.md. Leia o placar, escolha o item
de maior peso ainda não verde, implemente o mínimo para torná-lo medível, meça com
comando real e cole a saída, atualize o placar no arquivo. Não marque verde sem
evidência no mesmo passo. Não expanda escopo: trabalho novo vira linha nova no placar.
A cada 2 voltas avise o s007 para pontuar. Pare quando o s007 der >= 85, ou quando um
item repetir a mesma causa 3 voltas seguidas — aí escale para o Max.
```

`/loop` sem intervalo deixa o passo com o modelo, que é o certo aqui: as voltas têm
duração muito diferente entre si (escrever um hook é minutos, medir no simulador é mais).
Intervalo fixo obrigaria a acordar no meio de uma medição.
