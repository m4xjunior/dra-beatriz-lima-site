"use client";

// FAQ.
//
// <details>/<summary> NATIVOS, e não sanfona em React. O elemento nativo
// já traz abrir/fechar por teclado, papel de ARIA correto, e — o que
// decide — o conteúdo fica no HTML mesmo fechado, então busca e leitor
// de tela leem tudo. Uma sanfona que monta o painel só ao abrir esconde
// do Google justamente a dobra que existe para ser encontrada.
//
// SEM `name` COMPARTILHADO nos <details>: agrupar faria abrir uma fechar
// a outra. Numa lista de dúvidas a pessoa quer comparar duas respostas
// lado a lado, não perder a primeira ao abrir a segunda.
//
// O JSON-LD de FAQPage vai junto. Sem ele a dobra existe e o Google não
// a usa — é metade do motivo de ela estar no site.

import { usarRevelar } from "@/lib/usarRevelar";
import { PERGUNTAS } from "@/lib/faq";
import estilos from "./secoes.module.css";

export default function Faq() {
  const ref = usarRevelar();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PERGUNTAS.map(({ p, r }) => ({
      "@type": "Question",
      name: p,
      acceptedAnswer: { "@type": "Answer", text: r },
    })),
  };

  return (
    <section className={estilos.secao} aria-labelledby="faq-titulo" data-revelar ref={ref}>
      <div className={estilos.inner}>
        <div className={estilos.coluna}>
          <span className={estilos.eyebrow}>Dúvidas</span>
          <h2 id="faq-titulo" className={estilos.titulo}>
            As perguntas que chegam antes do agendamento
          </h2>
          <p className={estilos.corpo}>
            Se a sua não estiver aqui, me pergunte direto. Nenhuma dúvida
            sobre o próprio corpo é boba.
          </p>
        </div>

        <div className={estilos.faqLista}>
          {PERGUNTAS.map(({ p, r }) => (
            <details key={p} className={estilos.faqItem}>
              <summary className={estilos.faqPergunta}>
                <span>{p}</span>
                <svg
                  className={estilos.faqSinal}
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <p className={estilos.faqResposta}>{r}</p>
            </details>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
