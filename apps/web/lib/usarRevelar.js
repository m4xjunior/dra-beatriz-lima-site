"use client";

// Entrada coreografada por dobra.
//
// A direção visual é explícita: "UMA entrada coreografada por dobra vale
// mais que micro-interações espalhadas". Então isto não é um sistema de
// animação genérico — é um gatilho por seção, que revela os filhos em
// cascata e não roda nunca mais.
//
// IntersectionObserver e não scroll listener: o custo é zero enquanto a
// seção está fora de vista, e o navegador resolve a interseção fora da
// main thread. Um listener de scroll faria a conta a cada evento, para
// treze dobras, competindo com o scrub pelo mesmo quadro.
//
// `unobserve` depois de revelar: o observer some quando cumpriu a
// função. Sem isso ficariam treze observers vivos pela vida da página.

import { useEffect, useRef } from "react";

export function usarRevelar({ margem = "0px 0px -18% 0px" } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;

    // Regra do design system: quem pediu menos movimento recebe tudo
    // revelado de uma vez, sem transição. Não é degradação, é o estado
    // final entregue direto.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      alvo.dataset.revelado = "1";
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          entrada.target.dataset.revelado = "1";
          observador.unobserve(entrada.target);
        }
      },
      { rootMargin: margem, threshold: 0.01 },
    );

    observador.observe(alvo);
    return () => observador.disconnect();
  }, [margem]);

  return ref;
}
