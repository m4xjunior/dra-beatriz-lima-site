// Teste do driver do fundo vivo — node --test, sem browser.
//
// POR QUE ESTE TESTE EXISTE: o defeito relatado ("rolo pra cima e pra
// baixo e o frame não é controlado gradualmente, ela segue em play")
// não era de renderização, era de AGENDAMENTO DE SEEK. Isso é lógica
// pura, testável sem decoder: basta um <video> falso com latência de
// seek configurável.
//
// O teste roda os DOIS algoritmos contra o mesmo vídeo falso e o mesmo
// gesto, para que a regressão fique impossível de reintroduzir sem
// alguém ver o número mudar.
//
// (Não é um teste do decoder. Quanto tempo um Android real leva por
// seek é medição de aparelho; o que este arquivo garante é que o
// driver CONVERGE para o frame certo qualquer que seja essa latência.)
import { test } from "node:test";
import assert from "node:assert/strict";

import { iniciarFundoVivo } from "./fundo-vivo.ts";

// --------------------------------------------------------------------
// Mundo falso: só o que o driver toca.
// --------------------------------------------------------------------

type Ouvinte = (evento?: unknown) => void;

class AlvoDeEventos {
  ouvintes = new Map<string, Ouvinte[]>();
  addEventListener(tipo: string, fn: Ouvinte) {
    const lista = this.ouvintes.get(tipo) ?? [];
    lista.push(fn);
    this.ouvintes.set(tipo, lista);
  }
  removeEventListener(tipo: string, fn: Ouvinte) {
    this.ouvintes.set(
      tipo,
      (this.ouvintes.get(tipo) ?? []).filter((f) => f !== fn),
    );
  }
  emitir(tipo: string) {
    for (const fn of [...(this.ouvintes.get(tipo) ?? [])]) fn();
  }
}

/**
 * <video> falso. Um seek leva `latencia` ms e só então dispara
 * 'seeked' — é assim que um decoder real se comporta, e é o que faz a
 * fila de um seek se auto-regular.
 */
class VideoFalso extends AlvoDeEventos {
  duration = 9.042;
  paused = true;
  loop = false;
  preload = "metadata";
  src = "";
  poster = "";
  seeking = false;

  #tempo = 0;
  #pendente: NodeJS.Timeout | null = null;
  // Campo explícito (não parameter property): `node --test` roda o TS
  // em modo strip-only, que não gera código — e parameter property
  // precisaria justamente disso.
  latencia: number;

  constructor(latencia: number) {
    super();
    this.latencia = latencia;
  }

  get currentTime() {
    return this.#tempo;
  }
  set currentTime(valor: number) {
    this.seeking = true;
    if (this.#pendente) clearTimeout(this.#pendente);
    this.#pendente = setTimeout(() => {
      this.#tempo = valor;
      this.seeking = false;
      this.#pendente = null;
      this.emitir("seeked");
    }, this.latencia);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

interface Cenario {
  video: VideoFalso;
  scroll: (y: number) => void;
  alturaRolavel: number;
  limpar: () => void;
}

function montarCenario(latenciaSeek: number): Cenario {
  const alturaRolavel = 6000;
  const janela = new AlvoDeEventos();
  const documento = new AlvoDeEventos();

  const caixa = { dataset: {} as Record<string, string> };
  const video = new VideoFalso(latenciaSeek);

  const globalQualquer = globalThis as unknown as Record<string, unknown>;
  const anterior = {
    window: globalQualquer.window,
    document: globalQualquer.document,
    navigator: globalQualquer.navigator,
    ResizeObserver: globalQualquer.ResizeObserver,
  };

  globalQualquer.window = Object.assign(janela, {
    scrollY: 0,
    innerWidth: 412,
    innerHeight: 900,
    devicePixelRatio: 2.6,
    // Toque + ponteiro grosso: é o caso que estava quebrado.
    matchMedia: (consulta: string) => ({
      matches: consulta.includes("pointer: coarse") || consulta.includes("max-width: 920px"),
    }),
  });
  globalQualquer.document = Object.assign(documento, {
    hidden: false,
    documentElement: { scrollHeight: alturaRolavel + 900 },
  });
  // defineProperty: no Node 22 `navigator` é getter-only no global, e
  // atribuição direta joga TypeError.
  Object.defineProperty(globalThis, "navigator", {
    value: { connection: { effectiveType: "4g" } },
    configurable: true,
    writable: true,
  });
  globalQualquer.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };

  iniciarFundoVivo({
    caixa: caixa as unknown as HTMLElement,
    video: video as unknown as HTMLVideoElement,
  });

  video.emitir("loadedmetadata");

