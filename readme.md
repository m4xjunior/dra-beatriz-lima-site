# Dra. Beatriz Lima — Biomédica Esteta · Design System

Design system parametrizável da marca **Dra. Beatriz Lima — Biomédica Esteta**
(Goiânia/GO · @biomedica.beatrizz). Consultório próprio de biomedicina estética,
atendimento individual. O mesmo pacote de tokens serve ao **site público (Astro)**
e aos **sistemas internos (Tauri/ERP)**.

> **Estado — ETAPA 1 (Fundação) concluída na direção nova, aprovada.**
> Após a primeira versão (creme editorial) lembrar demais o "look Anthropic", a
> pele visual foi refeita: **duotom** (claro/público ↔ escuro/imersivo), tipografia
> **grotesca** (não mais Didone), **metálico champanhe** e uma camada de **efeitos**
> cuja assinatura é a **translucidez (véu de vidro fosco)**. A **arquitetura** de
> tokens (3 níveis) foi mantida e reorganizada por conceito.
> Próximo: Etapa 2 (componentes base). Veja "Roteiro".

---

## Fontes recebidas

Construído a partir de **um briefing textual** (direção de arte + arquitetura) e de
duas rodadas de direção com o cliente. **Nenhum** dos itens abaixo foi fornecido — se
existirem, anexe pela Import menu e o sistema é refinado sobre o material real:

- ❌ Codebase (Astro/Tauri) — não anexado
- ❌ Arquivo Figma / .fig — não anexado
- ❌ Arquivo de logo/marca (SVG/PNG) — **não fornecido** (ver "Marca / logo")
- ❌ Fotografias oficiais (retrato editorial, macro clínico) — não fornecidas
- ✅ Briefing de marca + requisitos regulatórios (texto)
- ✅ Direção do cliente: mais original/3D/efeitos; **foco em translucidez**; **GSAP como motor de movimento**

**Dependências externas.** **GSAP 3.13+** (core + ScrollTrigger + SplitText) via CDN jsDelivr — **100% gratuito, uso comercial coberto** pela licença GreenSock "no-charge" (desde 30/04/2025). Fontes via Google Fonts CDN. Para **Tauri/offline**, auto-hospede ambos (ver notas nas seções Motor de movimento e Fontes).

---

## Contexto da marca

**Posicionamento.** Critério clínico acima de tendência. Mais perto de uma marca de
**dermocosmético de luxo** do que de um spa. Parecer **consultório sério, não salão**.

**Pilares** (comunicados por ela): Ciência · Ética · Escuta · Respeito · Individualidade.

**Discurso central:** *"valor não é só preço"* · *"a estética deve valorizar quem você
é, nunca transformar você em outra pessoa"*. Resultados: **natural, elegante,
proporcional, sem exageros**.

**Público.** Mulheres 25–45, classe média/média-alta, que já pesquisaram muito no
Instagram, têm **medo de "ficar artificial"** e escolhem por **confiança, não preço**.
Decidem no celular → **mobile-first, sempre**.

**Diferencial de produto.** **Pré-visualização facial por IA em 3D** — a paciente vê
uma simulação (ilustração/expectativa) do próprio rosto. Isso motiva o tema
**immersive** (escuro) e a estética de translucidez (olhar a pele "através do vidro").

**Procedimentos** (catálogo cresce — cada novo entra como **dado**, nunca como página
codificada): preenchimento labial (carro-chefe), bioestimuladores de colágeno, toxina
botulínica / harmonização, peelings, protocolos de pele.

---

## CONTENT FUNDAMENTALS — como a copy é escrita

**Tom.** Sóbrio, técnico-acolhedor, editorial. Fala como **profissional que explica**,
não como vendedor. Calmo e confiante; nunca eufórico, nunca urgente.

**Pessoa.** Trata o leitor por **"você"** (2ª pessoa, próximo mas respeitoso). A
profissional aparece em 3ª pessoa institucional ("Dra. Beatriz") ou 1ª pessoa sóbria.
Evita "a gente", gírias e diminutivos ("procedimentozinho").

