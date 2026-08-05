# Vídeo do procedimento — rosto de referência, animação e scrub

Como gerar o rosto modelo, animar o procedimento estético em fundo chroma
e ligar isso ao scroll com a mesma fluidez da lata do Hungry Tiger.

---

## 1. O que a referência faz de verdade

Medido em 05/08/2026 no `eathungrytiger.com`, não deduzido:

| Item | Valor medido |
|---|---|
| Técnica | Lottie renderizado em **canvas**, `autoplay=0`, scrubado pelo scroll |
| Arquivo | `Jar-4K.json` — 15,9 MB cru / 11,1 MB gzip |
| Conteúdo | **342 frames WebP em base64 dentro do JSON** |
| Dimensão | 1300 × 1350, 30 fps |
| Stack | Webflow IX2 + GSAP 3.11 ScrollTrigger + Lenis 0.2.28 |

O que importa: **não é vídeo**. É uma sequência de imagens baixada de uma
vez só e desenhada num canvas quadro a quadro. Por isso é fluida em
qualquer aparelho — durante o scroll não existe rede, não existe `seek`
de vídeo, só um `drawImage` por quadro.

Vídeo com `currentTime` amarrado ao scroll parece a solução óbvia e não
é: o navegador só consegue saltar para keyframes, então o movimento pula
em vez de deslizar. É o erro clássico deste efeito.

### O que copiar e o que fazer diferente

Copiar: sequência de frames + canvas + scrub.

Não copiar: 11 MB num arquivo só. A lata é vetor-friendly e opaca; um
rosto humano em WebP comprime melhor e não precisa de 342 quadros.
O alvo aqui é **~90 frames a 1440 px de largura**, servidos soltos do
bucket GCS, com duas resoluções e carregamento progressivo — mesma
sensação, cerca de 1/8 do peso.

---

## 2. Geração do rosto de referência

Um rosto sintético, não uma paciente. Evita consentimento, evita
identificar alguém e permite regerar a cena quantas vezes quiser.

**Ferramenta:** ElevenLabs Image (`gpt-image-2` ou `seedream-5-pro`),
que já é o caminho usado no hero.

### Prompt do rosto-base

```
Studio beauty portrait of a woman, early 30s, warm medium-brown Brazilian
skin tone, natural bare face, no makeup, relaxed neutral expression,
looking straight into camera, hair pulled fully back and off the face
with a clean band, bare shoulders.

Lighting: large softbox at 45 degrees camera-left, silver reflector
camera-right, gentle rim light separating the jawline. Even, clinical but
flattering — visible skin texture, real pores, no smoothing, no beauty
filter.

Background: flat, evenly lit CHROMA KEY GREEN (#00B140), completely
uniform, no gradient, no shadow falling on the background, subject
separated from background by at least one metre.

Framing: head and shoulders, centred, face occupying 60% of the frame
height, generous headroom, shot on 85mm at f/5.6, sharp throughout.

Photorealistic, 4K, neutral colour grade.
```

Guardar como `rosto-referencia-master.png`. **Este arquivo é a fonte de
verdade** — todos os vídeos partem dele para que o rosto não mude entre
as cenas.

---

## 3. Animação do procedimento

Modelo: **Seedance 2.0**, imagem→vídeo, partindo do master acima.
5 s por cena, 1080p.

Regras que valem para todas as cenas, e que precisam estar no prompt
porque o modelo tende a violá-las sozinho:

- **Só a agulha entra em quadro. Nenhuma mão, nenhum braço, nenhuma luva.**
  A agulha flutua e se move com intenção. É o pedido explícito e é o que
  dá o tom cirúrgico-abstrato em vez de vídeo de procedimento.
- **O fundo verde nunca muda de cor nem recebe sombra** — se receber, o
  recorte no chroma key vaza.
- **A cabeça não sai do enquadramento** e não gira mais que 15 graus.

### Cena A — aproximação (toxina, terço superior)

```
The camera slowly pushes in on the woman's face, from head-and-shoulders
to a tight framing on the forehead and brow. A single fine surgical
needle enters from the upper right of frame, isolated — no hand, no arm,
no glove, only the needle and syringe barrel floating with deliberate,
steady motion. The needle approaches the glabella and holds a few
centimetres from the skin.

Camera: slow dolly-in, subtle parallax, shallow depth of field pulling
focus from the needle tip to the eyes.

Lighting: studio softbox key from camera-left, silver fill, crisp
specular highlight travelling along the polished needle as it moves.

Background: flat uniform chroma key green, evenly lit, no shadows cast on
it, no colour shift.

Photorealistic, cinematic, 4K, 24fps, no text, no watermark.
```

### Cena B — o instante (flare de transformação)

Esta é a cena que faz o antes virar depois no mesmo plano. O corte não é
corte: é um clarão que cobre a troca.

