"use client";

// A régua de instalação. Ver o porquê do desenho em .module.css.
//
// O componente é presentacional de propósito: quem escreve `--p` é o
// driver do scrub, direto no DOM, sem passar pelo React. Só a troca de
// MARCO (8 vezes na página inteira) vira state.

import { MARCOS } from "@/lib/tratamento";
import estilos from "./ReguaInstalacao.module.css";

export default function ReguaInstalacao({ refTrilho, marco, progresso = 0, procedimento }) {
  return (
    <div className={estilos.regua} ref={refTrilho}>
      <div className={estilos.trilho}>
        {MARCOS.map((m) => (
          <span
            key={`${m.dia}-${m.p}`}
            className={`${estilos.marca} ${progresso >= m.p ? estilos.marcaPassada : ""}`}
            style={{ top: `${m.p * 100}%`, left: `${m.p * 100}%` }}
          />
        ))}
        <span className={estilos.agora} />
      </div>

      <div className={estilos.leitura}>
        {procedimento && <span className={estilos.procedimento}>{procedimento}</span>}
        <span className={estilos.dia}>
          Dia {String(marco.dia).padStart(2, "0")}
        </span>
        <span className={estilos.fase}>{marco.fase}</span>
        <span className={estilos.dose}>
          {marco.unidades > 0 ? `${marco.unidades} U acumuladas` : "sem aplicação"}
        </span>
        {marco.pontos.length > 0 && (
          <span className={estilos.regiao}>
            {marco.pontos.map((p) => p.regiao).join(" · ")}
          </span>
        )}
        <p className={estilos.reversivel}>
          Suba a página para voltar ao dia 0. Na pele também volta: a
          toxina metaboliza em 3 a 4 meses.
        </p>
      </div>
    </div>
  );
}
