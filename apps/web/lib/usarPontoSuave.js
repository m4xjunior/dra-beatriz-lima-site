"use client";

// O ponto do "agora" perseguindo o scroll, com `gsap.quickTo`.
//
// POR QUE ISTO PRECISA DE GSAP:
// hoje o driver escreve `--p` direto no elemento e o ponto SALTA para a
// posição nova a cada evento de scroll. Uma transição CSS não resolve:
// ela reinicia a cada escrita, e com o scroll disparando dezenas de
// vezes por segundo o resultado é um borrão que nunca chega.
//
// `quickTo` existe exatamente para isto — um setter que interpola em
// direção a um alvo que muda a toda hora, reaproveitando o mesmo tween
// em vez de criar um por evento. É o caso em que GSAP faz o que CSS não
// faz, e não um enfeite.
//
// O ponto passa a ter a MESMA sensação do Lenis: o dedo manda, e a
// marca segue com inércia curta. Sem isso a régua é o único elemento da
// página que se move em degraus enquanto todo o resto desliza.
//
// CUSTO EM REPOUSO: o ticker do GSAP dorme quando não há tween ativo, e
// isso foi medido — `rAF em repouso` seguiu 0 no toque depois que o
// GSAP entrou no projeto. Se algum dia deixar de ser 0, este arquivo é o
// primeiro suspeito.

import { useEffect, useRef } from "react";

export function usarPontoSuave(refElemento) {
  const definir = useRef(null);

  useEffect(() => {
    const alvo = refElemento.current;
    if (!alvo) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let vivo = true;
    let contexto;

    if (reduzido) {
      // Sem inércia: escreve direto. Quem pediu menos movimento não
      // recebe uma marca deslizando pela tela.
      definir.current = (p) => alvo.style.setProperty("--p", String(p));
      return () => {
        vivo = false;
        definir.current = null;
      };
    }

    import("gsap").then(({ default: gsap }) => {
      if (!vivo || !refElemento.current) return;

      contexto = gsap.context(() => {
        // 0.42s é curto o bastante para não parecer atraso e longo o
        // bastante para o olho ler como deslize. Igual à sensação do
        // Lenis, que roda duration 1.2 sobre uma distância bem maior.
        const mover = gsap.quickTo(alvo, "--p", {
          duration: 0.42,
          ease: "power3.out",
        });
        definir.current = mover;
      }, alvo);
    });

    return () => {
      vivo = false;
      definir.current = null;
      contexto?.revert();
    };
  }, [refElemento]);

  /** Chamado pelo driver do scrub a cada atualização de progresso.
   *  Cai no `setProperty` cru enquanto o GSAP não carregou — a régua
   *  nunca fica parada esperando um import. */
  return (p) => {
    if (definir.current) definir.current(p);
    else refElemento.current?.style.setProperty("--p", String(p));
  };
}
