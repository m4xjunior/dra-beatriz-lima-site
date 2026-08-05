"use client";

// A home: uma seção por procedimento.
//
// Deixou de ser um palco único atravessando a página (decisão do Max em
// 05/08/2026). Cada procedimento comanda o seu próprio rosto, e o
// progresso do scrub é medido dentro da própria seção.
//
// A régua acompanha a seção ATIVA. Ela não passa por state a cada quadro
// — quem escreve `--p` é o driver, direto no DOM. State aqui só muda
// quando troca o MARCO ou a SEÇÃO, o que acontece dezenas de vezes na
// página inteira, não sessenta vezes por segundo.

import { useEffect, useMemo, useRef, useState } from "react";
import SecaoProcedimento from "@/components/SecaoProcedimento";
import MedidorFling from "@/components/MedidorFling";
import ColunaClinica from "@/components/ColunaClinica";
import ReguaInstalacao from "@/components/ReguaInstalacao";
import SecaoProcedimentos from "@/components/galeria/SecaoProcedimentos";
import Credencial from "@/components/Credencial";
import Depoimentos from "@/components/Depoimentos";
import ChamadaAgendamento from "@/components/ChamadaAgendamento";
import ComoFunciona from "@/components/ComoFunciona";
import Sobre from "@/components/Sobre";
import Faq from "@/components/Faq";
import Localizacao from "@/components/Localizacao";
import Hero from "@/components/Hero";
// PROCEDIMENTOS_HOME, não PROCEDIMENTOS: o catálogo cresceu de 3 para 8
// e a home montaria oito palcos de vídeo em sequência — vinte e quatro
// dobras de scrub antes de qualquer prova social. Os oito vivem em
// /procedimentos/[slug], que é a rota que ranqueia.
import { PROCEDIMENTOS_HOME } from "@/lib/procedimentos";
import { MARCOS, marcoEm } from "@/lib/tratamento";
import { usarPontoSuave } from "@/lib/usarPontoSuave";

