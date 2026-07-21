// face-viewer-3d-scene.ts — lógica Three.js do FaceViewer3D.
// Propriedade exclusiva de quem constrói FaceViewer3D.astro; nenhum outro
// componente importa este arquivo.
//
// Conceito visual (threeDConcept, ver contrato de arquivos): não há
// fotografia/scan facial real nesta etapa (ver readme.md "Fontes
// recebidas" — sem retrato/macro fornecido, sem síntese de rosto por
// IA/ML no escopo). Em vez de simular um rosto que não temos, a cena
// renderiza o motivo de marca já cunhado no design system — o "orb
// dourado com bloom" (ver readme.md "ICONOGRAPHY") — como placeholder
// honesto do conceito de simulação 3D: um icosaedro de alta subdivisão,
// deslocado por ruído ao longo da normal (a "respiração" do bloom),
// com termo de Fresnel no fragment shader interpolando núcleo dourado →
// brilho de borda champanhe → silhueta obsidiana nos ângulos rasos, e
// bloom real via UnrealBloomPass (não só emissive/box-shadow).
//
// Cores: lidas em runtime via getComputedStyle dos tokens de componente
// (nível 3 — nunca color.css/effect.css direto no .astro; aqui, dentro
// do módulo que fala com o WebGL, é a única exceção documentada: GLSL
// não lê var(), então o valor computado precisa ser resolvido em JS e
// empurrado como uniform). --viewer3d-core-start/-end, --viewer3d-edge-glow
// e --viewer3d-void são tokens de componente (components.css) que
// aliasam os primitivos --color-gold-700/-500, --color-champagne e
// --color-obsidian-900 — se a paleta mudar, muda só o token, nunca este
// arquivo.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface OpcoesFaceViewer3D {
  autoRotate: boolean;
  /** "hero" (/simulacao-3d) usa bloom inspirado em --bloom-gold-strong; "inline" (teaser) em --bloom-gold. */
  variant: "hero" | "inline";
}

interface InstanciaFaceViewer3D {
  destruir: () => void;
}

/** Lê um token de cor (nível 2/3, nunca color.css direto no .astro) e
 * converte para THREE.Color — WebGL não lê var(), então esta função é a
 * ponte JS→shader documentada no cabeçalho do arquivo. Fallback hex é
 * só uma rede de segurança caso o CSS ainda não tenha aplicado. */
function lerTokenCor(el: Element, token: string, fallbackHex: string): THREE.Color {
  const valor = getComputedStyle(el).getPropertyValue(token).trim();
  try {
    return new THREE.Color(valor || fallbackHex);
  } catch {
    return new THREE.Color(fallbackHex);
  }
}

function lerTokenNumero(el: Element, token: string, fallback: number): number {
  const valor = getComputedStyle(el).getPropertyValue(token).trim();
  const n = parseFloat(valor);
  return Number.isFinite(n) ? n : fallback;
}

/* ------------------------------------------------------------------ *
 * Ruído simplex 3D (Ashima/McEwan-Gustavson, domínio público, receita
 * padrão da comunidade WebGL) + fbm de 3 oitavas — desloca a malha ao
 * longo da normal no vertex shader ("rosto em formação").
 * ------------------------------------------------------------------ */
