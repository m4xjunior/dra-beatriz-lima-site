"use client";

// Credencial — o bloco de autoridade.
//
// POSIÇÃO: vem ANTES dos procedimentos, e isso não é gosto. O
// ui-ux-pro-max classifica clínica como "Trust & Authority + Conversion",
// onde a prova de habilitação precede a oferta. Ninguém lê a lista de
// procedimentos de alguém que ainda não sabe se é habilitado para
// executá-los.
//
// DIFERENTE DA DOBRA "SOBRE": aqui é o que AUTORIZA (registro, formação).
// Lá é o que cria VÍNCULO (quem ela é, por que essa profissão). Juntar as
// duas transforma credencial em biografia, e biografia não autoriza nada.
//
// O CRBM SOME QUANDO NÃO EXISTE. Enquanto `CLINICA.crbm` estiver vazio, o
// selo não renderiza em produção — em desenvolvimento aparece um aviso.
// Inventar número de registro profissional para "ver o layout" é o tipo
// de placeholder que vai ao ar sem ninguém notar.

import { usarRevelar } from "@/lib/usarRevelar";
import { CLINICA, temValor } from "@/lib/clinica";
import estilos from "./secoes.module.css";

const FORMACAO = [
  {
    titulo: "Biomedicina",
    texto:
      "Formação em biomedicina, com habilitação em estética pelo Conselho Federal de Biomedicina. A habilitação é o que define quais procedimentos podem ser executados, e por quem.",
  },
  {
    titulo: "Avaliação antes de indicação",
    texto:
      "Nenhum procedimento é vendido por telefone ou por mensagem. A indicação nasce do exame do seu rosto e do seu histórico de saúde, presencialmente.",
  },
  {
    titulo: "Produtos rastreáveis",
    texto:
      "Todo produto injetável usado é registrado na Anvisa, com lote conferido e anotado no seu prontuário. Você pode pedir para ver a embalagem antes da aplicação.",
  },
];

export default function Credencial() {
  const ref = usarRevelar();
  const temRegistro = temValor(CLINICA.crbm);
  const emDev = process.env.NODE_ENV !== "production";

  return (
    <section className={estilos.secao} aria-labelledby="credencial-titulo" data-revelar ref={ref}>
      <div className={estilos.inner}>
        <div className={estilos.coluna}>
          <span className={estilos.eyebrow}>Quem atende</span>
          <h2 id="credencial-titulo" className={estilos.titulo}>
            Habilitação, não afinidade com o assunto
          </h2>
          <p className={estilos.corpo}>
            Procedimento injetável é ato de saúde. Antes de escolher o que
            fazer, vale saber quem pode fazer — e com base em quê.
          </p>
        </div>

        {temRegistro && (
          <p className={estilos.registro}>
            <span className={estilos.registroRotulo}>Registro profissional</span>
            <span className={estilos.registroValor}>CRBM {CLINICA.crbm}</span>
          </p>
        )}

        {!temRegistro && emDev && (
          <p className={estilos.pendente}>
            CRBM pendente em lib/clinica.js — obrigatório na divulgação (CFBM
            330/2020). Este aviso não aparece em produção.
          </p>
        )}

        <ul className={estilos.grade}>
          {FORMACAO.map((item) => (
            <li key={item.titulo} className={estilos.cartao}>
              <h3 className={estilos.cartaoTitulo}>{item.titulo}</h3>
              <p className={estilos.cartaoTexto}>{item.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