```
Tight framing on the woman's forehead, the fine surgical needle held
still against the skin — no hand, no arm, no glove visible. A soft
anamorphic lens flare blooms from the needle tip and expands to fill the
frame in pure warm white light over roughly eight frames. As the light
recedes just as fast, the same face is revealed from the exact same
camera position and the same lighting, now with the forehead lines fully
relaxed and the skin smooth and luminous. The needle is gone.

Camera: locked off, absolutely no movement, so the before and after
register pixel to pixel.

Lighting: identical before and after — same key, same fill, same rim.
Only the flare changes.

Background: flat uniform chroma key green throughout, unaffected by the
flare.

Photorealistic, cinematic, 4K, 24fps, no text, no watermark.
```

> O "camera locked off" é o detalhe que faz a peça funcionar. Se a câmera
> derivar um pixel durante o flare, o antes e o depois deixam de estar
> no mesmo lugar e o olho lê como dois vídeos colados.

### Cena C — afastamento (resultado)

```
Slow pull back from the tight forehead framing to head and shoulders,
revealing the woman's full face, skin relaxed and luminous, expression
calm, a faint smile forming. No needle, no hand, no instrument in frame.

Camera: slow dolly-out with a gentle arc to camera-right, shallow depth
of field opening up.

Lighting: studio softbox key from camera-left, silver fill, rim light on
the jawline.

Background: flat uniform chroma key green, evenly lit, no shadows.

Photorealistic, cinematic, 4K, 24fps, no text, no watermark.
```

### Variantes por procedimento

Trocar só a região e o instrumento; o resto do prompt fica igual:

| Procedimento | Região | Instrumento em quadro |
|---|---|---|
| Toxina botulínica | glabela, testa, pés de galinha | agulha fina 30G |
| Preenchimento labial | lábios, vista frontal e ¾ | cânula romba |
| Bioestimulador | terço médio, malar | agulha longa |
| Perfiloplastia | mandíbula e mento, perfil | cânula |
| Mesoterapia capilar | couro cabeludo, cabelo repartido | microagulha |

---

## 4. Recorte do fundo e fatiamento

```bash
# 1. Chroma key → alpha. O similarity 0.12 é o ponto onde o verde sai
#    sem comer o contorno do cabelo; subir mais recorta fio de cabelo.
ffmpeg -i cena-b.mp4 \
  -vf "chromakey=0x00B140:0.12:0.02,despill,format=rgba" \
  -c:v png cena-b-alpha.mov

# 2. Fatiar em frames WebP com alpha, 1440px de largura (desktop)
ffmpeg -i cena-b-alpha.mov -vf "scale=1440:-2,fps=24" \
  -c:v libwebp -lossless 0 -q:v 78 -compression_level 6 \
  frames/desk/frame-%03d.webp

# 3. O mesmo em 720px (celular) — metade da largura, ~1/4 dos bytes
ffmpeg -i cena-b-alpha.mov -vf "scale=720:-2,fps=24" \
  -c:v libwebp -lossless 0 -q:v 74 -compression_level 6 \
  frames/mob/frame-%03d.webp

# 4. Subir
gsutil -m -h "Cache-Control:public, max-age=31536000, immutable" \
  cp frames/desk/*.webp gs://dra-beatriz-lima-estetica/procedimento/desk/
gsutil -m -h "Cache-Control:public, max-age=31536000, immutable" \
  cp frames/mob/*.webp  gs://dra-beatriz-lima-estetica/procedimento/mob/
```

Orçamento: 90 frames × ~18 KB = **~1,6 MB no desktop**, ~450 KB no
celular. Contra 11 MB da referência.

---

## 5. Ligar ao scroll

O projeto já tem o motor: `src/lib/fundo-vivo.ts` faz scrub de sequência
em canvas, e o `Hero.astro` já consome `data-frames-base` /
`data-frames-total`. Não escrever um segundo driver — os dois divergiriam,
que é exatamente o erro registrado na ADR revogada do `index.astro`.

O que falta para reaproveitar:

1. Escolher a pasta pela largura da tela na hora de montar a URL base
   (`mob/` abaixo de 768 px, `desk/` acima). A decisão é uma vez, na
   inicialização — trocar de conjunto no meio do scroll obrigaria a
   redecodificar tudo.
2. Decodificar com `createImageBitmap` em vez de `new Image()`. O
   `ImageBitmap` já vem pronto para a GPU; o `drawImage` de um `<img>`
   paga decodificação no primeiro quadro em que aparece, e é ali que
   nasce o engasgo.
3. Carregar em duas ondas: primeiro 1 a cada 4 frames (a animação já roda
   inteira, grosseira), depois os intermediários. A peça fica utilizável
   em ~400 KB e refina sozinha.
4. `prefers-reduced-motion: reduce` → não animar, mostrar o último frame
   parado. Regra do design system, não sugestão.

---

## 6. O que ainda não dá para fazer aqui

- **Upscale por IA das fotos da galeria.** Não há `GEMINI_API_KEY` no
  ambiente e o projeto GCP `project-453c8fcf-2fa3-418b-b22` responde 404
  no Vertex AI Imagen — a API não está habilitada. Com uma das duas
  coisas, o alvo é `pele-textura-depois`, a única foto com menos de
  720 px de largura nativa (635 px).
