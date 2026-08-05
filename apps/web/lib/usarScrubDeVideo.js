// Driver de scrub: o scroll comanda o quadro do vídeo.
//
// Porte fiel da v5 provada em uso real (ver ADR completa em
// apps/web/_referencia/fundo-vivo.ts.ref). Não é reescrita: o que está
// aqui já pagou o preço de dois defeitos de campo, e reescrever do zero
// os traria de volta.
//
// ---------------------------------------------------------------
// O DEFEITO QUE A v5 CORRIGIU, E QUE NÃO PODE VOLTAR
// ---------------------------------------------------------------
// A v4 perseguia o alvo com intervalo mínimo fixo e teto de passo. Em
// toque isso limitava o avanço a 0,05s de vídeo a cada 90ms — 0,55x a
// velocidade real. Um fling de meio segundo pedia 9s de avanço, que
// nesse teto levava ~16s. O vídeo nunca alcançava o dedo.
//
// A v5 troca o teto por uma FILA DE UM SEEK mirando sempre o alvo mais
// recente. Auto-regula pela capacidade real do decoder: aparelho rápido
// faz muitos seeks/s, lento faz menos, e os dois pousam no quadro da
// posição ATUAL em vez de rastejar atrás dela. Pular quadros
// intermediários é o comportamento CORRETO de um scrub.
//
// ---------------------------------------------------------------
// POR QUE NÃO TEM requestAnimationFrame AQUI
// ---------------------------------------------------------------
// O ciclo é todo por evento: o scroll inicia, e o quadro apresentado
// encadeia o próximo seek. Em repouso o custo de JS por quadro é zero.
// O Lenis (que roda rAF pela vida da página) fica restrito ao desktop
// por causa disto — ver ProvedorScroll.jsx.

import {
  MARGEM_FIM,
  TOLERANCIA_SEEK,
  progressoDaSecao,
  tempoAlvo,
  precisaBuscar,
} from "./scrub.js";

/** Erro máximo aceito para considerar o scrub "alcançado" (~1 quadro). */
const CONVERGIDO = 0.05;

/** Silêncio de scroll antes de devolver o play automático. */
const PAUSA_ANTES_DE_TOCAR = 1200;

/** Se o decoder engasgar e o sinal de quadro nunca vier, a fila ficaria
 *  travada para sempre. Válvula de escape. */
const WATCHDOG_MS = 250;

/**
 * Liga o scrub num <video> já montado.
 *
 * @param {HTMLVideoElement} video
 * @param {HTMLElement} secao a seção que este vídeo acompanha. O
 *        progresso é medido DENTRO dela, não no documento inteiro:
 *        cada procedimento tem o seu rosto e o seu trecho.
 * @param {(p: number) => void} [aoProgredir] chamado com 0..1 a cada
 *        atualização de scroll — é o que alimenta a régua.
 * @returns {() => void} desliga tudo (listeners, timers, fila).
 */