**Caixa.** Títulos display frequentemente em **CAIXA ALTA com tracking largo** OU em
caixa normal com tracking **apertado** (a grotesca pede negativo em tamanhos grandes);
eyebrows/rótulos sempre em maiúsculas espaçadas.

**Vocabulário.** Clínico e específico: "avaliação", "protocolo", "indicação",
"proporção", "resultado natural". **Evita** superlativos vazios ("incrível",
"transformação radical"), emojis e exclamações.

**Emoji:** **nunca.**

**Preço.** Com **discrição** — nunca manchete. Coerente com "valor não é só preço".

**Exemplos de voz certa**
- Eyebrow: `PREENCHIMENTO LABIAL` · `SIMULAÇÃO 3D`
- Título: `Estética que valoriza você` · `Veja com clareza`
- Frase: "Cada rosto é único, e o cuidado começa pela escuta."
- CTA: `Agendar avaliação` · `Iniciar simulação` (nunca "GARANTA JÁ", "ÚLTIMAS VAGAS")

**Proibições regulatórias na copy (CFBM Res. 330/2020 — requisito de design):**
- ❌ Promessa/garantia de resultado; ❌ pacotes, promoções, descontos, "vagas", combo
- ✅ Simulação 3D sempre rotulada **ilustração / expectativa**, jamais "seu resultado"
- ✅ Antes/depois e simulação carregam **disclaimer obrigatório** (texto editável,
  presença não-removível — regra de esquema)

---

## VISUAL FOUNDATIONS

**Direção em uma frase:** luxo clínico **dimensional e translúcido** — olhar a pele
através de um **véu de vidro fosco** levemente dourado, que difunde a luz.

**Duotom (a espinha).** Dois temas de primeira classe, do mesmo conjunto de primitivos,
trocados por `[data-theme]` no `<html>`:
- **`brand`** (padrão) — claro, sereno, público. Base creme quente, muito ar, véu claro.
- **`immersive`** — obsidiana quente (nunca `#000`), para **3D / simulação**. O ouro
  ganha **bloom**, o vidro ganha **luz interna e tinta dourada**.
- **`ops`** — interno/ERP (Tauri): neutro, denso, **sem vidro**, sans em tudo, alta
  legibilidade em tabela.

**Paleta.** Creme (`--color-sand-*`) e obsidiana quente (`--color-obsidian-*`); **família
dourada** bronze→champanhe com tratamento **metálico/reflexivo** (não chapado); `champagne`
como highlight; **nude/pele** como acento. Dourado é **acento, texto e brilho — nunca
fundo inteiro**. Status dessaturado (clínico), nunca vibrante.

**Tipografia.** Display **Bricolage Grotesque** — grotesca contemporânea, tech-editorial,
tracking apertado, muitas vezes com **gradiente metálico** aplicado ao texto
(`background-clip`). Corpo **Mulish** (sans humanista leve), cinza-carvão, **entrelinha
alta (1.7)**. Serifa **Cormorant Garamond** *só em citações*. (Saíram Bodoni/Didone: eram
a maior fonte do "ar Anthropic".)

**Translucidez — a assinatura.** Escala de **véu** em 3 níveis de opacidade
(`--veil-*-1/2/3`): menos opaco = mais se vê através. Todo véu combina **blur + saturate
+ sheen (brilho de topo) + luz interna difusa** e, no escuro, **tinta dourada**. Regra:
`véu-3` para conteúdo denso (garante legibilidade AA); `véu-1` decorativo. Nav, modal e
cards são translúcidos; a página/foto/3D transparece por trás.

**Efeitos** (tokens em `effect.css`): vidro/véu, **bloom** dourado (3 intensidades),
**metálico champanhe** (gradiente reflexivo), **mesh** de fundo (radial, discreto),
**grão** de filme (feTurbulence), **profundidade em camadas** e **tilt 3D**. Movimento
**moderado (~40)**, sem bounce; respeita `prefers-reduced-motion`. O movimento é
orquestrado por **GSAP** (ver seção abaixo) — não por CSS `@keyframes` avulsos.

---

## MOTOR DE MOVIMENTO — BL·Motion sobre GSAP

