"use client";

// Revelação palavra a palavra, com GSAP.
//
// POR QUE GSAP AQUI E CSS NO RESTO:
// a cascata das dobras (revelar.css) é CSS puro de propósito — transição
// no compositor, fora da main thread, sem disputar quadro com o scrub.
// Isto aqui CSS não faz: dividir um texto em palavras exige criar
// elementos, e escalonar dezenas deles com curva própria é o que o
// stagger do GSAP resolve numa linha.
//
// SEM ScrollTrigger, de propósito. O gatilho é IntersectionObserver, o
// mesmo de usarRevelar. Trazer ScrollTrigger obrigaria a ligar o Lenis a
// ele (lenis.on('scroll', ScrollTrigger.update) + gsap.ticker), senão
// rodam dois loops de rAF — e o segundo loop é exatamente o que a v5 do
// scrub removeu para chegar a custo zero em repouso.
//
// A divisão preserva o texto para leitor de tela: o elemento externo
// mantém aria-label com a frase inteira, e as palavras vão aria-hidden.
// Sem isso o leitor anuncia palavra por palavra, com pausa em cada uma.

import { useEffect, useRef } from "react";

export default function TextoRevelado({
  texto,
  como: Tag = "span",
  className,
  atraso = 0,
  /** Palavra que recebe a serifa itálica — a voz humana dentro do
   *  grotesco. UMA por headline: é regra escrita em direcao-visual.md, e
   *  esticar isso mata o efeito. */
  destaque,
  classeDestaque,
  ...resto
}) {
  const ref = useRef(null);

  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) {
      alvo.style.opacity = "1";
      return;
    }

    let contexto;
    let observador;
    let vivo = true;

    import("gsap").then(({ default: gsap }) => {
      // Strict Mode desmonta e remonta em dev: sem esta guarda o import
      // assíncrono do primeiro mount resolveria depois do cleanup e
      // deixaria um contexto de GSAP órfão animando um nó descartado.
      if (!vivo || !ref.current) return;

      const palavras = alvo.querySelectorAll("[data-palavra]");
      gsap.set(alvo, { opacity: 1 });
      gsap.set(palavras, { yPercent: 108, opacity: 0 });

      observador = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (!e.isIntersecting) continue;
            observador.unobserve(e.target);

            contexto = gsap.context(() => {
              gsap.to(palavras, {
                yPercent: 0,
                opacity: 1,
                duration: 0.9,
                delay: atraso,
                // power3.out é a exponencial que a direção pede.
                // Bounce é proibido por escrito em direcao-visual.md.
                ease: "power3.out",
                stagger: 0.055,
              });
            }, alvo);
          }
        },
        { rootMargin: "0px 0px -14% 0px", threshold: 0.01 },
      );
      observador.observe(alvo);
    });

    return () => {
      vivo = false;
      observador?.disconnect();
      contexto?.revert();
    };
  }, [texto, atraso]);

  // opacity 0 no servidor evita o lampejo do texto inteiro antes de o
  // GSAP assumir. O reduced-motion acima devolve a 1 sem animar.
  return (
    <Tag ref={ref} className={className} style={{ opacity: 0 }} aria-label={texto} {...resto}>
      {texto.split(" ").map((palavra, i) => (
        <span
          key={`${palavra}-${i}`}
          aria-hidden="true"
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}
        >
          <span data-palavra style={{ display: "inline-block" }}>
            {palavra}
          </span>
          {i < texto.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
