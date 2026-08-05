// Rota por procedimento — as páginas que ranqueiam.
//
// Existiam no Astro (`pages/procedimentos/[slug].astro`) e morreram com
// o apps/site. São o motivo pelo qual alguém chega neste site pelo
// Google: ninguém busca "clínica de estética", busca "bioestimulador
// contraindicação" às onze da noite.
//
// Server component e `generateStaticParams`: com output:'export' cada
// slug vira um HTML próprio no build, servido do disco. Sem isso o
// export estático falha, porque não há servidor para resolver a rota.

import Link from "next/link";
import { PROCEDIMENTOS, procedimentoPorSlug } from "@/lib/procedimentos";
import { avisoClinico } from "@/lib/tratamento";
import estilos from "./pagina.module.css";

export function generateStaticParams() {
  return PROCEDIMENTOS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const p = procedimentoPorSlug(params.slug);
  if (!p) return {};
  return {
    title: `${p.nome} — Dra. Beatriz Lima`,
    description: p.resumo,
    alternates: { canonical: `/procedimentos/${p.slug}` },
  };
}

export default function PaginaProcedimento({ params }) {
  const p = procedimentoPorSlug(params.slug);
  if (!p) return null;

  return (
    <article className={estilos.pagina}>
      <nav className={estilos.migalha} aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">·</span>
        <Link href="/procedimentos">Procedimentos</Link>
      </nav>

      <header className={estilos.cabecalho}>
        <p className={estilos.eyebrow}>{p.regiao}</p>
        <h1 className={estilos.titulo}>{p.nome}</h1>
        <p className={estilos.resumo}>{p.resumo}</p>
      </header>

      {/* A ficha vem ANTES do texto corrido de propósito. Quem chegou do
          Google com uma pergunta específica quer o número, não a
          apresentação. Quem quer contexto rola dez centímetros. */}
      <dl className={estilos.ficha}>
        <div className={estilos.campo}>
          <dt>Duração</dt>
          <dd>{p.duracao}</dd>
        </div>
        <div className={estilos.campo}>
          <dt>Sessões</dt>
          <dd>{p.sessoes}</dd>
        </div>
        <div className={estilos.campo}>
          <dt>Região</dt>
          <dd>{p.regiao}</dd>
        </div>
      </dl>

      <section className={estilos.secao}>
        <h2 className={estilos.subtitulo}>O que é</h2>
        <p className={estilos.corpo}>{p.oQueE}</p>
      </section>

      <div className={estilos.duasColunas}>
        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>Indicações</h2>
          <ul className={estilos.lista}>
            {p.indicacoes.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>

        {/* Contraindicação com a mesma altura visual da indicação, não
            escondida num rodapé cinza. É a informação que protege a
            paciente, e esconder isso é o padrão que este site recusa. */}
        <section className={`${estilos.secao} ${estilos.contra}`}>
          <h2 className={estilos.subtitulo}>Contraindicações</h2>
          <ul className={estilos.lista}>
            {p.contraindicacoes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      </div>

      <p className={estilos.aviso}>{avisoClinico}</p>

      <section className={estilos.chamada}>
        <p className={estilos.chamadaTexto}>
          A avaliação define se este é o procedimento certo para você — e,
          com frequência, define que não é.
        </p>
        <Link className={estilos.chamadaLink} href="/#contato">
          Agendar avaliação
        </Link>
      </section>

      <nav className={estilos.outros} aria-label="Outros procedimentos">
        <h2 className={estilos.subtitulo}>Outros procedimentos</h2>
        <ul className={estilos.listaOutros}>
          {PROCEDIMENTOS.filter((o) => o.slug !== p.slug).map((o) => (
            <li key={o.slug}>
              <Link href={`/procedimentos/${o.slug}`}>{o.nome}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
