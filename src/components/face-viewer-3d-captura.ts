// face-viewer-3d-captura.ts — bufferiza os quadros de landmarks emitidos
// pelo modo ao vivo (face-viewer-3d-camera.ts, via callback `aoQuadro`) e
// persiste uma captura no backend Rust (server/, endpoints /api/capturas).
//
// Privacidade (não-negociável, ver Disclaimer/painel de consentimento em
// FaceViewer3D.astro): nunca lida com pixel/frame de vídeo/imagem — só os
// pontos numéricos (x,y,z) que o MediaPipe já entrega prontos. O payload
// guarda os pontos BRUTOS (sem o espelho/recentralização que
// face-viewer-3d-camera.ts aplica só para desenhar ao vivo) — quem
// reaplica essa transformação é o player de revisão
// (face-viewer-3d-playback.ts), com a MESMA fórmula, para casar
// visualmente com o que foi visto ao vivo sem acoplar o dado salvo a uma
// convenção de um renderer específico.
//
// Só acumula quadro enquanto uma captura está "armada" — isto é, entre a
// chamada de capturarESalvar() e sua resolução. Fora dessa janela,
// registrar() só acompanha a "presença" (rosto detectado ou não) para
// decidir quando o botão de salvar pode habilitar.

export interface MarcoBruto {
  x: number;
  y: number;
  z: number;
}

export interface ResultadoCaptura {
  capturaId: string;
  criadoEmUnixMs: number;
  totalQuadros: number;
}

/** Timeout de 6s estourado sem reunir o mínimo de 20 quadros válidos —
 * câmera instável, rosto fora do quadro, piscadas demais etc. */
export class ErroCapturaInstavel extends Error {
  constructor() {
    super(
      "Não conseguimos capturar sua expressão com estabilidade suficiente. Olhe para a câmera e tente de novo."
    );
    this.name = "ErroCapturaInstavel";
  }
}

/** Falha de rede pura — fetch() nem completou (ex.: site publicado só no
 * Cloudflare Pages, sem o servidor Rust por perto). Distinta de uma
 * resposta HTTP de erro (4xx/5xx), tratada como falha genérica abaixo. */
export class ErroCapturaIndisponivel extends Error {
  constructor() {
    super("Salvar captura não está disponível neste momento.");
    this.name = "ErroCapturaIndisponivel";
  }
}

// DECISÃO CONCRETA (ver contrato): 45 quadros @ 30fps ≈ 1,5s — meio da
// faixa aceita pelo servidor (20-60), teto da faixa de fps sugerida,
// tempo suficiente pra pelo menos um ciclo de piscar/micro-movimento
// natural (o replay não deve parecer uma foto congelada).
const ALVO_QUADROS = 45;
// Piso aceito pelo servidor em condição degradada (hardware fraco,
// throttling, rosto intermitente) — abaixo disso não vale a pena enviar.
const MINIMO_QUADROS = 20;
const TIMEOUT_CAPTURA_MS = 6000;
const FPS_ALVO = 30;
const VERSAO_ESQUEMA = 1;
// Rosto estável por 1s seguido antes de habilitar o botão — não adianta
// deixar salvar um buffer vazio/instável logo que a câmera liga.
const PRESENCA_MINIMA_MS = 1000;

// 5 casas decimais: precisão de 0,00001 em espaço normalizado (~0,006px
// numa imagem 640px, muito além do perceptível) — mantém o payload típico
// em ~570-780KB em vez de >1,2MB com float64 "shortest round-trip".
function arredondar5(valor: number): number {
  return Number(valor.toFixed(5));
}

// Achata Array<{x,y,z}> em [x0,y0,z0,x1,y1,z1,...] — evita repetir as
// chaves "x"/"y"/"z" pontosPorQuadro vezes por quadro (ver formatoQuadros
// no contrato do backend) e já sai pronto pra virar Float32Array.
function achatarQuadro(marcos: MarcoBruto[]): number[] {
  const quadro = new Array<number>(marcos.length * 3);
  let i = 0;
  for (const marco of marcos) {
    quadro[i++] = arredondar5(marco.x);
    quadro[i++] = arredondar5(marco.y);
    quadro[i++] = arredondar5(marco.z);
  }
  return quadro;
}

