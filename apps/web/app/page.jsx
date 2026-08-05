"use client";

// A rota do procedimento.
//
// O scroll comanda duas coisas ao mesmo tempo: o quadro do vídeo (via
// currentTime, no driver) e a posição da régua (via custom property).
// Nenhuma das duas passa por state a cada quadro — state aqui só muda
// quando troca o MARCO, 8 vezes na página inteira. Reposicionar por
// state a 60fps re-renderizaria a árvore toda a cada quadro do scroll.

import { useCallback, useRef, useState } from "react";
import PalcoHero from "@/components/PalcoHero";
import ColunaClinica from "@/components/ColunaClinica";
import ReguaInstalacao from "@/components/ReguaInstalacao";
import { MARCOS, marcoEm } from "@/lib/tratamento";

export default function Pagina() {
  const refRegua = useRef(null);
  const [marco, setMarco] = useState(MARCOS[0]);
  const [progresso, setProgresso] = useState(0);

  // useCallback com deps vazias: a identidade precisa ser estável, senão
  // o efeito do PalcoHero (que tem aoProgredir na lista de deps) religa
  // o driver a cada render — dois drivers, scrub em dobro.
  const aoProgredir = useCallback((p) => {
    refRegua.current?.style.setProperty("--p", String(p));

    const novo = marcoEm(p);
    setMarco((anterior) => (anterior === novo ? anterior : novo));
    // Arredonda para dois passos por marco: o suficiente para as marcas
    // passadas acenderem, sem re-render por quadro.
    setProgresso((anterior) => {
      const grosso = Math.round(p * 20) / 20;
      return anterior === grosso ? anterior : grosso;
    });
  }, []);

  return (
    <main>
      <PalcoHero dobras={MARCOS.length} aoProgredir={aoProgredir}>
        <ColunaClinica />
      </PalcoHero>
      <ReguaInstalacao refTrilho={refRegua} marco={marco} progresso={progresso} />
    </main>
  );
}
