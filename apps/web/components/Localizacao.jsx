"use client";

// Localização e horários.
//
// EM NEGÓCIO LOCAL ISTO É CONVERSÃO, NÃO RODAPÉ. A pessoa já decidiu; a
// próxima pergunta dela é "onde fica e dá pra ir no sábado". Enterrar
// endereço e horário no rodapé é perder quem já estava pronta.
//
// SEM IFRAME DO GOOGLE MAPS. O embed carrega centenas de KB de JS de
// terceiro, instala cookies antes de qualquer consentimento (LGPD) e
// entra na conta do Core Web Vitals da página. O que a pessoa faz de
// verdade com um mapa incorporado é clicar para abrir o app dela — então
// entregamos o link direto, que é o que ela queria.
//
// O JSON-LD de LocalBusiness é o que coloca o consultório no mapa da
// busca. Só é emitido com endereço preenchido: schema com campo vazio é
// pior que schema ausente.

import { usarRevelar } from "@/lib/usarRevelar";
import { CLINICA, temValor, enderecoEmLinha, canalDeContato, linkInstagram } from "@/lib/clinica";
import estilos from "./secoes.module.css";

export default function Localizacao() {
  const ref = usarRevelar();
  const endereco = enderecoEmLinha();
  const temEndereco = temValor(CLINICA.endereco.logradouro);
  const emDev = process.env.NODE_ENV !== "production";

  const linkMapa = temEndereco
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
    : null;

  const jsonLd = temEndereco
    ? {
        "@context": "https://schema.org",
        "@type": "MedicalBusiness",
        name: `${CLINICA.nome} — ${CLINICA.titulo}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: [CLINICA.endereco.logradouro, CLINICA.endereco.complemento]
            .filter(temValor)
            .join(", "),
          addressLocality: CLINICA.cidade,
          addressRegion: CLINICA.uf,
          postalCode: CLINICA.endereco.cep,
          addressCountry: "BR",
        },
        openingHoursSpecification: CLINICA.horarios.map((h) => ({
          "@type": "OpeningHoursSpecification",
          description: h.dias,
          opens: h.abre,
          closes: h.fecha,
        })),
      }
    : null;

  return (
    <section className={estilos.secao} id="contato" aria-labelledby="local-titulo" data-revelar ref={ref}>
      <div className={estilos.inner}>
        <div className={estilos.coluna}>
          <span className={estilos.eyebrow}>Onde fica</span>
          <h2 id="local-titulo" className={estilos.titulo}>
            Atendimento presencial em {CLINICA.cidade}
          </h2>
        </div>

        <div className={estilos.grade}>
          <div className={estilos.cartao}>
            <h3 className={estilos.cartaoTitulo}>Endereço</h3>
            {temEndereco ? (
              <>
                <p className={estilos.cartaoTexto}>{endereco}</p>
                <a className={estilos.linkSimples} href={linkMapa} target="_blank" rel="noopener noreferrer">
                  Abrir no mapa →
                </a>
              </>
            ) : emDev ? (
              <p className={estilos.pendente}>
                Endereço pendente em lib/clinica.js. Em produção este cartão é
                omitido em vez de mostrar exemplo.
              </p>
            ) : null}
          </div>

          <div className={estilos.cartao}>
            <h3 className={estilos.cartaoTitulo}>Horários</h3>
            <ul className={estilos.horarios}>
              {CLINICA.horarios.map((h) => (
                <li key={h.dias} className={estilos.horarioItem}>
                  <span>{h.dias}</span>
                  <span className={estilos.horarioValor}>
                    {h.abre} às {h.fecha}
                  </span>
                </li>
              ))}
            </ul>
            <p className={estilos.cartaoTexto}>
              Atendimento com hora marcada. Não há atendimento por ordem de
              chegada.
            </p>
          </div>

          <div className={estilos.cartao}>
            <h3 className={estilos.cartaoTitulo}>Falar comigo</h3>
            <p className={estilos.cartaoTexto}>
              Agendamento e dúvidas rápidas pelo WhatsApp. Orientação clínica
              e indicação só na avaliação presencial.
            </p>
            <a
              className={estilos.linkSimples}
              href={canalDeContato()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Agendar avaliação →
            </a>
            <a className={estilos.linkSimples} href={linkInstagram} target="_blank" rel="noopener noreferrer">
              @{CLINICA.instagram} →
            </a>
          </div>
        </div>
      </div>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </section>
  );
}