function baseUrlApi(): string {
  // PUBLIC_API_BASE_URL: origem pura (scheme+host+porta, sem barra
  // final), inlinada em build-time pelo Astro (site é output:'static',
  // sem servidor Node em produção). Vazio/ausente → caminho relativo,
  // que funciona quando o próprio Rust serve o dist/ (mesma origem).
  return (import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ?? "";
}

export interface BufferCaptura {
  /** Chamado a cada tick de detecção do modo câmera (mesmo valor bruto
   * passado a `aoQuadro` em ativarCameraFaceMesh). Só acumula quadro
   * quando uma captura está armada. */
  registrar(marcos: MarcoBruto[] | null): void;
  /** Arma uma nova janela de captura, aguarda ~45 quadros válidos (ou o
   * timeout de 6s com o mínimo de 20), envia para a API e resolve com o
   * resultado. Lança ErroCapturaInstavel / ErroCapturaIndisponivel ou um
   * Error genérico conforme o motivo da falha. */
  capturarESalvar(): Promise<ResultadoCaptura>;
  /** Aborta uma captura em andamento (se houver), sem reportar erro. */
  cancelar(): void;
  /** Notifica quando o botão de salvar deve habilitar/desabilitar —
   * dispara true após PRESENCA_MINIMA_MS de detecção contínua, false
   * assim que o rosto some de um quadro. */
  aoMudarProntidao(callback: (pronto: boolean) => void): void;
}

export function criarBufferCaptura(variante: "hero" | "inline"): BufferCaptura {
  let armado = false;
  let quadros: number[][] = [];
  let pontosPorQuadro = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolverAtual: ((resultado: ResultadoCaptura) => void) | null = null;
  let rejeitarAtual: ((erro: unknown) => void) | null = null;
  let controladorAborto: AbortController | null = null;

  let inicioPresenca: number | null = null;
  let pronto = false;
  let callbackProntidao: ((pronto: boolean) => void) | null = null;

  function limparEstadoCaptura(): void {
    armado = false;
    quadros = [];
    pontosPorQuadro = 0;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    resolverAtual = null;
    rejeitarAtual = null;
    controladorAborto = null;
  }

  async function enviarESalvar(): Promise<void> {
    const quadrosParaEnviar = quadros;
    const pontosParaEnviar = pontosPorQuadro;
    const resolver = resolverAtual;
    const rejeitar = rejeitarAtual;
    controladorAborto = new AbortController();
    const sinal = controladorAborto.signal;
    limparEstadoCaptura();

    try {
      const resposta = await fetch(`${baseUrlApi()}/api/capturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versaoEsquema: VERSAO_ESQUEMA,
          variante,
          fpsAlvo: FPS_ALVO,
          pontosPorQuadro: pontosParaEnviar,
          quadros: quadrosParaEnviar,
        }),
        signal: sinal,
      });

      if (!resposta.ok) {
        throw new Error("Não foi possível salvar a captura agora. Tente novamente.");
      }

      const corpo = (await resposta.json()) as ResultadoCaptura;
      resolver?.(corpo);
    } catch (erro) {
      // Cancelado explicitamente via cancelar() — silencioso, não é falha.
      if (erro instanceof DOMException && erro.name === "AbortError") return;
      // fetch() rejeita com TypeError quando a rede falha antes de haver
      // resposta HTTP (API fora do ar/inacessível) — distinto de uma
      // resposta HTTP de erro, que já vira Error acima.
      if (erro instanceof TypeError) {
        rejeitar?.(new ErroCapturaIndisponivel());
        return;
      }
      rejeitar?.(erro);
    }
  }

  return {
    registrar(marcos) {
      const agora = performance.now();
      if (marcos) {
        if (inicioPresenca === null) inicioPresenca = agora;
        if (!pronto && agora - inicioPresenca >= PRESENCA_MINIMA_MS) {
          pronto = true;
          callbackProntidao?.(true);
        }
      } else {
        inicioPresenca = null;
        if (pronto) {
          pronto = false;
          callbackProntidao?.(false);
        }
      }

      if (!armado || !marcos) return;

      if (pontosPorQuadro === 0) pontosPorQuadro = marcos.length;
      quadros.push(achatarQuadro(marcos));

      if (quadros.length >= ALVO_QUADROS) {
        void enviarESalvar();
      }
    },

    capturarESalvar() {
      if (armado) {
        return Promise.reject(new Error("Já existe uma captura em andamento."));
      }
      armado = true;
      quadros = [];
      pontosPorQuadro = 0;

      return new Promise<ResultadoCaptura>((resolve, reject) => {
        resolverAtual = resolve;
        rejeitarAtual = reject;
        timeoutId = setTimeout(() => {
          // Se já não está armado, o alvo de 45 quadros já disparou o
          // envio antes do timeout — nada a fazer aqui.
          if (!armado) return;
          if (quadros.length >= MINIMO_QUADROS) {
            void enviarESalvar();
          } else {
            const rejeitar = rejeitarAtual;
            limparEstadoCaptura();
            rejeitar?.(new ErroCapturaInstavel());
          }
        }, TIMEOUT_CAPTURA_MS);
      });
    },

    cancelar() {
      controladorAborto?.abort();
      if (armado) limparEstadoCaptura();
    },

    aoMudarProntidao(callback) {
      callbackProntidao = callback;
    },
  };
}
