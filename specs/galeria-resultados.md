# Galeria de resultados — spec para o site em Next.js

Escrito pela sessão da galeria (05/08/2026) para a **s000** implementar no
`apps/web`. Os assets já estão no GCS e o manifest já existe — nada aqui
precisa ser gerado de novo.

Referência funcional pronta, em Astro, para consultar a lógica:
`apps/site/src/components/AntesDepois.astro` e
`apps/site/src/components/secoes/Resultados.astro`.

---

## 1. Dados

**Manifest:** `apps/site/src/content/galeria/manifest.json` (mover ou
importar; o conteúdo é agnóstico de framework).

**Interruptor editorial:** `apps/site/src/content/galeria/publicacao.json`.
Fontes separadas de propósito — o manifest é regerado pelo script e
sobrescreveria a decisão editorial se fossem o mesmo arquivo.

**Base pública:**
`https://storage.googleapis.com/dra-beatriz-lima-estetica/galeria/`
(48 arquivos, 1,7 MB, `Cache-Control: immutable`, CORS `*`).

Sete itens, cada um com `lados.antes` + `lados.depois` (ou `lados.unico`),
e cada lado com derivados WebP + AVIF em duas larguras:

| slug | proporção | procedimento |
|---|---|---|
| `toxina-frontal` | 0,75 | toxina botulínica |
| `labial-perfil` | 0,50 | preenchimento labial |
| `perfiloplastia-contorno` | 1,2537 | perfiloplastia |
| `pele-textura` | 0,5619 | peelings |
| `labial-frontal` | 2,00 | preenchimento labial |
| `full-face-terco-medio` | 1,5969 | preenchimentos full face |
| `pele-renovada` | 0,5625 | limpeza de pele (peça única, não separar) |

Regerar tudo: `python3 scripts/galeria/processar.py` + `gsutil -m cp` (o
script imprime o destino).

---

## 2. As três decisões que precisam sobreviver à portagem

### 2.1 A moldura é uniforme, a foto é íntegra

As fotos originais têm sete proporções diferentes. Num grid isso vira
mosaico irregular, que foi recusado explicitamente.

A saída **não é cortar todas para um formato só** — cortar destrói pixel
e, em foto clínica, muda o que a paciente vê. É fixar a moldura do cartão
em `aspect-ratio: 4/5` e deixar cada foto preencher com
`object-fit: cover` ancorado no `foco` que o manifest traz por item.
Cartões idênticos, zero distorção, recorte ajustável depois num campo em
vez de num arquivo reprocessado.

No comparador em página cheia a proporção volta a ser a real da foto
(campo `proporcao`), aplicada inline para reservar o espaço antes de a
imagem chegar. CLS zero.

### 2.2 A cortina recorta só a camada de cima

`antes` fica por baixo, inteiro. `depois` por cima com
`clip-path: inset(0 0 0 var(--corte))`.

Recortar só a camada de cima significa que a de baixo nunca é repintada
durante o arraste — o navegador recompõe um clip, sem layout e sem
redecodificar imagem. É o que segura 60fps num celular modesto.
Trocar `width` ou `left` por `clip-path` derruba isso.

A posição vai numa custom property (`--corte`), não em `style.clipPath`:
o fio e a camada leem o mesmo valor, uma escrita, dois efeitos, sem risco
de dessincronizar. Escrever dentro de `requestAnimationFrame` — num
arraste chegam mais eventos de ponteiro que quadros.

### 2.3 O controle é um `<input type="range">` de verdade

Transparente (`opacity: 0`, nunca `display: none`), por cima de tudo,
ocupando o cartão inteiro. Teclado e leitor de tela funcionam sem
nenhum JS. O script só existe para o gesto pegar em qualquer ponto do
cartão, porque o polegar nativo é invisível.

---

## 3. Regulatório — não é detalhe de UI

REVOGA a decisão anterior do projeto de nunca publicar antes/depois.
A CFBM Res. 330/2020 condiciona, não proíbe: exige consentimento escrito
e específico, veda promessa de resultado e veda uso como chamariz.

Portanto, no schema do site novo:

- `publicado` nasce **false**;
- só é aceito `true` junto com `consentimento: { obtido, data, referencia }`,
  onde `referencia` é o nº do termo no prontuário;
- em dev, item não publicado renderiza marcado como **PRÉVIA**;
  em produção não entra no HTML.

A trava é o tipo, não a memória de quem edita. Hoje os sete estão
`false` — em produção a galeria renderiza vazia até os termos existirem.
Isso é o comportamento correto, não um bug.

O `<Disclaimer>` padrão continua obrigatório na dobra.

---

## 4. Pendência conhecida

`pele-textura-depois` tem 635 px de largura nativa, contra 1200 px dos
irmãos — vai parecer mais mole no cartão. Upscale por IA não foi
possível: sem `GEMINI_API_KEY` no ambiente e o projeto GCP
`project-453c8fcf-2fa3-418b-b22` responde 404 no Vertex AI Imagen (API
não habilitada).