O movimento do sistema é orquestrado por **GSAP** (GreenSock), encapsulado numa camada
de marca em `motion/bl-motion.js`. GSAP é o padrão da indústria para coreografia de
timeline, scroll e texto — e desde **30/04/2025 é 100% gratuito** (v3.13+), incluindo os
plugins antes pagos (**ScrollTrigger**, **SplitText**), com **uso comercial coberto** pela
licença GreenSock (não-MIT; código gerado por IA é uso permitido).

**Por que uma camada própria (`BLMotion`) e não GSAP cru nos componentes:**
- **Token-aware** — lê `--duration-fast/base/slow/slower` do CSS e mapeia os cubic-bezier
  da marca para eases GSAP (`power3.out` entrada, `power2.inOut` padrão). Nada hardcoded:
  mudar o token muda a animação.
- **Declarativa por `data-*` (§5.2)** — o admin adiciona `data-bl-reveal`, `data-bl-tilt`,
  `data-bl-split` ou `data-bl-parallax` a qualquer bloco; `BLMotion.auto()` liga tudo.
  Comportamento vira dado, não código.
- **Acessível (AA)** — se `prefers-reduced-motion: reduce`, cada receita mostra o **estado
  final** sem animar (reveal → opacidade 1; tilt/parallax → desligados).
- **Sem vazamento** — como os componentes rodam sem bundler, usamos `gsap.context()` +
  `ctx.revert()` no cleanup (equivalente sancionado ao hook `useGSAP()` de `@gsap/react`,
  que é o padrão quando há build).

**Receitas expostas:** `reveal` (surge subindo + fade em lote via `ScrollTrigger.batch`),
`split` (headline caractere-a-caractere com máscara via `SplitText`), `tilt` (inclinação
3D seguindo o ponteiro via `gsap.quickTo`), `parallax` (camadas em ritmos diferentes no
scroll, `scrub`), `bloomPulse` (brilho dourado que respira). Regras de performance:
animar só transforms (x/y/scale/rotation/opacity); `matchMedia` para responsivo.

