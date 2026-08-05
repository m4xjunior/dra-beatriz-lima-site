"use client";

// Rodapé.
//
// CARREGA O DISCLAIMER REGULATÓRIO, e ele não tem prop que o remova.
// A CFBM Res. 330/2020 exige a presença; deixar o texto configurável é
// deixá-lo apagável, e um dia alguém apaga. Mesma política que existia
// no <Disclaimer> do site antigo.
//
// `data-rodape` no elemento: é o gancho que o BotaoWhatsapp observa para
// recuar e não tapar o CTA daqui. Um atributo de dado em vez de classe,
// para o botão não depender do nome de estilo deste componente.
//
// Razão social, CNPJ e CRBM saem quando vazios em vez de virarem "—".

import { CLINICA, temValor, enderecoEmLinha, linkInstagram } from "@/lib/clinica";
import estilos from "./Rodape.module.css";

const DISCLAIMER =
  "Conteúdo com finalidade informativa. Não substitui avaliação clínica presencial. Procedimentos estéticos não têm resultado garantido: cada indicação depende do seu histórico e da sua avaliação individual, conforme a Resolução CFBM nº 330/2020.";

export default function Rodape() {
  const endereco = enderecoEmLinha();
  const ano = 2026;

  const legais = [
    temValor(CLINICA.razaoSocial) && CLINICA.razaoSocial,
    temValor(CLINICA.cnpj) && `CNPJ ${CLINICA.cnpj}`,
    temValor(CLINICA.crbm) && `CRBM ${CLINICA.crbm}`,
  ].filter(Boolean);

  return (
    <footer className={estilos.rodape} data-rodape>
      <div className={estilos.inner}>
        <div className={estilos.marca}>
          <p className={estilos.nome}>{CLINICA.nome}</p>
          <p className={estilos.titulo}>
            {CLINICA.titulo} · {CLINICA.cidade}/{CLINICA.uf}
          </p>
          {temValor(endereco) && <p className={estilos.linha}>{endereco}</p>}
        </div>

        <nav className={estilos.links} aria-label="Rodapé">
          <a className={estilos.link} href="#procedimentos">Procedimentos</a>
          <a className={estilos.link} href="#resultados">Resultados</a>
          <a className={estilos.link} href="#sobre">Sobre</a>
          <a className={estilos.link} href="#contato">Onde fica</a>
          <a className={estilos.link} href="/privacidade">Privacidade</a>
          <a className={estilos.link} href={linkInstagram} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        </nav>

        <p className={estilos.disclaimer} role="note">
          {DISCLAIMER}
        </p>

        <p className={estilos.legal}>
          {legais.length > 0 && <span>{legais.join(" · ")}</span>}
          <span>© {ano} {CLINICA.nome}</span>
        </p>
      </div>
    </footer>
  );
}
