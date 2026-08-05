// Mede o que a rubrica do s007 pontua, em vez de afirmar que funciona.
//
// Roda contra o dev server em localhost:3000. Emite JSON no fim para
// poder ser colado como evidência no placar do goal.
//
//   node scripts/medir-scrub.mjs [--mobile]
//
// O que mede:
//   1. erros de console (item "higiene React")
//   2. driver duplicado — quantos <video> e se o currentTime anda em
//      dobro depois de um remount do Strict Mode
//   3. quadros longos durante um scroll programado (item "fluidez")
//   4. bytes do caminho crítico do hero (item "peso e carga")
//   5. preconnect presente
//   6. rAF em repouso (o risco que o s007 levantou sobre o Lenis)

import { chromium, devices } from "playwright";

const MOBILE = process.argv.includes("--mobile");
const REDUZIDO = process.argv.includes("--reduzido");
const ALVO = "http://localhost:3000/";

const navegador = await chromium.launch();
const contexto = await navegador.newContext(
  MOBILE ? devices["iPhone 15 Pro"] : { viewport: { width: 1440, height: 900 } },
);
const pagina = await contexto.newPage();

const errosConsole = [];
pagina.on("console", (m) => {
  if (m.type() === "error") errosConsole.push(m.text());
});
pagina.on("pageerror", (e) => errosConsole.push(`pageerror: ${e.message}`));

const rede = [];
pagina.on("response", async (r) => {
  const u = r.url();
  if (!/storage\.googleapis\.com|localhost:3000/.test(u)) return;
  const tam = Number(r.headers()["content-length"] ?? 0);
  rede.push({ url: u.replace(/^https?:\/\//, ""), status: r.status(), bytes: tam });
});

// Regra do design system: quem pediu menos movimento não baixa um byte
// de vídeo e fica no poster. Isso estava ESCRITO e não medido — a
// diferença entre as duas coisas é o que este modo existe para fechar.
if (REDUZIDO) await pagina.emulateMedia({ reducedMotion: "reduce" });

await pagina.goto(ALVO, { waitUntil: "load" });
await pagina.waitForTimeout(2500);

// --- preconnect e estrutura ---------------------------------------
const estrutura = await pagina.evaluate(() => ({
  preconnects: [...document.querySelectorAll('link[rel="preconnect"]')].map(
    (l) => l.href,
  ),
  videos: document.querySelectorAll("video").length,
  temPalcoFixo: (() => {
    const v = document.querySelector("video");
    if (!v) return false;
    const palco = v.parentElement;
    return getComputedStyle(palco).position === "fixed";
  })(),
  alturaRolavel:
    document.documentElement.scrollHeight - window.innerHeight,
}));

// --- rAF em repouso (risco do Lenis) ------------------------------
const rafEmRepouso = await pagina.evaluate(
  () =>
    new Promise((ok) => {
      let n = 0;
      const original = window.requestAnimationFrame;
      window.requestAnimationFrame = function (cb) {
        n++;
        return original.call(window, cb);
      };
      setTimeout(() => {
        window.requestAnimationFrame = original;
        ok(n);
      }, 1000);
    }),
);

// --- quadros longos durante scroll programado ---------------------
const fluidez = await pagina.evaluate(
  () =>
    new Promise((ok) => {
      const marcas = [];
      let anterior = performance.now();
      let rodando = true;

      function passo(t) {
        marcas.push(t - anterior);
        anterior = t;
        if (rodando) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);

      const total = document.documentElement.scrollHeight - window.innerHeight;
      const inicio = performance.now();
      const DURACAO = 4000;

      function rolar(agora) {
        const k = Math.min(1, (agora - inicio) / DURACAO);
        window.scrollTo(0, total * k);
        if (k < 1) requestAnimationFrame(rolar);
        else {
          // ASSENTAR antes de medir. O Lenis interpola com duration 1.2,
          // então quando a rampa programada acaba ele ainda está a
          // caminho do alvo. A 1ª versão deste script media aqui e
          // reportava scrollFinal de 2389 num documento de 6388 — o
          // scrub estava certo, a medição é que olhava cedo demais.
          let ultimo = -1;
          let parado = 0;
          const assentar = () => {
            if (Math.abs(window.scrollY - ultimo) < 0.5) parado++;
            else parado = 0;
            ultimo = window.scrollY;
            if (parado < 8) return requestAnimationFrame(assentar);
            rodando = false;
            concluir();
          };
          requestAnimationFrame(assentar);

          function concluir() {
            setTimeout(() => {
            const v = document.querySelector("video");
            marcas.sort((a, b) => a - b);
            const p = (q) => marcas[Math.floor(marcas.length * q)] ?? 0;
            ok({
              quadros: marcas.length,
              longosAcima50ms: marcas.filter((m) => m > 50).length,
              longosAcima100ms: marcas.filter((m) => m > 100).length,
              medianaMs: Number(p(0.5)?.toFixed(2)),
              p95Ms: Number(p(0.95)?.toFixed(2)),
              piorMs: Number(marcas[marcas.length - 1]?.toFixed(2)),
              videoCurrentTime: Number(v?.currentTime?.toFixed(3) ?? -1),
              videoDuration: Number(v?.duration?.toFixed(3) ?? -1),
              scrollFinal: window.scrollY,
              scrollTotal: total,
              percorridoPct: Number(((window.scrollY / total) * 100).toFixed(1)),
              videoPct: Number(((v.currentTime / v.duration) * 100).toFixed(1)),
            });
            }, 300);
          }
        }
      }
      requestAnimationFrame(rolar);
    }),
);

// --- volta ao topo: o scrub tem que ANDAR PARA TRÁS ---------------
await pagina.evaluate(() => window.scrollTo(0, 0));
await pagina.waitForTimeout(1200);
const reversivel = await pagina.evaluate(() => {
  const v = document.querySelector("video");
  return { currentTimeNoTopo: Number(v?.currentTime?.toFixed(3) ?? -1) };
});

const hero = rede.filter((r) => /scrub_video|poster/.test(r.url));
const bytesHero = hero.reduce((s, r) => s + r.bytes, 0);

await pagina.screenshot({
  path: MOBILE ? "scripts/_saida/mobile.png" : "scripts/_saida/desktop.png",
  fullPage: false,
});

console.log(
  JSON.stringify(
    {
      perfil: MOBILE ? "mobile (iPhone 15 Pro)" : "desktop 1440x900",
      errosConsole,
      estrutura,
      rafEmRepousoPorSegundo: rafEmRepouso,
      fluidez,
      reversivel,
      heroBytes: bytesHero,
      heroMB: Number((bytesHero / 1048576).toFixed(2)),
      heroArquivos: hero,
    },
    null,
    2,
  ),
);

await navegador.close();