export default function Pagina() {
  const refRegua = useRef(null);
  const [marco, setMarco] = useState(MARCOS[0]);
  const [progresso, setProgresso] = useState(0);
  const [ativo, setAtivo] = useState(PROCEDIMENTOS_HOME[0].slug);
  // A régua não existe até um procedimento estar de fato na tela. Antes
  // disso ela mostrava "Dia 00 · sem aplicação" durante o hero, dando
  // leitura clínica a uma dobra que ainda não é clínica.
  const [reguaVisivel, setReguaVisivel] = useState(false);
  // O ponto do agora deixa de saltar e passa a perseguir o scroll com
  // inércia curta (gsap.quickTo). Ver o porquê em lib/usarPontoSuave.js.
  const moverPonto = usarPontoSuave(refRegua);

  // Um callback POR SEÇÃO, com identidade estável. Sem o useMemo, cada
  // render criaria funções novas e o efeito de cada SecaoProcedimento
  // (que tem aoProgredir nas deps) religaria o driver — N drivers
  // duplicados em vez de um.
  const callbacks = useMemo(
    () =>
      Object.fromEntries(
        PROCEDIMENTOS_HOME.map((p) => [
          p.slug,
          (valor) => {
            // Só a seção que está de fato sob o dedo comanda a régua. As
            // outras continuam reportando 0 ou 1 (estão fora de vista) e
            // sobrescreveriam a leitura se não fossem filtradas aqui.
            if (valor <= 0 || valor >= 1) return;
            setReguaVisivel(true);
            setAtivo((anterior) => (anterior === p.slug ? anterior : p.slug));
            moverPonto(valor);

            const novo = marcoEm(valor);
            setMarco((anterior) => (anterior === novo ? anterior : novo));
            setProgresso((anterior) => {
              const grosso = Math.round(valor * 20) / 20;
              return anterior === grosso ? anterior : grosso;
            });
          },
        ]),
      ),
    [],
  );

  const nomeAtivo =
    PROCEDIMENTOS_HOME.find((p) => p.slug === ativo)?.nome ?? PROCEDIMENTOS_HOME[0].nome;

  // Medidor de fling, só com ?medir=1. Lido depois da montagem porque
  // ler location no corpo do componente quebraria a hidratação — foi
  // exatamente esse tipo de divergência servidor/cliente que produziu o
  // único erro de console desta sessão.
  const [medindo, setMedindo] = useState(false);
  useEffect(() => {
    setMedindo(new URLSearchParams(window.location.search).has("medir"));
  }, []);

  return (
    <main>
      {medindo && <MedidorFling />}
      {PROCEDIMENTOS_HOME.map((p, i) => (
        <SecaoProcedimento
          key={p.slug}
          procedimento={p}
          primeira={i === 0}
          aoProgredir={callbacks[p.slug]}
        >
          {/* O Hero vive DENTRO da primeira seção, não antes dela.
              Fora do palco ele caía sobre preto chapado e a página abria
              sem a presença dela — que é a premissa do site inteiro.
              Aqui ele divide o mesmo <video> pregado por sticky. */}
          {i === 0 && <Hero />}
          <ColunaClinica />
        </SecaoProcedimento>
      ))}

      {/* Galeria de resultados. Fica DEPOIS das seções de procedimento: o
          rosto animado é o argumento, o antes/depois é a prova, e prova vem
          depois do argumento. Em dev entra com previa={true} e os itens sem
          termo de consentimento aparecem marcados como PRÉVIA; em produção a
          seção retorna null enquanto nenhum termo existir (CFBM 330/2020). */}
      {/* Âncora do link "Resultados" da nav.
          PROVISÓRIA E FORA DO LUGAR: o id deveria estar na <section> do
          SecaoProcedimentos, mas aquele componente é da s000 e hoje
          carrega id="procedimentos" — que além de tudo é o nome errado
          para a galeria de resultados. Medido em 05/08/2026: a nav
          apontava para #resultados e o alvo não existia em lugar nenhum
          da página. Quando o id for corrigido lá dentro, este <span>
          sai. */}
      <span id="resultados" aria-hidden="true" />
      <SecaoProcedimentos previa={process.env.NODE_ENV !== "production"} />

      {/* --------------------------------------------------------------
          Dobras de leitura. Ordem de specs/arquitetura-de-secoes.md, que
          cruza dois padrões do ui-ux-pro-max: "Trust & Authority +
          Conversion" (clínica médica) e "Hero-Centric + Social Proof"
          (beauty/wellness). Dele vêm as duas regras que mandam na ordem:
          credencial antes da oferta, prova social antes do CTA.

          DESVIO DECLARADO: a arquitetura pedia Credencial ANTES dos
          procedimentos. Aqui ela vem depois, porque o Hero mora dentro
          da primeira seção de scrub e pôr credencial antes empurraria um
          bloco de texto para cima da abertura do site. O princípio
          ("habilitação antes da decisão") continua respeitado: a decisão
          começa nos resultados, e a credencial vem antes deles.
          -------------------------------------------------------------- */}
      <Credencial />

      <Depoimentos />

      <ChamadaAgendamento
        titulo="A avaliação é o passo que não tem volta atrás"
        texto="Sair dela sem marcar nada é um desfecho possível e frequente. O que você leva é uma indicação clara sobre o seu rosto."
        alt
      />

      <ComoFunciona />

      <Sobre />

      <Faq />

      <Localizacao />

      {/* Segundo CTA, texto diferente do primeiro de propósito: quem
          chegou até aqui já leu tudo, e repetir a mesma frase faria a
          página soar como anúncio em loop. */}
      <ChamadaAgendamento
        titulo="Se ficou alguma dúvida, ela some numa conversa"
        texto="Me chame no WhatsApp. Agendamento e dúvidas rápidas por lá; indicação clínica só na avaliação presencial."
        rotulo="Falar comigo"
        alt
      />

      {reguaVisivel && (
      <ReguaInstalacao
        refTrilho={refRegua}
        marco={marco}
        progresso={progresso}
        procedimento={nomeAtivo}
      />
      )}
    </main>
  );
}