**Carregamento (site público / Astro):**
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>
<script src="/motion/bl-motion.js"></script>
<script>BLMotion.ready().then(() => BLMotion.auto());</script>
```
> ⚠️ **Tauri/offline:** auto-hospede os `.min.js` do GSAP e ajuste `BL_CDN` no topo de
> `bl-motion.js`. A API (`BLMotion.*`) não muda. `bl-motion.js` também sabe **lazy-load**
> do CDN se o GSAP não estiver presente.

**Backgrounds.** Campos creme ou obsidiana com **mesh** radial muito sutil + grão fino.
Sem texturas pesadas, mármore falso ou gradiente vibrante. O gradiente dourado/metálico
aparece em bordas, texto e bloom — nunca como fundo chapado.

**Cantos / raios.** **Suaves** (amigáveis ao vidro): `xs 4` · `sm 8` · `md 12` (control)
· `lg 16` (card) · `xl 22` (surface). `pill` para badges. Sem cantos afiados aleatórios.

**Bordas.** Fio dourado 1px (`--border-hairline`) como divisor; borda de vidro
translúcida (`--surface-glass-border`) nos véus; `--border-metal` (gradiente) em acentos.

**Elevação.** Profundidade em **camadas** (sombras curtas empilhadas), tingida de tinta
quente; no escuro, sombras mais profundas + bloom. Preferir **véu + luz interna** a
sombra dura.

**Estados.** *Hover:* tinta dourada leve / `brightness` no metálico / bloom no card.
*Press:* tinta mais forte, encolhimento sutil. *Focus:* anel dourado (`--ring-focus`).

**Fotografia (dois registros).** (1) Retrato editorial dela, fundo neutro, luz quente;
(2) macro clínico cru, sem filtro pesado. Vibe **quente**, natural, sem beauty-filter.
No tema immersive, a foto entra **atrás do véu** como sujeito da simulação.

**Layout.** Mobile-first. Grid 12 col, container 1200px, medida de leitura ~68ch.
Fixos: nav translúcida; disclaimer persistente em simulação/antes-depois.

**Cards.** Superfície de **véu** (translúcida) com sheen + luz interna, raio 16px,
profundidade em camadas. No `ops`, cards quase opacos (legibilidade em tabela).

---

## ICONOGRAPHY

**Marca predominantemente tipográfica e geométrica, não pictórica.** "Ícones" da
identidade são **motivos**: chave `{` (listagem), fio dourado 1px (divisor), monograma
"BL" em grotesca, e o **orb** dourado com bloom (motivo de luz/3D).

**Regras.** ❌ Nunca ícones ilustrados de seringa/lábios/gotas/rosto (clichê de clínica).
❌ Nunca emoji. ❌ Nunca unicode decorativo como ícone.

**Ícones funcionais de UI** (menu, fechar, seta, check, upload, câmera, rotação 3D — nas
Etapas 2–3): **substituição proposta [Lucide](https://lucide.dev)** — traço ~1.5px,
coeso com a hairline. **Sinalizado como substituição** — confirme ou troque. Colorizados
por `currentColor`; SVGs copiados para `assets/icons/` na Etapa 2.

---

## Marca / logo

**Nenhum arquivo de logo oficial foi fornecido.** Não criei/reconstruí um logo. Onde uma
marca apareceria, uso um **lockup tipográfico** (monograma "BL" em Bricolage com gradiente
metálico + "DRA. BEATRIZ LIMA / BIOMÉDICA ESTETA" em caixa alta espaçada). É **placeholder**
— envie o SVG oficial e ele substitui o lockup em todo o sistema.

---

## PARAMETRIZAÇÃO — a restrição que governa tudo (briefing §5)

Nada hardcoded. Todo valor visual e (Etapa 3) todo texto é variável, editável por admin.

- **§5.1 Tokens = fonte única.** `tokens.json` (W3C Design Tokens) → projeção CSS em
  `tokens/*.css` (`:root`). Admin sobrescreve em runtime injetando `:root{…}` depois de
  `styles.css`, **sem rebuild**. Nenhum literal dentro de componente — só `var(--token)`.
- **§5.2 Variantes por dado.** `data-variant` / `data-size` / `data-density` no HTML; o
  CSS reage. (Aplicado nos componentes da Etapa 2.)
- **§5.3 Temas derivados.** `brand` · `immersive` · `ops` por `[data-theme]`, dos mesmos
  primitivos. Estrutura pronta para temas adicionais.
- **§5.4 Conteúdo separado.** *(Etapa 3)* texto/imagem/rótulo/erro vêm de esquema
  (Astro Content Collections + Zod).
- **§5.5 Entidade "procedimento".** *(Etapa 3)* esquema único; cadastrar renderiza a
  página inteira sem código.
- **§5.6 Páginas = blocos.** *(Etapa 3)* array ordenado de blocos com esquema + estilo.
- **§5.7 Segurança.** Todo parâmetro: tipo, padrão, faixa/enum, validação. **Contraste AA
  é barreira** (bloqueia par abaixo de 4.5:1 / 3:1 grande). Presença do disclaimer não
  removível. Tabela completa na Etapa 4.

---

## Referência de tokens

Camadas (cada `@import`-ada por `styles.css`, nesta ordem):

| Arquivo | Nível | Papel |
|---|---|---|
| `tokens/fonts.css` | — | `@import` das webfonts (Google CDN) |
| `tokens/color.css` | **1 · Primitivo** | sand, ink, obsidian, gold, champagne, nude, status |
| `tokens/typography.css` | **1 · Primitivo** | famílias, escala de tipo, pesos, entrelinha, tracking |
| `tokens/scale.css` | **1 · Primitivo** | espaço, raio (suave), bordas, movimento, z, breakpoints, grid |
| `tokens/effect.css` | **1 · Primitivo** | **véu/vidro, bloom, metálico, mesh, grão, tilt, elevação** |
| `tokens/semantic.css` | **2 · Semântico** | temas `brand` / `immersive` / `ops` (surface, text, border, glass, space) |
| `tokens/components.css` | **3 · Componente** | `--button-*`, `--field-*`, `--card-glass-*`, `--nav-*`, `--modal-*`, `--disclaimer-*`… |
| `tokens.json` | fonte | W3C Design Tokens |

**Regra:** componentes leem **só** níveis 2–3, nunca o 1.

### Contraste (WCAG AA verificado)

| Par (texto / superfície) | Token | Ratio | Resultado |
|---|---|---|---|
| ink-900 / sand-100 | `--text-body` (brand) | 16.2:1 | AA · AAA |
| ink-500 / sand-100 | `--text-muted` (brand) | 5.9:1 | AA |
| gold-700 / sand-100 | `--text-accent` (brand) | 5.5:1 | AA |
| ink-400 / sand-100 | `--text-subtle` (brand) | 3.4:1 | AA **grande** |
| sand-50 / obsidian-900 | `--text-body` (immersive) | 16.8:1 | AA · AAA |
| gold-300 / obsidian-900 | `--text-accent` (immersive) | 8.9:1 | AA |

> **Véu & contraste:** texto sobre véu translúcido usa **`véu-3`** (opacidade alta) +
> blur, para manter AA mesmo com fundo vivo atrás. Véu-1/2 só para elementos decorativos
> ou rótulos grandes.

### Fontes — nota de substituição

Tipografias pretendidas: **Bricolage Grotesque** (display), **Mulish** (corpo),
**Cormorant Garamond** (citações) — via **Google Fonts CDN** em `tokens/fonts.css` (não é
fallback; é a fonte real via CDN). ⚠️ Para **Tauri/offline** auto-hospede os `.woff2` e
troque o `@import` por `@font-face` locais — os tokens `--font-*` não mudam. Envie
arquivos licenciados se tiver.

---

## Índice / manifesto

```
styles.css                      ← ponto de entrada único (só @imports)
tokens.json                     ← fonte W3C Design Tokens
tokens/
  fonts.css  color.css  typography.css  scale.css  effect.css
  semantic.css  components.css
motion/
  bl-motion.js                  ← camada de movimento da marca sobre GSAP
guidelines/                     ← specimen cards (aba Design System)
  colors-*.html   type-*.html   space-*.html
  grid-breakpoints.html  radius.html  elevation.html
  brand-*.html (duotom, gradient, hairline-brace, lockup, motion, themes)
  token-architecture.html
  effect-glass.html  effect-metal-bloom.html  effect-nav.html
  motion-reveal.html  motion-split.html  motion-tilt.html
  motion-parallax.html  motion-engine.html
thumbnail.html                  ← tile do sistema
readme.md                       ← este arquivo
```

**Specimen cards por grupo (32):** Cores (6) · Tipografia (6) · Espaçamento & Grid (5) ·
Marca (7) · **Efeitos & Profundidade (3)** · **Movimento / GSAP (5)**.

---

## Roteiro (aprovação entre etapas)

- [x] **Etapa 1 — Fundação:** tokens (3 níveis) CSS + W3C JSON; paleta AA; escala de
  tipo; espaçamento; grid/breakpoints; raios; elevação; gradiente/metálico; temas
  brand/immersive/ops; **camada de efeitos + translucidez**; **motor de movimento GSAP
  (BL·Motion)**; specimen cards; este guia.
- [ ] **Etapa 2 — Componentes base:** Button, Field, Card (incl. véu), Nav
  (mobile+desktop translúcida), Footer, Badge, Tabs, Modal, Toast — `data-*`-driven, só
  tokens, com animações via BL·Motion (reveal/tilt/reduced-motion embutidos).
- [ ] **Etapa 3 — Componentes de domínio:** ServiceCard, BeforeAfter (+legenda legal),
  Pillars (por lista), PhotoCapture (+LGPD), FaceViewer3D (+rótulo ilustração),
  ConsentBanner, Disclaimer, Booking/Contact. Esquema Zod do "procedimento", blocos de
  página, Content Collections.
- [ ] **Etapa 4 — Guia + parâmetros:** tom de voz, uso de logo/gradiente/fotografia,
  **tabela completa de campos do admin** (tipo · padrão · faixa · validação).

> **Próximo passo:** seguir para a Etapa 2 com a nova pele (véu/tilt/bloom + `data-*`).