export function iniciarScrubDeVideo(video, secao, aoProgredir) {
  let vivo = true;
  let pronto = false;
  let modo = "tocando";
  let alvo = 0;
  let seekEmVoo = false;
  let watchdog;
  let ocioso;

  // A geometria da seção é MEDIDA fora do handler de scroll. Ler
  // offsetTop/offsetHeight dentro do listener força layout síncrono a
  // cada evento — custo real em aparelho lento, no meio do gesto. Com N
  // seções esse custo seria multiplicado por N, então aqui importa mais
  // ainda que importava na v5.
  let topo = 0;
  let altura = 1;
  let viewport = 1;
  const medir = () => {
    let y = 0;
    for (let n = secao; n; n = n.offsetParent) y += n.offsetTop;
    topo = y;
    altura = secao.offsetHeight;
    viewport = window.innerHeight;
  };
  medir();

  const progresso = () => progressoDaSecao(window.scrollY, topo, altura, viewport);

  // `alvo` guarda PROGRESSO (0..1), não segundos. A v5 guardava segundos
  // e convertia nos dois sentidos; manter uma unidade só elimina a
  // classe inteira de erro de conversão, e é a unidade que as funções
  // puras testadas em scrub.test.js já consomem.
  const tempoDoAlvo = () => tempoAlvo(alvo, video.duration, MARGEM_FIM);

  const rvfc = video.requestVideoFrameCallback?.bind(video);

  function destravar() {
    if (!vivo) return;
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = undefined;
    }
    seekEmVoo = false;
    // Encadeia: se o dedo andou enquanto este quadro era decodificado,
    // o próximo seek sai agora, já mirando a posição nova.
    if (modo === "scrubando") emitirSeek();
  }

  function emitirSeek() {
    if (!vivo || seekEmVoo || !pronto) return;
    const destino = tempoDoAlvo();
    if (!precisaBuscar(destino, video.currentTime, TOLERANCIA_SEEK)) return;

    seekEmVoo = true;
    video.currentTime = destino;
    watchdog = setTimeout(destravar, WATCHDOG_MS);
    if (rvfc) rvfc(destravar);
  }

  // Sem rVFC, 'seeked' é o melhor sinal disponível. Ele dispara quando o
  // decoder terminou, não quando o compositor apresentou — por isso é o
  // fallback, não a primeira escolha.
  function aoBuscar() {
    destravar();
  }
  if (!rvfc) video.addEventListener("seeked", aoBuscar);

  function verificarRetomada() {
    if (!vivo) return;
    // O play só volta quando o quadro na tela JÁ é o do scroll atual.
    // Sem esta guarda o vídeo retomava ainda correndo atrás do dedo.
    if (seekEmVoo || Math.abs(tempoDoAlvo() - video.currentTime) > CONVERGIDO) {
      ocioso = setTimeout(verificarRetomada, 120);
      return;
    }
    modo = "tocando";
    void video.play().catch(() => {});
  }

  function agendarRetomada() {
    if (ocioso) clearTimeout(ocioso);
    ocioso = setTimeout(verificarRetomada, PAUSA_ANTES_DE_TOCAR);
  }

  function aoCarregarMetadados() {
    if (!vivo) return;
    pronto = true;
    // metadata primeiro (leve, tira o vídeo do caminho crítico), corpo
    // depois — seek sem dado bufferizado é lento em qualquer aparelho.
    video.preload = "auto";
    alvo = progresso();
    void video.play().catch(() => {
      /* autoplay bloqueado: o primeiro gesto de scroll assume */
    });
  }

  function aoRolar() {
    if (!vivo) return;
    const p = progresso();
    aoProgredir?.(p);
    if (!pronto) return;
    if (modo === "tocando") {
      modo = "scrubando";
      video.pause();
    }
    alvo = p;
    emitirSeek();
    agendarRetomada();
  }

  function aoTrocarVisibilidade() {
    if (document.hidden) {
      video.pause();
      if (ocioso) clearTimeout(ocioso);
    } else if (modo === "tocando") {
      void video.play().catch(() => {});
    }
  }

  video.addEventListener("loadedmetadata", aoCarregarMetadados);
  window.addEventListener("scroll", aoRolar, { passive: true });
  window.addEventListener("resize", medir, { passive: true });
  document.addEventListener("visibilitychange", aoTrocarVisibilidade);

  const observador =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
  observador?.observe(secao);

  // Estado inicial da régua, antes de qualquer scroll.
  aoProgredir?.(progresso());

  // Cleanup COMPLETO. O Strict Mode do React monta e desmonta em dev; se
  // qualquer coisa daqui vazar, o segundo mount roda com dois conjuntos
  // de listeners e o scrub anda em dobro.
  return function desligar() {
    vivo = false;
    video.removeEventListener("loadedmetadata", aoCarregarMetadados);
    if (!rvfc) video.removeEventListener("seeked", aoBuscar);
    window.removeEventListener("scroll", aoRolar);
    window.removeEventListener("resize", medir);
    document.removeEventListener("visibilitychange", aoTrocarVisibilidade);
    observador?.disconnect();
    if (watchdog) clearTimeout(watchdog);
    if (ocioso) clearTimeout(ocioso);
    video.pause();
  };
}
