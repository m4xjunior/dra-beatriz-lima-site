"use client";

// Sobre — o vínculo.
//
// DIFERENTE DA CREDENCIAL, e a distinção decide o texto: credencial é o
// que autoriza (registro, formação, rastreio de produto); esta dobra é o
// que faz escolher ELA e não outra pessoa igualmente habilitada.
//
// Serviço prestado por uma pessoa se compra da pessoa. Sem esta dobra o
// site vende procedimento, e procedimento é commodity: quem compra
// procedimento compara preço, quem escolhe profissional não.
//
// Escrito em primeira pessoa de propósito. Um "a Dra. Beatriz acredita
// que" na terceira pessoa, num site de uma profissional só, soa a
// assessoria — e afasta exatamente onde deveria aproximar.
//
// O retrato entra por prop: o arquivo definitivo ainda não existe e a
// dobra não pode depender dele para renderizar.

import { usarRevelar } from "@/lib/usarRevelar";
import { CLINICA } from "@/lib/clinica";
import estilos from "./secoes.module.css";

export default function Sobre({ retrato }) {
  const ref = usarRevelar();

  return (
    <section className={estilos.secao} id="sobre" aria-labelledby="sobre-titulo" data-revelar ref={ref}>
      <div className={`${estilos.inner} ${estilos.duasColunas}`}>
        <div className={estilos.coluna}>
          <span className={estilos.eyebrow}>Sobre</span>
          <h2 id="sobre-titulo" className={estilos.titulo}>
            A parte mais difícil é saber o que deixar quieto
          </h2>

          <p className={estilos.corpo}>
            Quem chega até mim quase sempre já viu um rosto na internet e
            trouxe a foto. Meu trabalho começa antes disso: entender o que no
            seu rosto já funciona, e o que está pedindo ajuda de verdade.
          </p>

          <p className={estilos.corpo}>
            Escolhi a biomedicina estética porque ela obriga a olhar a
            anatomia antes da tendência. Dose, plano de aplicação e proporção
            não são estilo pessoal — são leitura do rosto que está na minha
            frente. É por isso que eu não trabalho com protocolo pronto: o
            protocolo serve à média, e ninguém é a média.
          </p>

          <p className={estilos.corpo}>
            Se a minha avaliação disser que não é hora de fazer nada, é isso
            que eu vou te dizer. Prefiro perder um procedimento a devolver
            para você um rosto que não é o seu.
          </p>

          <p className={estilos.assinatura}>
            {CLINICA.nome}
            <span className={estilos.assinaturaTitulo}>
              {CLINICA.titulo} · {CLINICA.cidade}
            </span>
          </p>
        </div>

        {retrato && (
          <figure className={estilos.retrato}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={retrato.src}
              width={retrato.largura}
              height={retrato.altura}
              alt={`${CLINICA.nome}, ${CLINICA.titulo}`}
              loading="lazy"
              decoding="async"
            />
          </figure>
        )}
      </div>
    </section>
  );
}
