"use client";

// CTA de agendamento.
//
// APARECE MAIS DE UMA VEZ NA PÁGINA, e por isso o texto vem por prop. Um
// CTA único no topo perde todo mundo que decidiu no meio — e repetir o
// MESMO texto três vezes faz a página soar como um anúncio em loop. Cada
// aparição fala do que a pessoa acabou de ler.
//
// O destino sai de `canalDeContato()`: wa.me com a mensagem já escrita,
// caindo no Instagram enquanto o número não estiver preenchido. A
// mensagem pronta não é enfeite — sem ela a paciente abre a conversa em
// branco, trava no "oi" e boa parte desiste ali.

import { usarRevelar } from "@/lib/usarRevelar";
import { canalDeContato } from "@/lib/clinica";
import estilos from "./secoes.module.css";

export default function ChamadaAgendamento({
  titulo = "A avaliação é o passo que não tem volta atrás",
  texto = "Sair dela sem marcar nada é um desfecho possível e frequente. O que você leva é uma indicação clara sobre o seu rosto.",
  rotulo = "Agendar avaliação",
  assunto,
  alt = false,
}) {
  const ref = usarRevelar();

  return (
    <section
      className={`${estilos.secao} ${alt ? estilos.secaoAlt : ""} ${estilos.chamada}`}
      aria-labelledby={`cta-${rotulo.replace(/\s+/g, "-").toLowerCase()}`}
      data-revelar
      ref={ref}
    >
      <div className={`${estilos.inner} ${estilos.chamadaInner}`}>
        <h2
          id={`cta-${rotulo.replace(/\s+/g, "-").toLowerCase()}`}
          className={estilos.titulo}
        >
          {titulo}
        </h2>
        <p className={estilos.chamadaTexto}>{texto}</p>
        <a
          className={estilos.chamadaBotao}
          href={canalDeContato(assunto)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {rotulo}
        </a>
      </div>
    </section>
  );
}
