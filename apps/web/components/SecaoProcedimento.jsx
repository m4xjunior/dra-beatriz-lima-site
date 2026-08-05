"use client";

// Uma seção = um procedimento = um rosto = um vídeo.
//
// Substitui o PalcoHero, que era um palco único atravessando a página.
// O que sobrevive inteiro daquele componente: a escolha de arquivo por
// matchMedia, as guardas de reduced-motion e Save-Data, e o driver v5.
// O que muda: o progresso é medido DENTRO desta seção.
//
// Só o v2/scrub_video serve. O v2/web_video tem 3 keyframes em 217
// quadros — cada seek decodificaria até 70. O scrub_video tem 56 (GOP 4).

import { useEffect, useRef, useState } from "react";
import { iniciarScrubDeVideo } from "@/lib/usarScrubDeVideo";
import { videoProvisorio } from "@/lib/procedimentos";
import estilos from "./SecaoProcedimento.module.css";

function escolherFonte(procedimento, { estreito, toque, lenta }) {
  // O rosto próprio do procedimento quando existir; o clipe da Dra.
  // enquanto não. Degradar sem quebrar é requisito, não conveniência.
  const fontes = procedimento.video ?? videoProvisorio;

  if (estreito) {
    if (lenta) return fontes.mobileLeve;
    const tablet = window.innerWidth >= 700;
    const redeBoa = (navigator.connection?.effectiveType ?? "4g") === "4g";
    return !toque || (tablet && redeBoa) ? fontes.mobile : fontes.mobileLeve;
  }
  const pixels = window.innerWidth * (window.devicePixelRatio || 1);
  return pixels > 2200 ? fontes.desktopGrande : fontes.desktop;
}

export default function SecaoProcedimento({
  procedimento,
  primeira = false,
  aoProgredir,
  children,
}) {
  const refSecao = useRef(null);
  const refVideo = useRef(null);
  const [poster, setPoster] = useState(null);

  useEffect(() => {
    const video = refVideo.current;
    const secao = refSecao.current;
    if (!video || !secao) return;

    const estreito = window.matchMedia("(max-width: 920px)").matches;
    const toque = window.matchMedia("(pointer: coarse)").matches;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const conexao = navigator.connection;
    const lenta =
      conexao?.saveData === true ||
      ["slow-2g", "2g", "3g"].includes(conexao?.effectiveType ?? "");

    const fontes = procedimento.video ?? videoProvisorio;
    const urlPoster = estreito ? fontes.posterMobile : fontes.posterDesktop;
    setPoster(urlPoster);
    video.poster = urlPoster;

    // Guardas de acessibilidade e de dado móvel: fica só no poster, sem
    // baixar um byte de vídeo. Regra do design system, não sugestão.
    if (reduzido || (estreito && lenta)) return;

    video.src = escolherFonte(procedimento, { estreito, toque, lenta });
    video.loop = true;

    // ORÇAMENTO POR DOBRA, NÃO POR PÁGINA: só a primeira seção paga a
    // conta do corpo do vídeo antes de aparecer. Com 7 procedimentos a
    // ~2,8 MB, baixar tudo de uma vez seriam ~19 MB no caminho crítico.
    video.preload = primeira ? "auto" : "none";

    return iniciarScrubDeVideo(video, secao, aoProgredir);
  }, [procedimento, primeira, aoProgredir]);

  const dobras = procedimento.dobras ?? 3;

  return (
    <section
      ref={refSecao}
      className={estilos.secao}
      style={{ minHeight: `${dobras * 100}svh` }}
      aria-label={procedimento.nome}
    >
      <div className={estilos.palco} aria-hidden="true">
        {poster && (
          <div
            className={estilos.poster}
            style={{ backgroundImage: `url("${poster}")` }}
          />
        )}
        <video
          ref={refVideo}
          className={estilos.video}
          muted
          playsInline
          preload="metadata"
        />
        <div className={estilos.scrim} />
      </div>

      <div className={estilos.conteudo}>{children}</div>
    </section>
  );
}