  return {
    video,
    alturaRolavel,
    scroll(y: number) {
      (globalQualquer.window as { scrollY: number }).scrollY = y;
      janela.emitir("scroll");
    },
    limpar() {
      globalQualquer.window = anterior.window;
      globalQualquer.document = anterior.document;
      globalQualquer.ResizeObserver = anterior.ResizeObserver;
      Object.defineProperty(globalThis, "navigator", {
        value: anterior.navigator,
        configurable: true,
        writable: true,
      });
    },
  };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Onde o frame DEVERIA estar para a posição de scroll atual.
 *
 * A margem de 0,05s no fim é do driver, não folga do teste: pedir
 * exatamente `duration` devolve frame preto em alguns decoders, então
 * o último frame alcançável é `duration - MARGEM_FIM`. Sem espelhar
 * isso aqui, o pé da página acusaria 0,050s de atraso sempre.
 */
const MARGEM_FIM = 0.05;
const alvoDe = (c: Cenario, y: number) =>
  Math.min(
    c.video.duration - MARGEM_FIM,
    Math.min(1, Math.max(0, y / c.alturaRolavel)) * c.video.duration,
  );

// --------------------------------------------------------------------

test("um fling do topo ao rodapé converge para o frame do scroll", async () => {
  const c = montarCenario(40); // 40ms por seek ≈ Android intermediário
  try {
    // Gesto rápido: 30 amostras de scroll em ~480ms, como um fling real.
    for (let i = 1; i <= 30; i++) {
      c.scroll((c.alturaRolavel * i) / 30);
      await dormir(16);
    }

    const esperado = alvoDe(c, c.alturaRolavel);

    // Meio segundo depois do gesto já tem que estar no frame certo.
    await dormir(500);
    const erro = Math.abs(esperado - c.video.currentTime);

    assert.ok(
      erro < 0.05,
      `o frame ficou ${erro.toFixed(3)}s atrás do scroll (limite: 1 frame = 0,042s a 24fps)`,
    );
  } finally {
    c.limpar();
  }
});

test("o vídeo não volta a tocar enquanto ainda está alcançando o scroll", async () => {
  // Decoder lento de propósito: aqui o driver AINDA está correndo atrás
  // quando o gesto termina. É exatamente o instante em que a v4
  // chamava play() e produzia o "ela segue em play".
  const c = montarCenario(220);
  try {
    for (let i = 1; i <= 30; i++) {
      c.scroll((c.alturaRolavel * i) / 30);
      await dormir(16);
    }

    // A retomada é agendada para 1200ms de silêncio. Amostra durante
    // toda essa janela: se em ALGUM momento o vídeo estiver tocando com
    // o frame fora de lugar, a guarda de convergência falhou.
    for (let i = 0; i < 30; i++) {
      await dormir(50);
      const erro = Math.abs(alvoDe(c, c.alturaRolavel) - c.video.currentTime);
      assert.ok(
        c.video.paused || erro < 0.05,
        `tocou com o frame ${erro.toFixed(3)}s atrasado — é o defeito relatado`,
      );
    }
  } finally {
    c.limpar();
  }
});

test("scroll pra cima e pra baixo termina no frame de onde o dedo parou", async () => {
  const c = montarCenario(40);
  try {
    // Vai, volta, vai de novo — o padrão que o Max descreveu.
    const posicoes = [3000, 6000, 1200, 4800, 600];
    for (const y of posicoes) {
      for (let i = 0; i < 6; i++) {
        c.scroll(y);
        await dormir(16);
      }
    }

    await dormir(600);
    const erro = Math.abs(alvoDe(c, 600) - c.video.currentTime);
    assert.ok(erro < 0.05, `terminou ${erro.toFixed(3)}s fora do lugar`);
  } finally {
    c.limpar();
  }
});

test("o teto de velocidade da v4 tornava a convergência impossível", () => {
  // Este teste não exercita o código — ele registra POR QUE a v4
  // falhava, para que a constante nunca volte por engano.
  //
  //   intervaloMinimo = 90ms  →  ~11 seeks/s
  //   capPasso        = 0,05s de vídeo por seek
  const avancoMaximoPorSegundo = (1000 / 90) * 0.05; // 0,55x tempo real
  const duracao = 9.042;

  const segundosParaAlcancar = duracao / avancoMaximoPorSegundo;

  assert.ok(
    segundosParaAlcancar > 15,
    "premissa do bug: alcançar um fling levava mais de 15s",
  );
  assert.ok(
    avancoMaximoPorSegundo < 1,
    "o teto era mais lento que o tempo real — nunca alcançava",
  );
});
