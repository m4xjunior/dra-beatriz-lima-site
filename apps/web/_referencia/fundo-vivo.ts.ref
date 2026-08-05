// fundo-vivo — driver ÚNICO do vídeo de fundo comandado pelo scroll.
//
// Até 25/07/2026 este código existia duplicado e divergente em dois
// lugares (pages/index.astro com breakpoint 920px/clamp 0.04 e
// components/FundoVivo.astro com 899px/clamp 0.05). Agora é um módulo
// só; quem renderiza a marcação chama iniciarFundoVivo().
//
// ADR (24/07/2026, preservada): a 1ª arquitetura scrubava 145 frames
// WebP em canvas (padrão Apple) e foi reprovada em uso real — decode de
// bitmap grande por frame travava até em M4 Pro. Aqui é <video> nativo:
// decode por HARDWARE. Os *-scrub.mp4 têm GOP de 4 sem B-frames, o que
// torna o seek bidirecional barato.
//
// ---------------------------------------------------------------
// POR QUE A v4 TRAVAVA NO ANDROID (defeito corrigido nesta v5)
// ---------------------------------------------------------------
// A v4 perseguia o alvo com intervalo mínimo fixo e teto de passo:
//
//     const intervaloMinimo = toque ? 90 : 0;    // ~11 seeks/s
//     const capPasso        = toque ? 0.05 : 0.09;
//     video.currentTime += clamp(delta * 0.32, ±capPasso);
//
// Em toque isso limita o avanço a 0,05s de vídeo a cada 90ms = 0,55× a
// velocidade real. Como os 9,042s do clipe estão mapeados na altura
// INTEIRA da página, um fling de meio segundo exige 9s de avanço — que
// a esse teto levaria ~16 segundos. O vídeo nunca alcançava o dedo, e o
// timer de 900ms mandava play() enquanto ele ainda corria atrás: o
// "não é controlado gradualmente, ela segue em play" relatado em uso.
//
// A v5 troca o teto por uma FILA DE UM SEEK mirando sempre o alvo mais
// recente. Isso auto-regula pela capacidade real do decoder: aparelho
// rápido faz muitos seeks/s, aparelho lento faz menos — mas os dois
// sempre pousam no frame da posição ATUAL do scroll em vez de rastejar
// atrás dela. Pular frames intermediários é o comportamento correto de
// um scrub: o que o usuário percebe é o frame certo sob o dedo.
//
// Nada de rAF. O ciclo é todo por evento (scroll inicia, o frame
// apresentado encadeia o próximo seek), então em repouso o custo de JS
// por frame é exatamente zero — a v4 mantinha um requestAnimationFrame
// girando a 60–120Hz pela vida inteira da página, mesmo parada.

/** Sinal de "o frame pedido apareceu na tela" — melhor que 'seeked',
 *  que dispara quando o decoder terminou, não quando o compositor
 *  apresentou. Chrome/Android e Safari 15.4+ têm; o resto cai no
 *  fallback. */
type VideoComRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
};

type Conexao = { effectiveType?: string; saveData?: boolean };

/** Folga do fim: pedir exatamente `duration` devolve frame preto em
 *  alguns decoders. */
const MARGEM_FIM = 0.05;

/** Abaixo disto o frame na tela já é o frame do scroll — 1/10 de frame
 *  a 24fps. Pedir um seek menor que isso é trabalho jogado fora. */
const TOLERANCIA_SEEK = 0.004;

/** Erro máximo aceito para considerar o scrub "alcançado" (~1 frame). */
const CONVERGIDO = 0.05;

/** Silêncio de scroll antes de devolver o play automático. */
const PAUSA_ANTES_DE_TOCAR = 1200;

/** Se o decoder engasgar e o sinal de frame nunca vier, a fila ficaria
 *  travada para sempre. Esta é a válvula de escape. */
const WATCHDOG_MS = 250;

export interface AlvosFundoVivo {
  caixa: HTMLElement;
  video: HTMLVideoElement;
  /** Camada opcional que recebe o poster como background-image (a home
   *  usa uma div separada para poder cruzar com o scrim). */
  poster?: HTMLElement | null;
}

/**
 * Liga o fundo vivo. Idempotente por elemento: chamar duas vezes no
 * mesmo vídeo não duplica listeners.
 */