const GLSL_SIMPLEX_NOISE = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  float valor = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    valor += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return valor;
}
`;

const VERTEX_SHADER = `
${GLSL_SIMPLEX_NOISE}
uniform float uTime;
uniform float uNoiseAmp;
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  // "Respiração" do bloom — equivalente 3D do BLMotion.bloomPulse (~2,2s
  // de ciclo sine.inOut) modulando a amplitude do ruído, não só a cor.
  float respiracao = 0.85 + 0.15 * sin(uTime * 2.4);
  float n = fbm(normal * 1.6 + vec3(uTime * 0.12));
  vec3 deslocado = position + normal * n * uNoiseAmp * respiracao;

  vec4 posicaoMundo = modelMatrix * vec4(deslocado, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - posicaoMundo.xyz);
  gl_Position = projectionMatrix * viewMatrix * posicaoMundo;
}
`;

const FRAGMENT_SHADER = `
uniform vec3 uCoreStart;
uniform vec3 uCoreEnd;
uniform vec3 uEdgeGlow;
uniform vec3 uVoid;
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  // Termo de Fresnel — simula reflexo metálico/vítreo sem HDRI/mapa de
  // ambiente (mantém o site 100% autocontido, sem asset externo).
  float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.2);

  vec3 nucleo = mix(uCoreStart, uCoreEnd, smoothstep(0.0, 0.55, fresnel));
  vec3 comBorda = mix(nucleo, uEdgeGlow, smoothstep(0.35, 0.75, fresnel));
  vec3 corFinal = mix(comBorda, uVoid, smoothstep(0.75, 1.0, fresnel));

  gl_FragColor = vec4(corFinal, 1.0);
}
`;

export function iniciarFaceViewer3D(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  opcoes: OpcoesFaceViewer3D
): InstanciaFaceViewer3D {
  // Nota: prefers-reduced-motion (via BLMotion.reduced — única fonte de
  // verdade, nunca matchMedia próprio) e o lazy-init por IntersectionObserver
  // já são resolvidos por quem chama esta função (FaceViewer3D.astro, no
  // <script> do componente): se reduced, este módulo nem chega a ser
  // importado (import() dinâmico condicional); se não está visível ainda,
  // o import() só acontece no primeiro IntersectionObserver.isIntersecting.
  // Ou seja, ao chegar aqui, o stage já está visível e motion é permitido —
  // esta função sempre monta a cena imediatamente. O IntersectionObserver
  // abaixo cuida só do ciclo de vida DEPOIS do primeiro mount (pausar o
  // loop quando o usuário rola para longe, retomar quando rolar de volta).
  let renderer: THREE.WebGLRenderer | null = null;
  let composer: EffectComposer | null = null;
  let scrollTriggerInstance: { kill: () => void } | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let animar: (() => void) | null = null;
  let limpar: (() => void) | null = null;
  let montado = false;
  let ativo = true;

  function montarCena() {
    if (montado) return;
    montado = true;

    stage.dataset.mode = "3d";

    const corCoreStart = lerTokenCor(stage, "--viewer3d-core-start", "#7A5B2B");
    const corCoreEnd = lerTokenCor(stage, "--viewer3d-core-end", "#B58E45");
    const corEdgeGlow = lerTokenCor(stage, "--viewer3d-edge-glow", "#F7EDD6");
    const corVoid = lerTokenCor(stage, "--viewer3d-void", "#100D09");
    const tiltMaxDeg = lerTokenNumero(stage, "--tilt-max", 8);
    const tiltMaxRad = THREE.MathUtils.degToRad(tiltMaxDeg);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearAlpha(0); // deixa o mesh/vidro CSS do stage aparecer ao redor do orb

    // --- Geometria: icosaedro de alta subdivisão (base esférica lisa) ---
    // detail=6 (per threeDConcept) já produz ~82 mil triângulos — suave o
    // bastante para a distorção de ruído sem faceteamento visível.
    const geometria = new THREE.IcosahedronGeometry(1.4, 6);

    const uniforms = {
      uTime: { value: 0 },
      uNoiseAmp: { value: 0.06 },
      uCoreStart: { value: corCoreStart },
      uCoreEnd: { value: corCoreEnd },
      uEdgeGlow: { value: corEdgeGlow },
      uVoid: { value: corVoid },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
    });

    const orb = new THREE.Mesh(geometria, material);
    scene.add(orb);

    // --- Bloom real (não só box-shadow CSS na moldura) ---------------
    // Presets nomeados conforme os tokens que os inspiraram — única
    // exceção deliberada à regra "nunca hardcode": UnrealBloomPass usa
    // unidades de espaço de pós-processamento sem equivalente em
    // CSS/token (ver --bloom-gold-strong / --bloom-gold em effect.css).
    const bloomPreset =
      opcoes.variant === "hero"
        ? { strength: 1.05, radius: 0.55, threshold: 0.18 } // inspirado em --bloom-gold-strong
        : { strength: 0.62, radius: 0.4, threshold: 0.26 }; // inspirado em --bloom-gold

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      bloomPreset.strength,
      bloomPreset.radius,
      bloomPreset.threshold
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // --- Reação ao ponteiro — mesma fórmula do BLMotion.tilt() (px/py),
    // mesmo teto --tilt-max, mas aplicada em rotação 3D via rAF (não
    // gsap.quickTo, que é DOM-only). -----------------------------------
    let tiltTargetX = 0;
    let tiltTargetY = 0;
    let tiltCurrentX = 0;
    let tiltCurrentY = 0;
    let ultimaInteracao = performance.now();

    function aoMoverPonteiro(e: PointerEvent) {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tiltTargetY = px * tiltMaxRad;
      tiltTargetX = -py * tiltMaxRad;
      ultimaInteracao = performance.now();
    }
    function aoSairPonteiro() {
      tiltTargetX = 0;
      tiltTargetY = 0;
    }
    stage.addEventListener("pointermove", aoMoverPonteiro);
    stage.addEventListener("pointerleave", aoSairPonteiro);
    stage.addEventListener("pointerdown", () => (ultimaInteracao = performance.now()));

    // --- Reação ao scroll — reusa a instância global do ScrollTrigger já
    // registrada por bl-motion.js (não reimporta/registra o plugin). ----
    let scrollExtraRad = 0;
    const ST = (window as unknown as { ScrollTrigger?: any }).ScrollTrigger;
    if (ST) {
      scrollTriggerInstance = ST.create({
        trigger: stage,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self: { progress: number }) => {
          scrollExtraRad = self.progress * THREE.MathUtils.degToRad(40);
        },
      });
    }

    // --- Resize responsivo (mobile-first: acompanha o container) ------
    function redimensionar() {
      const largura = stage.clientWidth || 1;
      const altura = stage.clientHeight || 1;
      renderer!.setSize(largura, altura, false);
      composer!.setSize(largura, altura);
      bloomPass.setSize(largura, altura);
      camera.aspect = largura / altura;
      camera.updateProjectionMatrix();
    }
    resizeObserver = new ResizeObserver(redimensionar);
    resizeObserver.observe(stage);
    redimensionar();

    const relogio = new THREE.Clock();
    let rotAuto = 0;

    animar = () => {
      if (!ativo) return;
      const dt = relogio.getDelta();
      uniforms.uTime.value += dt;

      // Rotação idle: só depois de ~2,5s sem ponteiro ativo (per
      // threeDConcept — não gira continuamente enquanto o usuário interage).
      if (opcoes.autoRotate && performance.now() - ultimaInteracao > 2500) {
        rotAuto += dt * 0.05; // 0,05 rad/s em Y
      }

      // Amortecimento por frame do tilt (aproxima a sensação de
      // --ease-tilt / power3.out sem depender de gsap.quickTo, DOM-only).
      tiltCurrentX += (tiltTargetX - tiltCurrentX) * 0.08;
      tiltCurrentY += (tiltTargetY - tiltCurrentY) * 0.08;

      orb.rotation.x = tiltCurrentX;
      orb.rotation.y = rotAuto + tiltCurrentY + scrollExtraRad;

      composer!.render();
    };
    renderer.setAnimationLoop(animar);

    limpar = () => {
      renderer?.setAnimationLoop(null);
      stage.removeEventListener("pointermove", aoMoverPonteiro);
      stage.removeEventListener("pointerleave", aoSairPonteiro);
      resizeObserver?.disconnect();
      scrollTriggerInstance?.kill();
      geometria.dispose();
      material.dispose();
      bloomPass.dispose();
      composer?.dispose();
      renderer?.dispose();
    };
  }

  // O primeiro mount já foi ganho por quem chamou (só chegamos aqui depois
  // do IntersectionObserver do <script> do componente confirmar que o
  // stage está visível). Este observer cuida só do resto do ciclo de
  // vida: pausar o loop (setAnimationLoop(null), sem desmontar) quando o
  // usuário rola para longe, e retomar quando rolar de volta — mais barato
  // que destruir/recriar a cena a cada entrada/saída da viewport.
  montarCena();
  const intersectionObserver = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) renderer?.setAnimationLoop(animar);
        else renderer?.setAnimationLoop(null);
      }
    },
    { threshold: 0.2 }
  );
  intersectionObserver.observe(stage);

  return {
    destruir() {
      ativo = false;
      intersectionObserver.disconnect();
      limpar?.();
    },
  };
}
