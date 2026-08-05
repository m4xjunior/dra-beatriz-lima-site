"use client";

// Depoimentos.
//
// NÃO É A MESMA COISA QUE A GALERIA, e trocar um pelo outro é o erro
// comum desta dobra. A foto mostra o que mudou no rosto. O depoimento
// mostra como foi SER ATENDIDA — se doeu, se foi explicado, se ela
// voltaria. É a segunda pergunta que trava o agendamento, e nenhuma foto
// responde.
//
// POSIÇÃO: imediatamente antes do CTA. É o padrão "Hero-Centric + Social
// Proof" que o ui-ux-pro-max devolve para beauty/wellness — a última
// coisa que a pessoa lê antes de decidir tem que ser outra pessoa
// dizendo que deu certo.
//
// A SEÇÃO SOME QUANDO NÃO HÁ DEPOIMENTO COM TERMO. Não existe estado de
// "em breve" nem cartão de exemplo: depoimento inventado é avaliação
// falsa. Ver lib/depoimentos.js.

import { usarRevelar } from "@/lib/usarRevelar";
import { depoimentosPublicaveis } from "@/lib/depoimentos";
import estilos from "./secoes.module.css";

export default function Depoimentos() {
  const ref = usarRevelar();
  const itens = depoimentosPublicaveis();

  if (itens.length === 0) return null;

  return (
    <section
      className={`${estilos.secao} ${estilos.secaoAlt}`}
      aria-labelledby="depoimentos-titulo"
      data-revelar
      ref={ref}
    >
      <div className={estilos.inner}>
        <div className={estilos.coluna}>
          <span className={estilos.eyebrow}>Quem já passou por aqui</span>
          <h2 id="depoimentos-titulo" className={estilos.titulo}>
            Como foi, na palavra de quem sentou na cadeira
          </h2>
        </div>

        <ul className={estilos.grade}>
          {itens.map((d) => (
            <li key={d.nome + d.contexto} className={estilos.cartao}>
              <blockquote className={estilos.citacao}>
                <p className={estilos.citacaoTexto}>{d.texto}</p>
                <footer className={estilos.citacaoAutor}>
                  <cite className={estilos.citacaoNome}>{d.nome}</cite>
                  <span className={estilos.citacaoContexto}>{d.contexto}</span>
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
