"use client";

// Botão flutuante de WhatsApp.
//
// É COMO CLÍNICA CONVERTE NO BRASIL. Não é enfeite de template: o canal
// de agendamento real é este, e escondê-lo atrás de um scroll até o
// rodapé custa contato.
//
// TRÊS CUIDADOS QUE ELE COSTUMA VIOLAR:
//
// 1. Alvo de 44x44 px no mínimo (regra crítica de toque). Aqui são 56.
// 2. Não pode cobrir o CTA do rodapé no celular — por isso ele SOME
//    quando o rodapé entra em cena, via IntersectionObserver. Um botão
//    fixo tapando o botão que a pessoa foi buscar é o pior caso.
// 3. Não aparece antes de a pessoa ter lido alguma coisa. Botão de
//    contato saltando na primeira dobra interrompe em vez de servir.
//
// Some inteiro se o número não estiver preenchido: um flutuante que leva
// ao Instagram promete uma coisa e entrega outra.

import { useEffect, useRef, useState } from "react";
import { linkWhatsapp } from "@/lib/clinica";
import estilos from "./BotaoWhatsapp.module.css";

export default function BotaoWhatsapp({ assunto }) {
  const href = linkWhatsapp(assunto);
  const [visivel, setVisivel] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!href) return;

    const aoRolar = () => setVisivel(window.scrollY > window.innerHeight * 0.8);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });

    // Recua na frente do rodapé. O alvo é marcado com data-rodape para
    // este componente não depender do nome da classe do outro.
    const rodape = document.querySelector("[data-rodape]");
    let obs;
    if (rodape) {
      obs = new IntersectionObserver(
        ([e]) => ref.current?.setAttribute("data-recuado", String(e.isIntersecting)),
        { rootMargin: "0px 0px -40% 0px" },
      );
      obs.observe(rodape);
    }

    return () => {
      window.removeEventListener("scroll", aoRolar);
      obs?.disconnect();
    };
  }, [href]);

  if (!href) return null;

  return (
    <a
      ref={ref}
      className={estilos.botao}
      data-visivel={String(visivel)}
      data-recuado="false"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Agendar avaliação pelo WhatsApp"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="currentColor">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.96L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.38c0-4.54 3.7-8.23 8.24-8.23a8.18 8.18 0 0 1 8.23 8.24c0 4.54-3.69 8.23-8.23 8.23Z" />
      </svg>
    </a>
  );
}