export function iniciarFundoVivo({ caixa, video, poster }: AlvosFundoVivo): void {
  if (caixa.dataset.fundoVivoLigado === "1") return;
  caixa.dataset.fundoVivoLigado = "1";

  const raizWeb = caixa.dataset.raiz ?? "";
  const raizScrub = raizWeb.replace("/web_video", "/scrub_video");

  const estreito = window.matchMedia("(max-width: 920px)").matches;
  const toque = window.matchMedia("(pointer: coarse)").matches;
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const conexao = (navigator as Navigator & { connection?: Conexao }).connection;
  const lenta =
    conexao?.saveData === true ||
    ["slow-2g", "2g", "3g"].includes(conexao?.effectiveType ?? "");

  const urlPoster = `${raizWeb}/${estreito ? "poster-mobile.jpg" : "poster-desktop.jpg"}`;
  if (poster) poster.style.backgroundImage = `url("${urlPoster}")`;
  video.poster = urlPoster;

  // Guardas de acessibilidade e de dado móvel: fica só no poster, sem
  // baixar um byte de vídeo.
  if (reduzido || (estreito && lenta)) return;

  video.src = `${raizScrub}/${escolherArquivo()}.mp4`;
  video.loop = true;

  let pronto = false;
  let modo: "tocando" | "scrubando" = "tocando";
  let alvo = 0;
  let seekEmVoo = false;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let ocioso: ReturnType<typeof setTimeout> | undefined;

  // ---- mapa scroll → tempo -----------------------------------------
  // alturaRolavel é MEDIDA fora do handler de scroll. A v4 lia
  // scrollHeight/innerHeight dentro do listener, forçando um layout
  // síncrono a cada evento de scroll — custo real num aparelho lento,
  // justamente durante o gesto.
  let alturaRolavel = 1;
  const medir = () => {
    alturaRolavel = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
  };
  medir();
  window.addEventListener("resize", medir, { passive: true });
  if ("ResizeObserver" in window) {
    new ResizeObserver(medir).observe(document.documentElement);
  }

  // clamp 0..1: o rubber-banding do macOS produz scrollY NEGATIVO no
  // topo — sem clamp o alvo ficava negativo e o wrap jogava o vídeo pro
  // FIM (o "bug do frame inicial" visto em uso real).
  const progresso = () => Math.min(1, Math.max(0, window.scrollY / alturaRolavel));
  const limitar = (t: number) =>
    Math.min(video.duration - MARGEM_FIM, Math.max(0, t));

  // ---- fila de um seek ---------------------------------------------
  const rvfc = (video as VideoComRVFC).requestVideoFrameCallback?.bind(video);

  function destravar() {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = undefined;
    }
    seekEmVoo = false;
    // Encadeia: se o dedo andou enquanto este frame era decodificado,
    // o próximo seek sai agora, já mirando a posição nova.
    if (modo === "scrubando") emitirSeek();
  }

  function emitirSeek() {
    if (seekEmVoo || !pronto) return;
    const destino = limitar(alvo);
    if (Math.abs(destino - video.currentTime) < TOLERANCIA_SEEK) return;

    seekEmVoo = true;
    video.currentTime = destino;
    watchdog = setTimeout(destravar, WATCHDOG_MS);
    if (rvfc) rvfc(destravar);
  }

  // Sem rVFC, 'seeked' é o melhor sinal disponível.
  if (!rvfc) video.addEventListener("seeked", destravar);

  // ---- retomada do play, com guarda de convergência -----------------
  function agendarRetomada() {
    if (ocioso) clearTimeout(ocioso);
    ocioso = setTimeout(verificarRetomada, PAUSA_ANTES_DE_TOCAR);
  }

  function verificarRetomada() {
    // O play só volta quando o frame na tela JÁ é o frame do scroll
    // atual. Sem esta guarda o vídeo retomava ainda correndo atrás do
    // dedo — era exatamente o defeito relatado pelo Max.
    if (seekEmVoo || Math.abs(limitar(alvo) - video.currentTime) > CONVERGIDO) {
      ocioso = setTimeout(verificarRetomada, 120);
      return;
    }
    modo = "tocando";
    void video.play().catch(() => {});
  }

  // ---- entrada ------------------------------------------------------
  video.addEventListener("loadedmetadata", () => {
    pronto = true;
    // metadata primeiro (leve, tira o vídeo do caminho crítico), corpo
    // depois — seek sem dado bufferizado é lento em qualquer aparelho.
    video.preload = "auto";
    alvo = progresso() * video.duration;
    void video.play().catch(() => {
      /* autoplay bloqueado: o primeiro gesto de scroll assume */
    });
  });

  window.addEventListener(
    "scroll",
    () => {
      if (!pronto) return;
      if (modo === "tocando") {
        modo = "scrubando";
        video.pause();
      }
      alvo = progresso() * video.duration;
      emitirSeek();
      agendarRetomada();
    },
    { passive: true },
  );

  // Aba oculta não precisa decodificar nada.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      video.pause();
      if (ocioso) clearTimeout(ocioso);
    } else if (modo === "tocando") {
      void video.play().catch(() => {});
    }
  });

  /**
   * Escolhe o arquivo. Em toque o gargalo medido no Android é o DECODE
   * por frame, não a resolução percebida — o vídeo ainda passa por
   * scrim e grain por cima. Por isso 720p (2,7MB) é o padrão no
   * celular; 1080p (5,2MB) só quando a tela é de tablet e a rede
   * aguenta. A v4 mandava 1080p para qualquer conexão não-lenta.
   */
  function escolherArquivo(): string {
    if (estreito) {
      if (lenta) return "hero-mobile-720-scrub";
      const tablet = window.innerWidth >= 700;
      const redeBoa = (conexao?.effectiveType ?? "4g") === "4g";
      return !toque || (tablet && redeBoa)
        ? "hero-mobile-1080-scrub"
        : "hero-mobile-720-scrub";
    }
    const pixels = window.innerWidth * (window.devicePixelRatio || 1);
    return pixels > 2200 ? "hero-1440-scrub" : "hero-1080-scrub";
  }
}
