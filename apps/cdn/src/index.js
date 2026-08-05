// CDN de mídia — Cloudflare na frente do bucket GCS.
//
// POR QUE ISTO EXISTE:
// o bucket já está em southamerica-east1 (São Paulo), que é a região
// mais próxima do Brasil que o GCP tem. Mas é UMA região. Quem acessa de
// Fortaleza, Manaus ou Belém está a ~3.000 km dela. O Cloudflare tem
// cerca de dez pontos de presença no Brasil, então o vídeo passa a sair
// de perto de quem assiste. Efeito colateral bem-vindo: o egress do GCS
// despenca, porque depois do primeiro acesso em cada ponto o bucket nem
// é consultado.
//
// ---------------------------------------------------------------
// A FAIXA DE BYTES É O TUDO OU NADA DESTE ARQUIVO
// ---------------------------------------------------------------
// Todo seek do scrub é um `Range: bytes=X-Y`. Se este Worker responder
// 200 com o arquivo inteiro em vez de 206 com a faixa, cada seek passa a
// baixar 2,8 MB e o scrub morre no celular.
//
// A PRIMEIRA VERSÃO DESTE ARQUIVO FEZ EXATAMENTE ISSO. Ela montava
// `new Response(resposta.body, { status, headers })` com um objeto de
// init construído à mão, apostando que `cacheEverything: true` faria a
// borda fatiar sozinha. Medido logo depois do deploy:
//
//     curl -H "Range: bytes=1000000-1010000"
//     -> HTTP/2 200, content-length: 2822882      (errado)
//
// Duas correções, e as duas importam:
//
// 1. O header Range do cliente É REPASSADO à origem. O GCS responde 206
//    nativamente — medido: `content-range: bytes 1000000-1010000/2822882`,
//    10.001 bytes. Não há motivo para reimplementar na borda o que a
//    origem já faz certo.
// 2. A resposta é remontada com `new Response(res.body, res)`, passando a
//    RESPOSTA ORIGINAL como init. Assim status 206, Content-Range e
//    Content-Length sobrevivem. Passar um objeto literal, como a v1
//    fazia, descarta tudo isso em silêncio.

const ORIGEM = "https://storage.googleapis.com/dra-beatriz-lima-estetica";

/** Só estes prefixos são espelhados. Sem isto o Worker vira proxy
 *  aberto: qualquer um usaria o nosso hostname para servir outro objeto
 *  do bucket, ou para mascarar tráfego atrás do nosso domínio. */
// `rosto/` é a convenção dos vídeos por procedimento (contrato em
// dados/galeria/procedimentos.json, campo base_rosto). A pasta já existe
// no bucket e estava FORA desta lista — os rostos, quando entrassem,
// tomariam 404 da borda. Achado ao medir, não em revisão.
const PREFIXOS_PERMITIDOS = ["v1/", "v2/", "galeria/", "procedimento/", "rosto/"];

/** Os objetos já sobem com Cache-Control immutable, e o nome do arquivo
 *  muda quando o conteúdo muda. A borda pode guardar por muito tempo. */
const TTL_BORDA = 60 * 60 * 24 * 30; // 30 dias

export default {
  async fetch(pedido) {
    const url = new URL(pedido.url);
    const caminho = url.pathname.replace(/^\/+/, "");

    if (pedido.method !== "GET" && pedido.method !== "HEAD") {
      return new Response("Método não permitido", { status: 405 });
    }

    // `..` sairia do prefixo autorizado depois da normalização do outro lado.
    if (caminho.includes("..")) {
      return new Response("Caminho inválido", { status: 400 });
    }

    if (!PREFIXOS_PERMITIDOS.some((p) => caminho.startsWith(p))) {
      return new Response("Não encontrado", { status: 404 });
    }

    // A borda guarda SEMPRE o objeto inteiro. Uma entrada de cache por
    // arquivo, não uma por faixa — senão o mesmo vídeo ocuparia dezenas
    // de entradas e a taxa de acerto despencaria.
    const resposta = await fetch(`${ORIGEM}/${caminho}`, {
      cf: {
        cacheEverything: true,
        cacheTtl: TTL_BORDA,
        cacheTtlByStatus: { "200-299": TTL_BORDA, 404: 60, "500-599": 0 },
      },
    });

    if (!resposta.ok) {
      return new Response("Não encontrado", { status: resposta.status });
    }

    const comuns = {
      "cache-control": `public, max-age=${TTL_BORDA}, immutable`,
      "accept-ranges": "bytes",
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "content-range, content-length, accept-ranges",
      "content-type": resposta.headers.get("content-type") ?? "application/octet-stream",
      "x-origem-cdn": "cloudflare-gcs",
    };

    const faixa = pedido.headers.get("range");
    if (!faixa || pedido.method === "HEAD") {
      return new Response(pedido.method === "HEAD" ? null : resposta.body, {
        status: 200,
        headers: comuns,
      });
    }

    // ---------------------------------------------------------------
    // O CORTE, FEITO AQUI E NÃO DELEGADO À BORDA
    // ---------------------------------------------------------------
    // Duas versões deste arquivo apostaram que o Cloudflare fatiaria
    // sozinho: a primeira reconstruindo a Response, a segunda repassando
    // o header Range à origem. As duas devolveram 200 com 2,8 MB, medido
    // com curl logo depois de cada deploy. Num HIT de cacheEverything a
    // borda serve o objeto inteiro e ignora a faixa.
    //
    // Então o corte é explícito. O custo é ler o objeto já quente do
    // cache e devolver um pedaço — rede zero para a origem, e o
    // comportamento deixa de depender de detalhe não documentado.
    const bytes = new Uint8Array(await resposta.arrayBuffer());
    const total = bytes.byteLength;

    const m = /^bytes=(\d*)-(\d*)$/.exec(faixa.trim());
    if (!m) {
      return new Response("Faixa inválida", {
        status: 416,
        headers: { ...comuns, "content-range": `bytes */${total}` },
      });
    }

    // `bytes=-500` significa os ÚLTIMOS 500, não do zero ao 500. Errar
    // isto entrega o começo do arquivo quando o player pediu o fim (e é
    // no fim que fica o índice de alguns contêineres).
    let inicio;
    let fim;
    if (m[1] === "") {
      const sufixo = Number(m[2]);
      inicio = Math.max(0, total - sufixo);
      fim = total - 1;
    } else {
      inicio = Number(m[1]);
      fim = m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1);
    }

    if (!(inicio >= 0) || inicio > fim || inicio >= total) {
      return new Response("Faixa fora do arquivo", {
        status: 416,
        headers: { ...comuns, "content-range": `bytes */${total}` },
      });
    }

    return new Response(bytes.subarray(inicio, fim + 1), {
      status: 206,
      headers: {
        ...comuns,
        "content-range": `bytes ${inicio}-${fim}/${total}`,
        "content-length": String(fim - inicio + 1),
      },
    });
  },
};
