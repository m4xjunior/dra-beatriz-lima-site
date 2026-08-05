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

Background: flat, evenly lit CHROMA KEY BLUE (#0047BB), completely
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

## 2b. Por que azul e não verde

Decidido em 05/08/2026, contra a primeira versão desta spec.

Verde fica ao lado do amarelo e do laranja no espectro, que é exatamente
onde vive o tom de pele. O verde reflete na pele, o `despill` tenta
tirar, e leva junto a saturação do rosto — a pessoa sai acinzentada. Pele
quase não tem azul, então o key separa limpo sem tocar no tom.

A agulha piora o caso do verde: aço polido espelha o fundo inteiro.

**Valor medido**, não estimado: o Seedance 2.0 pedido em "blue screen"
entrega `#0006F9` (0, 6, 249), com variação de ±2 em todo o quadro.
Medido sobre `ElevenLabs_video_seedance-2-0_The burger rota_2026-08-04.mp4`,
que o Max gerou como teste. É azul digital praticamente puro, uniforme o
bastante para keyar com tolerância apertada.

Formato nativo de saída daquele teste: **496×864 (9:16), 24 fps, 10 s,
241 quadros**. Contagem da mesma ordem da lata do Hungry Tiger (342), o
que confirma que o material sai pronto para o scrub sem reamostragem.

---

## 3. Animação do procedimento

Modelo: **Seedance 2.0**, imagem→vídeo, partindo do master acima.
Saída nativa medida no teste do Max: 496×864 (9:16), 24 fps, 10 s.

Regras que valem para todas as cenas, e que precisam estar no prompt
porque o modelo tende a violá-las sozinho:

- **Só a agulha entra em quadro. Nenhuma mão, nenhum braço, nenhuma luva.**
  A agulha flutua e se move com intenção. É o que dá o tom
  cirúrgico-abstrato em vez de vídeo de procedimento.
- **O fundo azul nunca muda de cor nem recebe sombra** — se receber, o
  recorte vaza.
- **Pele com textura visível e poro real**, sem suavização. É a diferença
  entre parecer clínica e parecer filtro.

### O problema do plano travado

A primeira versão desta spec pedia `camera locked off` na cena da
transformação, para o antes e o depois registrarem pixel a pixel. O Max
recusou, com razão: o resultado é institucional e morto.

A saída não é escolher entre as duas coisas. É fazer a câmera **manter a
mesma trajetória atravessando o flare**. O match acontece dentro de um
movimento contínuo, e o olho aceita porque o movimento nunca parou. É
como match-cut de verdade funciona. O que precisa ser idêntico dos dois
lados do clarão não é a posição da câmera: é a **velocidade e a direção**.

### Cena A — descida e aproximação

```
Slow cinematic crane-down from above the woman's head, descending into a
tight three-quarter framing on her forehead and brow, the move
decelerating into stillness. As the camera settles, a single fine
surgical needle glides in from the upper right of frame — isolated,
floating, no hand, no arm, no glove, only the polished needle and syringe
barrel moving with deliberate surgical intent. It approaches the glabella
and holds two centimetres from the skin.

Camera: crane down on a jib arm, easing out, combined with a slow 15
degree orbital drift to camera-left. Shallow depth of field, rack focus
pulling from her eyes to the needle tip as it enters. Subtle handheld
micro-float, never shaky.

Lighting: large softbox key at 45 degrees camera-left, silver fill
camera-right, hard rim light carving the jawline. A crisp specular
highlight travels the length of the polished needle as it moves.

Background: flat, evenly lit PURE DIGITAL BLUE (#0000FF) blue screen,
completely uniform, no gradient, no shadow cast on it, no colour shift.

Photorealistic skin with visible texture and real pores, no smoothing, no
beauty filter. Anamorphic, cinematic, 4K, 24fps. No text, no watermark.
```

### Cena B — o instante (flare de transformação)

A cena principal. O antes vira depois no mesmo plano, sem corte.

```
Continuous slow orbital arc around the woman's head, travelling from
three-quarter left toward frontal at a constant speed, a fine surgical
needle held against the glabella — isolated, floating, no hand, no arm,
no glove.

At the midpoint of the arc a warm anamorphic lens flare blooms from the
needle tip, streaking horizontally across the frame and blowing out to
white over roughly eight frames. The camera never stops — it continues
the same arc at the same speed straight through the light. As the flare
recedes just as fast, the move resolves on her face with the forehead
lines fully relaxed, skin smooth and luminous. The needle is gone.

Camera: uninterrupted 40 degree orbit on a motion-control arm, constant
velocity, no stop and no reframe across the flare. Shallow depth of
field. A gentle speed ramp slows time as the flare peaks, then returns to
normal speed as it clears.

Lighting: identical before and after the flare — same key, same fill,
same rim, same colour temperature. Only the flare changes. Volumetric
haze catching the light.

Background: flat, evenly lit PURE DIGITAL BLUE (#0000FF) blue screen
throughout, completely uniform, unaffected by the flare, no shadow, no
colour shift.

Photorealistic skin with visible texture and real pores, no smoothing, no
beauty filter. Anamorphic, cinematic, 4K, 24fps. No text, no watermark.
```

> O que faz a peça funcionar é o **constant velocity, no stop across the
> flare**. Se o modelo parar a câmera para trocar o rosto, o clarão vira
> emenda visível e o plano lê como dois vídeos colados.

### Cena C — afastamento (resultado)

```
Slow cinematic pull-back and crane-up from the tight forehead framing,
opening to head and shoulders and revealing the woman's full face — skin
relaxed and luminous, expression calm, a faint smile forming. No needle,
no hand, no instrument anywhere in frame.

Camera: dolly-out on a curved track arcing to camera-right while craning
up, accelerating gently out of the move. Depth of field opening as the
lens pulls back, focus holding on her eyes throughout.

Lighting: large softbox key at 45 degrees camera-left, silver fill, rim
light on the jawline, a soft kiss of light building on her cheekbone as
the camera rises.

Background: flat, evenly lit PURE DIGITAL BLUE (#0000FF) blue screen,
completely uniform, no shadow, no colour shift.

Photorealistic skin with visible texture and real pores, no smoothing, no
beauty filter. Anamorphic, cinematic, 4K, 24fps. No text, no watermark.
```

### Cena D — órbita de vitrine (a que vira o scrub do hero)

O equivalente exato do teste do hambúrguer, aplicado ao rosto. É esta que
vira sequência de frames scrubada pelo scroll.

```
The woman's head and shoulders float centred in frame, rotating slowly
and continuously on a vertical axis through a full 360 degrees, like a
product on a turntable. Nothing supports her. Expression calm and
neutral, eyes open, hair pulled back off the face.

Camera: completely static, centred, 85mm equivalent — the subject does
all the movement. Constant rotation speed with no easing, so the loop is
seamless end to end.

Lighting: large softbox key at 45 degrees camera-left, silver fill
camera-right, hard rim light that travels around the jaw and cheekbone as
she turns, specular highlights sliding across the skin.

Background: flat, evenly lit PURE DIGITAL BLUE (#0000FF) blue screen,
completely uniform, no gradient, no shadow, no colour shift.

Photorealistic skin with visible texture and real pores, no smoothing, no
beauty filter. Cinematic, 4K, 24fps, 10 seconds. No text, no watermark.
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

Tudo abaixo foi **testado no vídeo real** que o Max gerou
(`ElevenLabs_video_seedance-2-0_The burger rota_2026-08-04.mp4`), não
deduzido. Os valores são os que passaram.

### A erosão do matte não é opcional

`chromakey` + `despill` sozinhos deixam uma **orla azul de 1 px** no
contorno. Conferido compondo sobre magenta: a linha azul aparece em volta
do pão inteiro. Mexer no `blend` não resolve — testei 0.02, 0.10 e 0.18 e
a orla continua igual, porque o pixel culpado é a borda anti-aliased, não
o fundo.

O que resolve é encolher o matte em 1 px e suavizar: `alphaextract` →
`erosion` → `alphamerge`. Com isso a borda fica limpa.

```bash
# 1. Chroma key AZUL + erosão do matte → alpha limpo.
#    0x0006F9 é o azul MEDIDO na saída do Seedance. Como o fundo varia
#    só ±2 em todo o quadro, a tolerância fica apertada (0.10); no verde
#    ela precisaria ser frouxa e comeria fio de cabelo.
ffmpeg -i cena-b.mp4 -filter_complex "\
  chromakey=0x0006F9:0.10:0.05,despill=type=blue,format=rgba,split[a][b];\
  [a]alphaextract,erosion,erosion,boxblur=1:1[m];\
  [b][m]alphamerge" \
  -c:v png cena-b-alpha.mov

# 2. CONFERIR antes de fatiar. Magenta é o pior fundo possível para
#    resto de azul — se passar aqui, passa em qualquer lugar.
ffmpeg -f lavfi -i color=magenta:s=810x1412 -i cena-b-alpha.mov \
  -filter_complex "[0][1]overlay=shortest=1" -frames:v 1 /tmp/conferir.png

# 3. Fatiar. O `-resize L 0` do cwebp preserva a proporção sozinho.
ffmpeg -i cena-b-alpha.mov quadros/f-%03d.png
for p in quadros/*.png; do
  cwebp -quiet -q 72 -m 6 -alpha_q 85 -resize 810 0 "$p" \
    -o "frames/desk/$(basename ${p%.png}).webp"
done

# 4. Subir
gsutil -m -h "Cache-Control:public, max-age=31536000, immutable" \
  cp frames/desk/*.webp gs://dra-beatriz-lima-estetica/procedimento/desk/
```

### Orçamento — medido, não estimado

Uma versão anterior desta spec dizia "~1,6 MB". Estava errada, era
estimativa. Os 241 quadros do teste, com alpha:

| Largura | Qualidade | Taxa | Quadros | Média | **Total** |
|---|---|---|---|---|---|
| 1440 px | q78 | 24 fps | 241 | 132,1 KB | **31,09 MB** |
| 900 px | q70 | 12 fps | 121 | 63,8 KB | **7,54 MB** |
| **810 px** | **q72** | **12 fps** | **121** | **56,9 KB** | **6,72 MB** |
| 720 px | q68 | 12 fps | 121 | 47,1 KB | **5,56 MB** |
| 810 px | q64 | 8 fps | 81 | 53,2 KB | **4,21 MB** |

Escolha: **810 px, q72, 1 quadro a cada 2**. Fica abaixo dos 11 MB da
referência e o scrub não precisa de 24 fps — quem dita a cadência é o
scroll, e 121 quadros ao longo de uma viewport inteira já passa da
resolução do gesto.

1440 px está fora de questão: 31 MB para um hero é o triplo da
referência, num site cujo público chega por celular.

**Ressalva:** o hambúrguer é o pior caso de textura (gergelim, alface,
relevo em cada pixel). Um rosto em plano fechado tem áreas grandes de
pele lisa e deve comprimir melhor. Remedir quando o vídeo real existir,
com o mesmo comando, antes de fixar a largura.

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
