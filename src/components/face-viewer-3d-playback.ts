// face-viewer-3d-playback.ts — reproduz uma captura JÁ SALVA (só pontos
// numéricos, nunca imagem) como a mesma malha dourada com bloom do modo ao
// vivo, em loop contínuo. Irmão de face-viewer-3d-camera.ts/
// face-viewer-3d-scene.ts no mesmo padrão de arquitetura do projeto — mas
// sem câmera, sem getUserMedia, sem MediaPipe: a página /simulacao-3d/ver
// não faz nenhuma inferência, só desenha números que o servidor devolveu.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { TESSELACAO_FACE } from "./face-mesh-tesselacao.ts";

export interface OpcoesPlayback {
  /** Quadros BRUTOS (sem espelho/recentralização), array plano
   * [x0,y0,z0,x1,y1,z1,...] cada um — exatamente o shape salvo pelo
   * backend (ver face-viewer-3d-captura.ts). */
  quadros: number[][];
  pontosPorQuadro: number;
  fpsAlvo: number;
  variant: "hero" | "inline";
}

export interface InstanciaPlayback {
  destruir: () => void;
}

function lerTokenCor(el: Element, token: string, fallbackHex: string): THREE.Color {
  const valor = getComputedStyle(el).getPropertyValue(token).trim();
  try {
    return new THREE.Color(valor || fallbackHex);
  } catch {
    return new THREE.Color(fallbackHex);
  }
}

export function iniciarPlaybackFaceMesh(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  opcoes: OpcoesPlayback
): InstanciaPlayback {
  const corMalha = lerTokenCor(stage, "--viewer3d-edge-glow", "#F7EDD6");

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const posicoes = new Float32Array(TESSELACAO_FACE.length * 2 * 3);
  const geometriaMalha = new THREE.BufferGeometry();
  geometriaMalha.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));

  const materialMalha = new THREE.LineBasicMaterial({
    color: corMalha,
    transparent: true,
    opacity: 0.85,
  });
  const linhas = new THREE.LineSegments(geometriaMalha, materialMalha);
  scene.add(linhas);

  const bloomPreset =
    opcoes.variant === "hero"
      ? { strength: 0.9, radius: 0.5, threshold: 0.2 }
      : { strength: 0.55, radius: 0.4, threshold: 0.28 };
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    bloomPreset.strength,
    bloomPreset.radius,
    bloomPreset.threshold
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  function redimensionar() {
    const largura = stage.clientWidth || 1;
    const altura = stage.clientHeight || 1;
    renderer.setSize(largura, altura, false);
    composer.setSize(largura, altura);
    bloomPass.setSize(largura, altura);
  }
  const resizeObserver = new ResizeObserver(redimensionar);
  resizeObserver.observe(stage);
  redimensionar();

  // Mesma fórmula de espelho/recentralização de face-viewer-3d-camera.ts
  // (documentada no contrato como a transformação que o player DEVE
  // aplicar) — os pontos salvos são brutos, quem desenha reaplica o
  // espelho para bater visualmente com o que foi visto ao vivo.
  function desenharQuadro(quadro: number[]): void {
    let i = 0;
    for (const { start, end } of TESSELACAO_FACE) {
      const ax = quadro[start * 3];
      const ay = quadro[start * 3 + 1];
      const az = quadro[start * 3 + 2];
      const bx = quadro[end * 3];
      const by = quadro[end * 3 + 1];
      const bz = quadro[end * 3 + 2];
      posicoes[i++] = 1 - ax - 0.5;
      posicoes[i++] = 0.5 - ay;
      posicoes[i++] = -az;
      posicoes[i++] = 1 - bx - 0.5;
      posicoes[i++] = 0.5 - by;
      posicoes[i++] = -bz;
    }
    geometriaMalha.attributes.position.needsUpdate = true;
  }

  let ativo = true;
  let frameId = 0;
  let indiceAtual = 0;
  let ultimoAvanco = performance.now();
  const intervaloMs = 1000 / Math.max(opcoes.fpsAlvo, 1);

  if (opcoes.quadros.length > 0) desenharQuadro(opcoes.quadros[0]);

  function loop() {
    if (!ativo) return;
    frameId = requestAnimationFrame(loop);
    if (opcoes.quadros.length === 0) {
      composer.render();
      return;
    }

    const agora = performance.now();
    if (agora - ultimoAvanco >= intervaloMs) {
      ultimoAvanco = agora;
      // Loop simples (sem ping-pong): volta a 0 depois do último quadro.
      indiceAtual = (indiceAtual + 1) % opcoes.quadros.length;
      desenharQuadro(opcoes.quadros[indiceAtual]);
    }
    composer.render();
  }
  loop();

  return {
    destruir() {
      ativo = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      geometriaMalha.dispose();
      materialMalha.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
