# Direção Visual — Dra. Beatriz Lima (fonte de verdade)

> Artefato de direção (frontend-blueprint, fase 3) que ancora TODOS os
> tracks visuais: sessão local, peers (s002) e Claude Design
> (design/refinamento). Divergiu daqui → discute antes de commitar.

## Mood

**Editorial clínico-luxo.** Revista de estética impressa em vidro sobre a
presença viva da Dra. — sereno, quente, preciso. Nunca "template SaaS",
nunca "AI slop" (gradiente roxo, glow neon, cards idênticos em grade).

## Arquitetura visual (fixa — não renegociar)

- A Dra. em **vídeo nativo de fundo em todo o site** (FundoVivo, modo
  híbrido de scroll). É a protagonista; o design nunca compete com o
  rosto dela — hairlines, blooms e sombras jamais cruzam o rosto.
- Conteúdo flutua **acima** do vídeo (`.conteudo-site`, z 1).

## Proteção de texto sobre vídeo (política corrigida 25/07)

REPROVADO pelo Max: halo/oval radial com blur atrás de blocos de texto
(o ".veil" do handoff) — tapa o rosto dela. O certo (Smashing/WCAG):
1. **Composição primeiro**: bloco de texto posicionado FORA da zona do
   rosto — o rosto é espaço negativo protegido.
2. **Faixa de gradiente retangular** ancorada à borda/coluna do texto,
   dissolvendo na direção OPOSTA ao rosto.
3. Fundo claro/ocupado → véu retangular radius-lg alinhado à caixa do
   texto (tokens surface-glass*, remap de touch respeitado).
4. Contraste AA 4.5:1 medido, sempre.

## Vidro com propósito (política anti-excesso)

Vidro (surface-glass* + blur) existe pra UMA coisa: legibilidade de
texto denso sobre vídeo em movimento. Regras:

1. **Blocos de leitura** (corpo, listas, formulários): ilha de vidro.
2. **Momentos tipográficos** (títulos gigantes, assinatura, citações
   curtas): SEM caixa — tipografia direto sobre o vídeo, apoiada nos
   véus de gradiente do FundoVivo. Variar a linguagem é o que separa
   editorial de template.
3. Nunca vidro dentro de vidro (cards aninhados).
4. Touch: vidro vira véu denso 0.80 sem blur (token remap em base.css —
   decisão de performance medida em Android; NÃO reverter).

## Tipografia

- **Display**: Bricolage Grotesque variável (opsz 12..96, wdth 75..100,
  wght 200..800). Títulos grandes DEVEM puxar `opsz` alto (corte
  display) e podem respirar em wdth. Pesos contrastados: 200 na
  assinatura interativa, 700+ em headlines.
- **Ênfase/citação**: Cormorant Garamond itálico — a voz "humana" dentro
  do grotesco. Uma palavra por headline basta (ex.: "você").
- **Corpo**: Mulish, medida 34–42ch, leading relaxado.
- Eyebrows: caps, tracking widest, dourado — nunca maiores que 12px.

## Cor

Só tokens do DS (sand/ink/gold/nude). O dourado é ACENTO cirúrgico
(eyebrow, hairline, ênfase) — nunca área grande. Zero hex solto; as duas
cópias de tokens (raiz e apps/site/src/design-system) sempre em sincronia.

## Espaço e ritmo

Ritmo variado: agrupamentos apertados dentro das ilhas, respiros
generosos entre atos da página. Assimetria intencional (ilha à esquerda,
meta à direita, assinatura full-bleed). Nada de grade de cards idênticos.

## Movimento

- O vídeo é a ÚNICA fonte de movimento de fundo. Proibido canvas/shader.
- UI: UMA entrada coreografada por dobra (stagger via BL·Motion) vale
  mais que micro-interações espalhadas. Easing exponencial (power3/4
  out), nunca bounce.
- TextPressure na assinatura é o momento interativo da página.
- `prefers-reduced-motion`: tudo estático, sempre.

## Anti-padrões (teste do "IA fez isso?")

Se parecer saída padrão de IA, refaz: gradiente em texto de métrica,
cards com sombra genérica, ícone redondo sobre cada heading, tudo
centralizado, mesmo padding em tudo, glassmorphism decorativo.
