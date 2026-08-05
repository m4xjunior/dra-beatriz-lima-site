"use client";

import { usarRevelar } from "@/lib/usarRevelar";
import TextoRevelado from "@/components/TextoRevelado";
import estilos from "./Hero.module.css";

// A abertura. Ver o raciocínio do texto no .module.css: ela chegou do
// Instagram já considerando, então o hero reconhece em vez de vender.

export default function Hero() {
  const ref = usarRevelar();

  return (
    <header className={estilos.hero} id="topo" data-revelar ref={ref}>
      <p className={estilos.eyebrow}>Biomédica esteta · Avaliação presencial</p>

      {/* Duas linhas reveladas em cascata de palavra. A segunda entra
          depois da primeira terminar — a frase só faz sentido na ordem,
          e revelar as duas juntas entrega a virada antes do tempo. */}
      <h1 className={estilos.titulo}>
        <TextoRevelado como="span" texto="Você já sabe o que quer mudar." />
        <br />
        <TextoRevelado
          como="span"
          texto="Falta saber o que não precisa."
          atraso={0.42}
          destaque="não"
          classeDestaque={estilos.humana}
        />
      </h1>

      <p className={estilos.corpo}>
        A maior parte da consulta é sobre o que não fazer. Dose, proporção e o
        que já está certo no seu rosto — antes de qualquer agulha.
      </p>

      <p className={estilos.pista}>Role para acompanhar</p>
    </header>
  );
}
