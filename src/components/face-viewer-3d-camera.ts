// face-viewer-3d-camera.ts — modo ao vivo do FaceViewer3D: mesh facial
// calculado por IA (MediaPipe FaceLandmarker, WASM) rodando 100% no
// navegador do visitante — nenhum quadro de vídeo sai da máquina dele.
// Carregado só por import() dinâmico quando o usuário clica em "Ativar
// câmera" (opt-in real): o SDK do MediaPipe soma dezenas de kB ao que o
// orb decorativo já pesa, e a maioria de quem visita a página nunca clica.
//
// Reaproveita o mesmo pipeline visual do orb (renderer/bloom/tone mapping
// — ver face-viewer-3d-scene.ts): a malha do rosto é desenhada como
// LineSegments dourada com o mesmo UnrealBloomPass, para não introduzir
// uma segunda linguagem visual dentro do mesmo componente.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface InstanciaCameraFaceMesh {
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

// CDN jsDelivr para o WASM do MediaPipe e o modelo do Google Cloud Storage
// — mesmo espírito CDN-first já usado para GSAP no BaseLayout (ver
// readme.md "Motor de movimento"): zero bundler para um asset deste porte.
const MEDIAPIPE_VERSAO = "0.10.17";
const CDN_SDK_ESM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSAO}/+esm`;
const CDN_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSAO}/wasm`;
const CDN_MODELO =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export async function ativarCameraFaceMesh(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  variant: "hero" | "inline",
  // Opcional (5º parâmetro) — para persistência de captura (ver
  // face-viewer-3d-captura.ts). Recebe os pontos BRUTOS do MediaPipe, sem
  // nenhuma transformação de renderização (espelho/recentralização), uma
  // vez por tick de detecção. Por ser opcional, quem já chama esta função
  // sem o 5º argumento (FaceViewer3D.astro no modo câmera puro) continua
  // funcionando sem alteração nenhuma.
  aoQuadro?: (marcos: Array<{ x: number; y: number; z: number }> | null) => void
): Promise<InstanciaCameraFaceMesh> {
  // A ordem importa: só pedimos a câmera (prompt de permissão do
  // navegador) depois que o SDK confirmou que consegue carregar — evitar
  // pedir consentimento pra depois falhar por outro motivo.
  const mediapipe = await import(/* @vite-ignore */ CDN_SDK_ESM);
  const { FaceLandmarker, FilesetResolver } = mediapipe;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

  const fileset = await FilesetResolver.forVisionTasks(CDN_WASM);
  const landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: CDN_MODELO, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });

  const corMalha = lerTokenCor(stage, "--viewer3d-edge-glow", "#F7EDD6");

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Topologia oficial do FaceLandmarker (468 pontos, ~800 arestas) — a
  // malha reaproveita a tesselação do próprio modelo, não reinventamos a
  // geometria do rosto.
  const conexoes = FaceLandmarker.FACE_LANDMARKS_TESSELATION as Array<{
    start: number;
    end: number;
  }>;
  const posicoes = new Float32Array(conexoes.length * 2 * 3);
  const geometriaMalha = new THREE.BufferGeometry();
  geometriaMalha.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));

  const materialMalha = new THREE.LineBasicMaterial({
    color: corMalha,
    transparent: true,
    opacity: 0.85,
  });
  const linhas = new THREE.LineSegments(geometriaMalha, materialMalha);
  linhas.visible = false;
  scene.add(linhas);

  const bloomPreset =
    variant === "hero"
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

  let ativo = true;
  let frameId = 0;

  function loop() {
    if (!ativo) return;
    frameId = requestAnimationFrame(loop);
    if (video.readyState < 2) return;

    const resultado = landmarker.detectForVideo(video, performance.now());
    const marcos = resultado?.faceLandmarks?.[0];
    aoQuadro?.(marcos ?? null);
    if (marcos) {
      let i = 0;
      for (const { start, end } of conexoes) {
        const a = marcos[start];
        const b = marcos[end];
        // Espelha em X (o vídeo já é espelhado via CSS scaleX(-1) — a
        // malha precisa concordar com o espelho, senão "desalinha" do
        // rosto visível) e recentraliza para o espaço [-0.5, 0.5] da
        // câmera ortográfica.
        posicoes[i++] = 1 - a.x - 0.5;
        posicoes[i++] = 0.5 - a.y;
        posicoes[i++] = -a.z;
        posicoes[i++] = 1 - b.x - 0.5;
        posicoes[i++] = 0.5 - b.y;
        posicoes[i++] = -b.z;
      }
      geometriaMalha.attributes.position.needsUpdate = true;
      linhas.visible = true;
    } else {
      // Nenhum rosto neste frame — some a malha em vez de deixar a
      // última posição conhecida "fantasma" flutuando sem rosto embaixo.
      linhas.visible = false;
    }

    composer.render();
  }
  loop();

  return {
    destruir() {
      ativo = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      landmarker.close();
      geometriaMalha.dispose();
      materialMalha.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
