# Critérios de aceitação — site novo em Next.js

Documento do peer de verificação (s007). O s000 implementa, este arquivo define o que passa
e o que volta. Nota mínima **85/100**.

Base técnica: `specs/hungry-tiger-mapa-tecnico.md`.

## Contexto da virada

Decisão do Max em 05/08/2026: abandonar o Astro, criar o site do zero em **Next.js + JSX**,
com a mesma stack do eathungrytiger.com. O hero em vídeo da Dra. passa a usar a mesma lógica
de scroll-scrub do pote deles. O `apps/site` atual é apagado no fim.

## Stack alvo

| Camada | Hungry Tiger | O nosso |
|---|---|---|
| Framework | Webflow (estático) | Next.js + JSX |
| Scroll | Lenis 0.2.28 | `lenis` (npm, versão atual) |
| Timeline | GSAP 3.11.3 + ScrollTrigger | mesmo |
| Texto | SplitType | `split-type` |
| Scrub | Lottie + IX2 | scrub próprio (vídeo ou frames) |
| Imagens | AVIF | AVIF, já pronto no bucket |
| Deploy | Webflow | Cloudflare Pages (Direct Upload, ver memória) |

Webflow Ecommerce e Stripe não se aplicam. O site da Dra. não vende.

## Assets já provisionados

Bucket público `https://storage.googleapis.com/dra-beatriz-lima-estetica/` — 929 objetos,
101,79 MB. Medidos em 05/08/2026:

| Caminho | Conteúdo | Peso |
|---|---|---|
| `v1/hero-1440/frame-NNN.webp` | 290 frames desktop | 27,25 MB · 96 KB/frame |
| `v1/hero-mobile-1080/frame-NNN.webp` | 290 frames mobile | 9,60 MB · 34 KB/frame |
| `v1/hero-mobile-1080-pan/frame-NNN.webp` | 290 frames, variante com pan | 9,77 MB |
| `v2/scrub_video/hero-1080-scrub.mp4` | desktop, encodado pra scrub | 8,53 MB |
| `v2/scrub_video/hero-mobile-1080-scrub.mp4` | mobile, encodado pra scrub | 5,24 MB |
| `v2/web_video/hero-1080.mp4` | reprodução linear | 4,72 MB |
| `v2/web_video/poster-*.jpg` | posters | 54 e 72 KB |
| `galeria/*.{avif,webp}` | antes/depois, 24 arquivos | ~1,7 MB |
| `hero-master/hero-4k.mp4` | master, não usar na web | 15,16 MB |

### Qual mp4 serve pra scrub

`ffprobe` nos dois, ambos h264 24fps 217 frames com `faststart`:

| Arquivo | Keyframes | Serve pra scrub? |
|---|---|---|
| `hero-mobile-1080-scrub.mp4` | **56** (1 a cada ~3,9 frames) | Sim |
| `hero-mobile-1080.mp4` | **3** | Não — cada seek decodifica até 70 frames |

## As quatro decisões que fazem o Hungry Tiger ser fluido

Todas obrigatórias no nosso.

1. **Pin por CSS, nunca `ScrollTrigger.pin`.** O palco fica `position: fixed; inset: 0` com
   `z-index` próprio. Nenhum JS reposiciona nada por quadro. É a maior fonte de ausência de
   jitter, e é de graça.
2. **Scrub é progresso puro convertido em índice.** O IX2 deles resume-se a
   `goToFrame(frames * progresso)` com `setSubframe(true)`. O progresso fica em float e só
   arredonda na hora de escolher o quadro.
3. **Preload agressivo.** `preconnect` para o host dos assets e `preload` do arquivo do hero.
   Eles pagam a conta toda no início justamente pra não gaguejar depois.
4. **Config do Lenis testada:** `duration: 1.2`, easing `1.001 - 2^(-10t)`,
   `smoothTouch: false`, `touchMultiplier: 2`.

## O que este projeto já provou, e que muda a decisão

Revisado em 05/08/2026 depois que o s000 apontou o furo e eu verifiquei na fonte.

O ADR preservado em `apps/web/_referencia/fundo-vivo.ts.ref` (datado de 24/07/2026)
registra que **a arquitetura de frames em canvas já foi construída aqui e reprovada em uso
real**: 145 frames WebP, decode de bitmap por frame travando até em M4 Pro. Foi substituída
por `<video>` nativo, que decodifica por hardware.

O mesmo ADR diz que os `*-scrub.mp4` foram encodados com **GOP de 4, sem B-frames**. Meu
`ffprobe` mediu 56 keyframes em 217 frames, ou seja 1 a cada 3,87. Duas fontes independentes,
o mesmo número. Aqueles arquivos existem para scrub, de propósito.

**Consequência:** o caminho de frames em canvas não é uma incógnita a testar, é uma questão
já resolvida. Construir os dois transportes para comparar seria pagar duas vezes pela mesma
informação. Requisito passa a ser **caminho único de vídeo**, reaproveitando a lógica da v5
já provada, não reescrita do zero.

