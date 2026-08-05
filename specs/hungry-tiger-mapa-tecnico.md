# Mapa técnico — eathungrytiger.com

Levantamento feito sobre a captura de `/tmp/eht.html` (HTML publicado em 18/09/2025), o
`/tmp/jar.json` (o pote), o CSS `hungry-tiger.webflow.shared.bb04e25ad.min.css` e os chunks
do runtime da Webflow. Todos os números abaixo foram medidos, nenhum estimado.

## 1. Stack

| Camada | O que é | Evidência |
|---|---|---|
| Build/CMS | **Webflow** (site `683fa5578c4365b4bb69fade`, página `683fa5578c4365b4bb69faf1`) | `data-wf-site`, `<meta name="generator" content="Webflow">` |
| E-commerce | **Webflow Ecommerce** nativo + **Stripe** | `w-commerce-commerceaddtocartform`, `js.stripe.com/v3/` |
| Scroll | **Lenis 0.2.28** (studio-freight), via jsDelivr | `cdn.jsdelivr.net/gh/studio-freight/lenis@0.2.28` |
| Animação de texto | **GSAP 3.11.3 + ScrollTrigger + SplitType** | `cdnjs` + `unpkg.com/split-type` |
| Animação do pote | **Lottie (runtime da Webflow) dirigido por IX2** | `data-animation-type="lottie"` + `data-is-ix2-target="1"` |
| Utilidades | Finsweet Attributes v2 (só `fs-copyclip`), jQuery 3.5.1 (dependência da Webflow) | `@finsweet/attributes@2` |
| Imagens | **AVIF** em quase tudo — 97 referências `.avif` contra 50 tags `<img>` | grep no HTML |
| Vídeo | **nenhum** — zero tags `<video>` na página | grep no HTML |

Não há React, Next, three.js, WebGL nem Rive. O site é HTML estático da Webflow com três
bibliotecas soltas por cima.

## 2. O pote — a peça central

O `Jar-4K.json` servido pelo CDN tem **15.909.852 bytes**, exatamente o tamanho do
`/tmp/jar.json`. É o mesmo arquivo.

### O que ele é por dentro

```
versão Lottie : 5.12.2
dimensões     : 1300 × 1350
fps           : 30      →  342 frames  =  11,40 s de animação
assets        : 342
layers        : 342
```

Cada layer é `ty: 2` (tipo imagem), vive **exatamente 1 frame** (`ip: N`, `op: N+1`) e
aponta pra um asset diferente. Nenhum layer tem vida diferente de 1 frame. As únicas
propriedades de transformação são posição e âncora fixas no centro (`[650, 675]`) — não há
uma única keyframe de rotação, escala ou path.

**Ou seja: não é animação vetorial.** É uma sequência de 342 imagens de tela cheia
empacotada dentro de um contêiner Lottie. O render 3D do pote girando foi feito fora
(Blender/C4D), exportado frame a frame, e o Lottie virou só o player.

### O detalhe que engana

Os assets estão declarados como `data:image/jpeg;base64,...`, mas os bytes reais começam com
`RIFF....WEBP`. **São WebP com mime errado.** O navegador ignora o rótulo e decodifica pelo
conteúdo, então funciona; mas qualquer ferramenta que confie no mime vai tratar errado.

Também: o arquivo se chama `Jar-4K.json` e a composição interna se chama `Jar_2K_00000`, com
1300×1350 de resolução. O nome do arquivo mente.

### Peso real

| Medida | Valor |
|---|---|
| Frames WebP decodificados | 11,31 MB |
| JSON com base64 (o que o CDN entrega cru) | 15,17 MB |
| Depois de gzip | **10,63 MB** |
| Por frame | mín 21 KB · médio 34 KB · máx 55 KB |

O base64 infla 33% e o gzip devolve só parte disso, porque WebP já vem comprimido.

## 3. A lógica do scrub

Onde está o código: nos chunks do runtime da Webflow, não no HTML. O adaptador de plugin
Lottie do IX2 (`webflow.achunk.576b8a98db5a86f0.js`) faz três coisas:

