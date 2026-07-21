/* ============================================================
   BL·Motion — camada de movimento da marca sobre GSAP
   ------------------------------------------------------------
   Dra. Beatriz Lima — Biomédica Esteta · Design System

   GSAP é o MOTOR de movimento do sistema. Esta camada:
   · lê os tokens de movimento (--duration-*, eases da marca)
   · expõe receitas de marca (reveal, split, tilt, parallax, bloom)
   · é DECLARATIVA por data-* (§5.2): o admin adiciona
     data-bl-reveal / data-bl-tilt / data-bl-split / data-bl-parallax
     a qualquer bloco, sem escrever código
   · respeita prefers-reduced-motion (acessibilidade AA)

   GSAP é 100% gratuito desde 30/04/2025 (v3.13+), inclusive
   ScrollTrigger e SplitText. Licença GreenSock "no-charge"
   (uso comercial ok). Docs: https://gsap.com

   Uso (site/consumidor):
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>
     <script src="/motion/bl-motion.js"></script>
     <script>BLMotion.ready().then(() => BLMotion.auto());</script>

   Para Tauri/offline: auto-hospede os .min.js do GSAP e troque
   as URLs de CDN em BL_CDN abaixo. A API não muda.
   ============================================================ */
(function (global) {
  "use strict";

  var VER = "3.13.0";
  var BL_CDN = [
    "https://cdn.jsdelivr.net/npm/gsap@" + VER + "/dist/gsap.min.js",
    "https://cdn.jsdelivr.net/npm/gsap@" + VER + "/dist/ScrollTrigger.min.js",
    "https://cdn.jsdelivr.net/npm/gsap@" + VER + "/dist/SplitText.min.js"
  ];

  var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var _ready = null;

  /* --- carrega GSAP + plugins se ainda não estiverem presentes --- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res();
      var s = document.createElement("script");
      s.src = src; s.async = false;
      s.onload = res; s.onerror = function () { rej(new Error("BLMotion: falhou ao carregar " + src)); };
      document.head.appendChild(s);
    });
  }

  function ready() {
    if (_ready) return _ready;
    _ready = (global.gsap ? Promise.resolve() : BL_CDN.reduce(function (p, src) {
      return p.then(function () { return loadScript(src); });
    }, Promise.resolve())).then(function () {
      var g = global.gsap;
      if (g && g.registerPlugin) {
        if (global.ScrollTrigger) g.registerPlugin(global.ScrollTrigger);
        if (global.SplitText) g.registerPlugin(global.SplitText);
      }
      return g;
    });
    return _ready;
  }

  /* --- tokens de movimento (lidos do CSS; ms → s) --------------- */
  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function dur(name, fallback) {
    var v = css(name, fallback);
    var n = parseFloat(v);
    return v.indexOf("ms") > -1 ? n / 1000 : (n || 0.26);
  }
  var D = {
    fast: function () { return dur("--duration-fast", "140ms"); },
    base: function () { return dur("--duration-base", "260ms"); },
    slow: function () { return dur("--duration-slow", "480ms"); },
    slower: function () { return dur("--duration-slower", "800ms"); }
  };
  /* eases da marca — mapeados dos cubic-bezier dos tokens */
  var EASE = { entrance: "power3.out", standard: "power2.inOut", exit: "power2.in", tilt: "power3.out" };

  /* --- REVEAL — surge subindo + fade, em lote (ScrollTrigger.batch) --- */
  function reveal(targets, opts) {
    opts = opts || {};
    var g = global.gsap, ST = global.ScrollTrigger;
    var els = g.utils.toArray(targets);
    if (!els.length) return;
    var y = opts.y != null ? opts.y : 28, stagger = opts.stagger != null ? opts.stagger : 0.12;
    if (reduced) { g.set(els, { opacity: 1, y: 0, clearProps: "transform" }); return; }
    // scroll:false → toca imediatamente (demos / above-the-fold)
    if (opts.scroll === false || !ST) {
      g.set(els, { opacity: 0, y: y });
      g.to(els, { opacity: 1, y: 0, duration: D.slow(), ease: EASE.entrance, stagger: stagger, delay: opts.delay || 0 });
      return;
    }
    g.set(els, { opacity: 0, y: y });
    ST.batch(els, {
      scroller: opts.scroller || null,
      // "top 100%" (não "top 86%"): bug real visto em tela — qualquer
      // elemento data-bl-reveal que já nasce dentro do viewport inicial
      // mas abaixo da faixa dos 86% (ex.: os CTAs do Hero, com telas de
      // ~700-850px de altura) nunca cruza esse gatilho porque ninguém
      // rola a página — ele fica preso em opacity:0 pra sempre, sem
      // nenhuma ação do usuário disparar o reveal. "top 100%" cobre
      // exatamente o que já está visível no load, então acima-da-dobra
      // sempre revela imediatamente; abaixo da dobra continua revelando
      // ao entrar na tela, como antes.
      start: opts.start || "top 100%",
      once: opts.once !== false,
      onEnter: function (b) { g.to(b, { opacity: 1, y: 0, duration: D.slow(), ease: EASE.entrance, stagger: stagger, overwrite: true }); }
    });
  }

  /* --- SPLIT — headline revela por caractere, com máscara -------- */
  function split(el, opts) {
    opts = opts || {};
    var g = global.gsap, ST = global.SplitText;
    el = typeof el === "string" ? document.querySelector(el) : el;
    if (!el) return null;
    if (reduced || !ST) { g && g.set(el, { opacity: 1 }); return null; }
    var s = new ST(el, { type: "chars,words", mask: "chars", charsClass: "bl-char" });
    g.set(el, { opacity: 1 });
    var tween = g.from(s.chars, {
      yPercent: 120, opacity: 0, duration: D.slow(),
      ease: EASE.entrance, stagger: opts.stagger != null ? opts.stagger : 0.028, delay: opts.delay || 0
    });
    return { split: s, tween: tween, replay: function () { tween.restart(); } };
  }

  /* --- TILT 3D — card inclina seguindo o ponteiro (quickTo) ----- */
  function tilt(el, opts) {
    opts = opts || {};
    var g = global.gsap;
    el = typeof el === "string" ? document.querySelector(el) : el;
    if (!el || reduced) return;
    var max = opts.max != null ? opts.max : parseFloat(css("--tilt-max", "8deg")) || 8;
    var persp = opts.perspective || (parseFloat(css("--tilt-perspective", "900px")) || 900);
    g.set(el, { transformPerspective: persp, transformStyle: "preserve-3d" });
    var rotX = g.quickTo(el, "rotationX", { duration: 0.5, ease: EASE.tilt });
    var rotY = g.quickTo(el, "rotationY", { duration: 0.5, ease: EASE.tilt });
    var scl = g.quickTo(el, "scale", { duration: 0.4, ease: EASE.tilt });
    var host = opts.host || el;
    function move(e) {
      var r = host.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      rotY(px * max * 2); rotX(-py * max * 2); scl(opts.scale || 1.02);
    }
    function leave() { rotX(0); rotY(0); scl(1); }
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return function () { host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); };
  }

  /* --- PARALLAX — camadas movem em ritmos diferentes no scroll --- */
  function parallax(targets, opts) {
    opts = opts || {};
    var g = global.gsap, ST = global.ScrollTrigger;
    if (reduced || !ST) return;
    g.utils.toArray(targets).forEach(function (el) {
      var depth = parseFloat(el.getAttribute("data-bl-parallax")) || opts.depth || 0.3;
      g.to(el, {
        yPercent: -depth * 100, ease: "none",
        scrollTrigger: {
          trigger: opts.trigger || el, scroller: opts.scroller || null,
          start: "top bottom", end: "bottom top", scrub: opts.scrub != null ? opts.scrub : true
        }
      });
    });
  }

  /* --- BLOOM PULSE — brilho dourado respira (orb / CTA) --------- */
  function bloomPulse(el, opts) {
    opts = opts || {};
    var g = global.gsap;
    el = typeof el === "string" ? document.querySelector(el) : el;
    if (!el || reduced) return;
    return g.to(el, {
      filter: "brightness(1.12)", duration: opts.duration || 2.2,
      ease: "sine.inOut", yoyo: true, repeat: -1
    });
  }

  /* --- AUTO — varre o DOM e liga tudo por data-* (§5.2) --------- */
  function auto(root) {
    root = root || document;
    var rv = root.querySelectorAll("[data-bl-reveal]");
    if (rv.length) reveal(rv, { scroller: null });
    root.querySelectorAll("[data-bl-tilt]").forEach(function (el) { tilt(el); });

    // SplitText mede a caixa de cada caractere na fonte ATUAL da tela.
    // Se a webfont (Bricolage/Mulish) ainda não terminou de trocar
    // (font-display: swap), o split é calculado em cima do fallback e
    // o layout muda debaixo dele quando a fonte chega — o headline fica
    // dessincronizado, com letras cortadas/deslocadas por vários
    // segundos (visto em produção: aviso do GSAP "SplitText called
    // before fonts loaded" no console). Esperar document.fonts.ready
    // antes de splitar resolve na raiz, sem tocar a duração da animação.
    var splitEls = root.querySelectorAll("[data-bl-split]");
    if (splitEls.length) {
      var runSplit = function () { splitEls.forEach(function (el) { split(el); }); };
      if (global.document.fonts && global.document.fonts.status !== "loaded") {
        global.document.fonts.ready.then(runSplit);
      } else {
        runSplit();
      }
    }

    var px = root.querySelectorAll("[data-bl-parallax]");
    if (px.length) parallax(px);
  }

  global.BLMotion = {
    version: VER, reduced: reduced, ready: ready,
    durations: D, eases: EASE,
    reveal: reveal, split: split, tilt: tilt, parallax: parallax, bloomPulse: bloomPulse, auto: auto
  };
})(window);
