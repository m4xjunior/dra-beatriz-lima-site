"use client";

// Lenis — o scroll suave que desacopla o input do render.
//
// POR QUE ELE EXISTE:
// a roda do mouse e o trackpad entregam degraus irregulares. O Lenis
// interpola esses degraus numa curva contínua, e é essa curva que o
// scrub lê. Sem ele o vídeo recebe saltos brutos e o movimento "pula"
// mesmo com o decode perfeito. É a decisão (2) do mapa do Hungry Tiger.
//
// ---------------------------------------------------------------
// POR QUE SÓ NO DESKTOP  (risco levantado pelo s007, 05/08/2026)
// ---------------------------------------------------------------
// A ADR da v5 removeu de propósito o requestAnimationFrame que girava a
// 60–120Hz pela vida inteira da página: "em repouso o custo de JS por
// quadro é exatamente zero". O Lenis funciona exatamente assim, um rAF
// permanente — ligá-lo no celular reintroduz por baixo a coisa que a v5
// tirou, no aparelho onde isso custa bateria e main thread.
//
// A referência já aponta o mesmo caminho: o Hungry Tiger roda com
// `smoothTouch: false`, ou seja, no toque eles também entregam o scroll
// nativo. Aqui isso vira explícito — em ponteiro grosso o Lenis nem é
// instanciado, e o iOS fica com o scroll nativo e zero rAF em repouso.
//
// A config numérica é a medida no runtime deles, não inventada:
// duration 1.2 e easing exponencial 1.001 - 2^(-10t).

import { useEffect } from "react";

export default function ProvedorScroll({ children }) {
  useEffect(() => {
    // Guardas antes de qualquer import: quem pediu menos movimento e
    // quem está no toque não paga nem o custo do bundle do Lenis.
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const toque = window.matchMedia("(pointer: coarse)").matches;
    if (reduzido || toque) return;

    let lenis;
    let quadro;
    let vivo = true;

    import("lenis").then(({ default: Lenis }) => {
      // O Strict Mode desmonta e remonta em dev. Sem esta guarda o
      // import assíncrono do primeiro mount resolveria DEPOIS do
      // cleanup e deixaria um segundo Lenis com seu próprio rAF —
      // exatamente o "loop duplo" que faz a rolagem andar em dobro.
      if (!vivo) return;

      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
      });

      const passo = (tempo) => {
        lenis.raf(tempo);
        quadro = requestAnimationFrame(passo);
      };
      quadro = requestAnimationFrame(passo);
    });

    return () => {
      vivo = false;
      if (quadro) cancelAnimationFrame(quadro);
      lenis?.destroy();
    };
  }, []);

  return children;
}
