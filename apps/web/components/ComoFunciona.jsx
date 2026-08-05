"use client";

// Como funciona — os três passos.
//
// EXISTE PARA DISSOLVER A ANSIEDADE DO DESCONHECIDO, que é o que faz a
// pessoa fechar a aba em vez de mandar mensagem. Ela não desiste porque
// achou caro; desiste porque não sabe o que vai acontecer com ela.
//
// É também onde "avaliação individual" — a posição clínica da marca —
// deixa de ser slogan e vira uma coisa concreta com duração e conteúdo.
//
// O passo 1 diz explicitamente que a indicação pode ser NÃO FAZER NADA.
// Essa frase é a que mais separa este site de uma clínica que vende
// pacote, e é a única prova possível de que a avaliação é avaliação.

import { usarRevelar } from "@/lib/usarRevelar";
import estilos from "./secoes.module.css";

const PASSOS = [
  {
    n: "01",
    titulo: "Avaliação",
    duracao: "cerca de 40 minutos",
    texto:
      "Conversamos sobre o que te incomoda, eu examino o seu rosto e levanto o seu histórico de saúde e de procedimentos anteriores. Você sai com uma indicação clara — que pode ser não fazer nada agora. Nada é fechado no mesmo dia por obrigação.",
  },
  {
    n: "02",
    titulo: "Procedimento",
    duracao: "de 20 a 60 minutos",
    texto:
      "Antes de começar eu mostro o produto, o lote e o que vou fazer em cada região. Durante, você pode pedir pausa a qualquer momento. Você acompanha o que está sendo feito, não descobre depois.",
  },
  {
    n: "03",
    titulo: "Retorno",
    duracao: "de 15 a 30 dias",
    texto:
      "Reavaliamos juntas o que aconteceu. É no retorno que se ajusta o que precisa de ajuste — e é por isso que ele já faz parte do procedimento, não é uma consulta nova.",
  },
];

export default function ComoFunciona() {
  const ref = usarRevelar();

  return (
    <section
      className={`${estilos.secao} ${estilos.secaoAlt}`}
      aria-labelledby="como-titulo"
      data-revelar
      ref={ref}
    >
      <div className={estilos.inner}>
        <div className={estilos.coluna}>
          <span className={estilos.eyebrow}>Como funciona</span>
          <h2 id="como-titulo" className={estilos.titulo}>
            Três encontros, e você sabe o que acontece em cada um
          </h2>
          <p className={estilos.corpo}>
            O medo de procedimento estético quase nunca é do resultado. É de
            não saber o que vem pela frente.
          </p>
        </div>

        <ol className={estilos.grade}>
          {PASSOS.map((passo) => (
            <li key={passo.n} className={estilos.cartao}>
              <span className={estilos.passoNumero} aria-hidden="true">
                {passo.n}
              </span>
              <h3 className={estilos.cartaoTitulo}>{passo.titulo}</h3>
              <p className={estilos.passoDuracao}>{passo.duracao}</p>
              <p className={estilos.cartaoTexto}>{passo.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