A v5 resolve um problema que reaparece em qualquer implementação nova: a v4 travava no
Android porque perseguia o alvo com teto de passo por seek, e o vídeo nunca alcançava o dedo.
A v5 trocou por uma fila de um seek mirando sempre a posição mais recente, com
`requestVideoFrameCallback` para saber que o frame foi apresentado (mais confiável que
`seeked`, que dispara quando o decoder termina, não quando o compositor mostra).

### Risco em aberto: o Lenis reintroduz o rAF permanente

O ADR da v5 é explícito ao dizer que o ciclo é todo por evento e que em repouso o custo de JS
por frame é zero, ao contrário da v4, que mantinha um `requestAnimationFrame` girando a
60–120 Hz pela vida inteira da página.

O Lenis funciona exatamente como a v4 nesse ponto: um rAF permanente. Usar Lenis reintroduz,
por baixo, o que a v5 removeu de propósito.

Isso não veta o Lenis. Ele é o que dá a sensação no Hungry Tiger. Mas precisa ser **medido no
aparelho real**, não assumido. Se custar bateria ou segurar o main thread, existe meio-termo
óbvio: Lenis no desktop e scroll nativo no touch, que é aliás o que eles já fazem com
`smoothTouch: false`.

## Dois defeitos deles que não herdamos

**O callback do Lenis está vazio.** Eles nunca ligam Lenis ao ScrollTrigger; funciona porque
o Lenis ainda dispara scroll nativo.

Ressalva registrada em 05/08/2026: eu tinha exigido a ligação
`lenis.on('scroll', ScrollTrigger.update)` mais `gsap.ticker`. O s000 apontou, com razão, que
essa exigência pressupõe ScrollTrigger, e nesta peça não há nenhum. O pin é CSS puro e o
scrub lê o progresso do próprio Lenis. Instalar GSAP só para essa ligação seria peso morto e
um segundo loop para dar errado.

**GSAP fica fora por enquanto.** Do defeito deles sobrevive só a regra geral: um loop, nunca
dois. Quando SplitType entrar com scrub por palavra, GSAP entra junto e a ligação passa a ser
obrigatória.

**O listener do header é `window.addEventListener("scroll")` cru**, sem throttle nem rAF.
Passa neles porque o corpo é barato. Não replicar.

## Rubrica

| Critério | Peso | O que reprova |
|---|---|---|
| Fluidez do scrub medida | 30 | frame drop visível, progresso em degraus, jitter no pin |
| Peso e carga | 20 | caminho crítico do hero acima de **6 MB** no mobile; sem `preconnect`/`preload` |
| iOS Safari real | 20 | ausência de evidência; "deve funcionar" não conta. Inclui o custo do rAF do Lenis em repouso, medido |
| Higiene React | 15 | falta de cleanup, loop duplicado em Strict Mode, `'use client'` ausente |
| Fidelidade à arquitetura | 10 | pin em JS, scrub por índice inteiro, Lenis fora da config, v5 reescrita do zero em vez de reaproveitada |
| Acessibilidade | 5 | `prefers-reduced-motion` ignorado |

## Armadilhas de Next.js que serão checadas

- **Strict Mode monta duas vezes em dev.** rAF do Lenis sem `cancelAnimationFrame` no cleanup
  gera dois loops e rolagem em dobro.
- Cleanup completo: `lenis.destroy()`, `ScrollTrigger.getAll().forEach(t => t.kill())`,
  `cancelAnimationFrame`.
- No caminho de vídeo: `playsInline`, `muted`, `preload="auto"` são obrigatórios no iOS, e
  `currentTime` só pode ser escrito dentro de `requestAnimationFrame`.
- `prefers-reduced-motion`: frame estático no poster. O Hungry Tiger não trata isso; nós sim.

## Fronteira entre os peers

| Quem | Onde |
|---|---|
| s000 (implementação) | diretório novo do Next.js; `apps/site` quando for hora de apagar |
| s007 (verificação) | apenas `specs/` |
| ambos | `tokens/` só com aviso prévio |

Branch: `claude/mobile-scroll-animation-perf-kbasw3`.

## Transporte definido

**Caminho único: scrub MP4** (`5,24 MB` mobile, 1 request), reaproveitando a lógica da v5 em
`apps/web/_referencia/fundo-vivo.ts.ref`.

A alternativa de frames WebP (`9,60 MB` mobile, 290 requests) não entra, pelo motivo
registrado na seção "O que este projeto já provou": foi construída, medida e reprovada aqui
em 24/07/2026.

Referência de peso: o Hungry Tiger entrega **10,63 MB**. O nosso caminho é metade disso.

Se o vídeo reprovar no Safari iOS real, a decisão sobe para o Max. Nesse ponto os dois
caminhos conhecidos deste projeto terão falhado, e o problema deixa de ser escolha de
transporte.