```js
// criação da instância
createPluginInstance = e => {
  const t = window.Webflow.require("lottie");
  const n = t.createInstance(e);
  n.stop();          // nunca toca sozinho
  n.setSubframe(true); // permite frame fracionário
  return n;
}

// render, chamado a cada tick do scroll
renderPlugin = (e, t, n) => {
  const r = t[n.actionTypeId].value / 100;  // progresso 0..1
  e.goToFrame(e.frames * r);                // mapeia direto pro frame
}
```

O elemento no HTML declara o resto:

```html
<div class="j_p"
     data-is-ix2-target="1"
     data-w-id="54299a23-8eaf-8b9d-e36e-8a24cb67c788"
     data-animation-type="lottie"
     data-src=".../68480d5f287420e67c336903_Jar-4K.json"
     data-autoplay="0"        ← não toca sozinho
     data-loop="0"
     data-renderer="canvas"   ← canvas, não SVG
     data-loading="eager">    ← baixa antes de tudo
</div>
```

**A cadeia completa, do dedo até o pixel:**

1. Roda de scroll / trackpad → Lenis intercepta, cancela o scroll nativo e interpola a
   posição com `duration: 1.2` e easing exponencial (`1.001 - 2^(-10t)`), dentro de um loop
   `requestAnimationFrame` próprio.
2. Lenis escreve a posição interpolada → dispara evento de scroll.
3. IX2 (interação contínua "While Scrolling in View") lê o progresso e normaliza em 0–100.
4. `renderPlugin` converte pra `frames * progresso` e chama `goToFrame`.
5. Com `setSubframe(true)`, o valor pode ser fracionário (ex.: frame 187,4) — o Lottie
   arredonda pra imagem mais próxima, mas a curva de entrada continua contínua.
6. O renderer **canvas** desenha o WebP já decodificado. Um `drawImage`, sem layout,
   sem reflow, sem recalcular estilo.

### Por que fica tão fluido

Quatro decisões somadas, nessa ordem de importância:

1. **Zero cálculo por frame.** Não há geometria, iluminação nem interpolação de path. Cada
   frame já é um pixel pronto. O custo por quadro é um `drawImage`, o que o navegador faz
   com folga em 120 Hz.
2. **Lenis desacopla o input do render.** O scroll nativo do macOS/Windows chega em degraus
   irregulares. Lenis transforma esses degraus numa função contínua amostrada no rAF, então
   o pote nunca recebe um salto bruto — recebe uma curva.
3. **`data-loading="eager"` + `preconnect`.** Os 10,6 MB começam a baixar antes de qualquer
   outra coisa. O site aposta em pagar a conta toda no começo pra nunca gaguejar depois.
4. **`position: fixed` em vez de pin com JS.** O contêiner não é "pinado" por ScrollTrigger:

   ```css
   .jar_motion { position: fixed; inset: 0%; width: 100vw; height: 100vh;
                 z-index: 50; display: flex; overflow: hidden }
   .box_motion { width: 38em; height: 41em }
   .j_p        { width: 100%; height: 100%; object-fit: cover;
                 transform: scale(1.5) translateY(20em) }
   ```

   O canvas fica preso ao viewport por CSS puro. Nenhum JS reposiciona nada a cada quadro,
   então não existe a classe de jitter que aparece quando o pin é calculado em JS.

O preço disso é o download. 10,6 MB só pro pote, antes de qualquer imagem da página.

### Mobile

Uma única media query mexe no pote:

```css
@media screen and (max-width: 479px) {
  .j_p        { transform: none }
  .box_motion { width: 100vw; height: 50vh; margin-bottom: 5.3em;
                transform: translateY(5em) }
}
```

Tira o `scale(1.5)`, encolhe a caixa pra meia tela. **Não há fallback de peso** — o celular
baixa os mesmos 10,6 MB. Nem há `prefers-reduced-motion` no CSS do site (o IX2 tem suporte
interno via `data-wf-ix-vacation`, mas o atributo não está no `<body>`).

## 4. As outras animações

### Texto revelado palavra a palavra (GSAP + SplitType)

```js
let typeSplit = new SplitType("[text-split]", { types: "words, chars", tagName: "span" });

$("[scrub-each-word]").each(function () {
  let tl = gsap.timeline({
    scrollTrigger: { trigger: $(this), start: "top 90%", end: "top center", scrub: true }
  });
  tl.from($(this).find(".word"), {
    opacity: 0.2, duration: 0.2, ease: "power1.out", stagger: { each: 0.4 }
  });
});
gsap.set("[text-split]", { opacity: 1 }); // mata o FOUC
```

Cada palavra sai de `opacity: 0.2` até 1, escalonadas. `scrub: true` amarra ao scroll em vez
de tocar de uma vez.

### Header que inverte (mix-blend-mode)

```js
const sections = document.querySelectorAll("#tradition, #newsletter");
// se o meio do viewport está dentro da seção → header.classList.add("difference")
```

```css
.header            { position: fixed; z-index: 999; mix-blend-mode: normal }
.header.difference { mix-blend-mode: difference }
```

O header não troca de cor — ele passa a inverter o que está atrás. Funciona sobre qualquer
fundo sem precisar saber qual é. O listener é `window.addEventListener("scroll")` puro, sem
throttle e sem `requestAnimationFrame`, mas o corpo é barato o bastante pra não pesar.

### Detecção de SO (só pra tipografia/scrollbar)

```js
document.body.classList.add(isMac ? 'mac' : 'windows');
```

### Add to cart fora do form da Webflow

```js
// botão custom com data-product-id dispara o submit escondido do form nativo
const form = document.querySelector(`form[data-commerce-product-id="${productId}"]`);
form.querySelector('input[type="submit"]').click();
```

Truque pra usar botões desenhados livremente sem abrir mão do checkout da Webflow.

### Resize do Lottie

```js
Webflow.push(function() {
  window.addEventListener('resize', () => window.Webflow.require("lottie").lottie.resize());
});
```

## 5. Estrutura da página

Sete seções, nessa ordem: `hero_part` → `inside_sides` → `traditions` → `fullsize` →
`recipes` → `discount_newsletter` → `footer`. O `.jar_motion` fica fixo em `z-index: 50`
atravessando todas elas; o conteúdo passa por cima e por baixo conforme o z-index local.

Elementos fixos permanentes: `.header` (z 999), `.fixed_icons` (z 800, carrinho e jarro no
canto inferior direito), `.jar_motion` (z 50).

O CSS tem 5 `position: sticky`, 13 `position: fixed` e **zero `will-change`** — a Webflow não
emite essa propriedade, e nesse caso não faz falta porque o canvas já é sua própria camada de
composição.

## 6. O que dá pra roubar pro projeto da Dra. Beatriz

| Técnica | Vale? | Observação |
|---|---|---|
| Lenis como base do scroll | **Sim** | 3 KB, muda a percepção de tudo. Já usamos GSAP; combinam. |
| `mix-blend-mode: difference` no header | **Sim** | Resolve legibilidade sobre fundo variável sem JS de cor. |
| SplitType + scrub por palavra | **Sim** | Barato, e o efeito é o que dá "peso editorial". |
| `position: fixed` em vez de pin JS | **Sim** | Menos jitter, menos código. |
| Sequência de frames em Lottie | **Não como está** | 10,6 MB é inviável. Ver abaixo. |

**Se o pote virar referência para o hero da Dra. Beatriz**, a mesma ideia sai muito mais
barata em `<video>` + `currentTime` amarrado ao scroll, ou num sprite WebP/AVIF de resolução
menor com menos frames. 342 frames a 30 fps é overkill: 120 frames a 24 fps dão a mesma
leitura de continuidade e cortam o peso pra menos de um terço. O container Lottie aqui não
agrega nada — ele só carrega imagens.

---

*Fontes: `/tmp/eht.html`, `/tmp/jar.json`, `hungry-tiger.webflow.shared.bb04e25ad.min.css`,
`webflow.achunk.576b8a98db5a86f0.js`. Publicação do site: 18/09/2025.*
