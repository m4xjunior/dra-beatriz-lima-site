'use client';

// SecaoProcedimentos — a seção de procedimentos da home.
//
// PORTAGEM, NÃO CÓPIA. O Max mandou o feature-carousel (Tailwind + shadcn +
// TypeScript + motion + hugeicons). O apps/web não tem nenhum dos três
// primeiros, e o componente pinta com tokens do shadcn (bg-background,
// border-border) mais um azul #62B2FE cravado. Instalar Tailwind criaria uma
// segunda fonte de verdade para cor ao lado do design system da raiz — que é
// exatamente a divergência que este projeto acabou de consertar hoje.
//
// Então o que veio de lá foi o DESENHO DA INTERAÇÃO, que é onde está o valor:
//   - trilho vertical de chips que embrulha (a função `embrulhar` abaixo é a
//     mesma ideia do `wrap` do original);
//   - pilha de cartões com o ativo à frente e os vizinhos inclinados atrás;
//   - legenda que sobe quando o cartão entra.
// O transporte é o do projeto: JSX, CSS Modules, tokens da marca, GSAP.
//
// AUTO-PLAY QUE PAUSA NO TOQUE (decisão do Max). O cartão gira sozinho a cada
// 3s e PARA no instante em que alguém encosta no painel. Isso não é capricho:
// o antes/depois é arrastável, e um cartão que avança no meio do arraste
// rouba o gesto. A pausa por ponteiro é o que deixa as duas coisas coexistir.
//
// O ROSTO NASCE VAZIO. Cada procedimento tem o seu vídeo (decisão do Max,
// 05/08), mas o Max ainda vai gerar. Enquanto `rosto.video` for null a seção
// renderiza normal, só sem o palco animado. Não pode quebrar por falta de
// vídeo — mesmo guard que o projeto usava com data-frames-total=0.
//
// SÃO 6 PROCEDIMENTOS PARA 7 ITENS DE GALERIA: labial-frontal e labial-perfil
// são o mesmo procedimento em dois ângulos.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import AntesDepois from './AntesDepois';
import manifesto from '../../dados/galeria/manifest.json';
import publicacao from '../../dados/galeria/publicacao.json';
import catalogo from '../../dados/galeria/procedimentos.json';
import estilos from './SecaoProcedimentos.module.css';

const INTERVALO = 3000;
const ALTURA_CHIP = 64;

/** Traz um valor para dentro da faixa, dando a volta. */
function embrulhar(min, max, valor) {
  const faixa = max - min;
  return ((((valor - min) % faixa) + faixa) % faixa) + min;
}

/** Índice do manifest por slug, para casar procedimento com foto. */
function indexarItens() {
  const mapa = new Map();
  for (const item of manifesto.itens) mapa.set(item.slug, item);
  return mapa;
}

export default function SecaoProcedimentos({ previa = false }) {
  const painelRef = useRef(null);
  const trilhoRef = useRef(null);
  const pilhaRef = useRef(null);
  const rostoRef = useRef(null);

  const [passo, setPasso] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [semMovimento, setSemMovimento] = useState(false);

  const porSlug = useMemo(indexarItens, []);

  // Só entra procedimento que tenha ao menos uma foto liberada. A trava de
  // consentimento (CFBM 330/2020) vive no publicacao.json: `publicado` nasce
  // false e só vira true com o nº do termo. Em dev os não publicados aparecem
  // marcados como prévia; em produção não entram no HTML.
  const procedimentos = useMemo(() => {
    return catalogo.procedimentos
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((proc) => {
        const itens = proc.itens
          .map((slug) => porSlug.get(slug))
          .filter(Boolean)
          .filter((item) => previa || publicacao[item.slug]?.publicado === true);
        return { ...proc, itens };
      })
      .filter((proc) => proc.itens.length > 0);
  }, [porSlug, previa]);

  const total = procedimentos.length;
  const ativo = total > 0 ? ((passo % total) + total) % total : 0;

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setSemMovimento(consulta.matches);
    aplicar();
    consulta.addEventListener('change', aplicar);
    return () => consulta.removeEventListener('change', aplicar);
  }, []);

  // Auto-play. Não roda pausado, nem com um procedimento só, nem para quem
  // pediu menos movimento.
  useEffect(() => {
    if (pausado || semMovimento || total < 2) return undefined;
    const t = setInterval(() => setPasso((p) => p + 1), INTERVALO);
    return () => clearInterval(t);
  }, [pausado, semMovimento, total]);

  const irPara = useCallback(
    (indice) => {
      const avanco = (indice - ativo + total) % total;
      if (avanco !== 0) setPasso((p) => p + avanco);
    },
    [ativo, total]
  );

  // O ROSTO DO PROCEDIMENTO ATIVO ANIMA. Sem isto o <video> ficava na página
  // parado no poster, que era o defeito que o Max apontou: o vídeo estava
  // montado e nunca era comandado.
  //
  // Duas guardas, e as duas importam:
  //  - fora da viewport o vídeo PAUSA. Um <video> tocando numa seção que
  //    ninguém está vendo custa decodificação e bateria o tempo todo.
  //  - com prefers-reduced-motion não toca nunca; fica o poster, que é o
  //    quadro inicial do próprio clipe.
  useEffect(() => {
    const video = rostoRef.current;
    if (!video) return undefined;

    if (semMovimento) {
      video.pause();
      return undefined;
    }

    let visivel = false;
    const sincronizar = () => {
      if (visivel) video.play().catch(() => {});
      else video.pause();
    };

    const observador = new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada.isIntersecting;
        sincronizar();
      },
      { threshold: 0.25 }
    );
    observador.observe(video);

    return () => {
      observador.disconnect();
      video.pause();
    };
    // `ativo` nas deps de propósito: o <video> tem key={proc.slug}, então
    // trocar de procedimento monta um elemento novo e este efeito precisa
    // religar o observador no elemento novo.
  }, [ativo, semMovimento]);

  // GSAP dentro de context: o revert do cleanup desfaz tudo de uma vez, o que
  // é o que salva no Strict Mode, que monta o componente duas vezes em dev.
  useEffect(() => {
    if (total === 0) return undefined;
    const duracao = semMovimento ? 0 : 0.55;

    const ctx = gsap.context(() => {
      const chips = gsap.utils.toArray(`.${estilos.chip}`);
      chips.forEach((chip, i) => {
        const distancia = embrulhar(-(total / 2), total / 2, i - ativo);
        gsap.to(chip, {
          y: distancia * ALTURA_CHIP,
          opacity: 1 - Math.min(Math.abs(distancia) * 0.25, 0.75),
          duration: duracao,
          ease: 'back.out(1.4)',
          overwrite: 'auto',
        });
      });

      const cartoes = gsap.utils.toArray(`.${estilos.cartao}`);
      cartoes.forEach((cartao, i) => {
        let d = i - ativo;
        if (d > total / 2) d -= total;
        if (d < -total / 2) d += total;

        const eAtivo = d === 0;
        const vizinho = Math.abs(d) === 1;

        gsap.to(cartao, {
          xPercent: eAtivo ? 0 : d < 0 ? -22 : 22,
          scale: eAtivo ? 1 : vizinho ? 0.85 : 0.7,
          rotation: eAtivo ? 0 : d < 0 ? -3 : 3,
          autoAlpha: eAtivo ? 1 : vizinho ? 0.4 : 0,
          duration: duracao,
          ease: 'back.out(1.2)',
          overwrite: 'auto',
        });
        cartao.style.zIndex = eAtivo ? 20 : vizinho ? 10 : 0;
        // Só o cartão da frente recebe gesto. Sem isto o arraste do
        // antes/depois pegaria num cartão que a pessoa nem está vendo.
        cartao.style.pointerEvents = eAtivo ? 'auto' : 'none';
        // O CSS cuida do recuo visual do vizinho (cinza + desfoque). Marcar
        // por atributo em vez de escrever filter aqui mantém a decisão de
        // aparência no CSS e a de posição no GSAP.
        cartao.dataset.vizinho = vizinho ? 'sim' : 'nao';
      });
    }, painelRef);

    return () => ctx.revert();
  }, [ativo, total, semMovimento]);

  if (total === 0) {
    // Comportamento correto, não bug: sem termo de consentimento assinado, a
    // galeria não existe em produção.
    return null;
  }

  const proc = procedimentos[ativo];

  return (
    <section
      className={estilos.secao}
      id="procedimentos"
      aria-labelledby="procedimentos-titulo"
    >
      <div className={estilos.cabecalho}>
        <p className={estilos.indice}>06 — Procedimentos</p>
        <h2 id="procedimentos-titulo" className={estilos.titulo}>
          O mesmo rosto, com a luz e o ângulo iguais
        </h2>
        <p className={estilos.corpo}>
          Cada par abaixo foi fotografado na mesma posição, com a mesma
          iluminação, antes e depois. Arraste para comparar. Resultado é
          individual: o que aparece aqui é o que aconteceu com aquela pessoa,
          não uma previsão do que vai acontecer com você.
        </p>
      </div>

      <div
        ref={painelRef}
        className={estilos.painel}
        onPointerEnter={() => setPausado(true)}
        onPointerLeave={() => setPausado(false)}
        onPointerDown={() => setPausado(true)}
        onFocusCapture={() => setPausado(true)}
        onBlurCapture={() => setPausado(false)}
      >
        {/* TRILHO — os chips embrulham em torno do ativo */}
        <div className={estilos.trilho}>
          <div
            ref={trilhoRef}
            className={estilos.trilhoInterno}
            role="tablist"
            aria-label="Procedimentos"
          >
            {procedimentos.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                role="tab"
                aria-selected={i === ativo}
                aria-controls={`painel-${p.slug}`}
                onClick={() => irPara(i)}
                className={`${estilos.chip} ${i === ativo ? estilos.chipAtivo : ''}`}
                style={{ height: ALTURA_CHIP }}
              >
                <span className={estilos.chipNumero}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={estilos.chipRotulo}>{p.nome}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PALCO — o rosto do procedimento ativo, quando existir, e a pilha */}
        <div className={estilos.palco}>
          {proc.rosto?.video ? (
            <video
              key={proc.slug}
              ref={rostoRef}
              className={estilos.rosto}
              src={`${catalogo.base_rosto}${proc.rosto.video}`}
              poster={
                proc.rosto.poster
                  ? `${catalogo.base_rosto}${proc.rosto.poster}`
                  : undefined
              }
              muted
              loop
              playsInline
              /* auto só no primeiro; os outros baixam quando forem escolhidos.
                 Com um rosto por procedimento, "pagar a conta toda no começo"
                 seria multiplicar o peso pelo número de procedimentos. */
              preload={ativo === 0 ? 'auto' : 'metadata'}
              aria-hidden="true"
            />
          ) : null}

          <div ref={pilhaRef} className={estilos.pilha}>
            {procedimentos.map((p, i) => {
              const item = p.itens[0];
              const naoPublicado = publicacao[item.slug]?.publicado !== true;
              return (
                <article
                  key={p.slug}
                  id={`painel-${p.slug}`}
                  role="tabpanel"
                  aria-label={p.nome}
                  aria-hidden={i !== ativo}
                  className={estilos.cartao}
                >
                  {/* PROPORÇÃO REAL, NÃO MOLDURA 4/5.
                      A moldura uniforme foi decidida para uma GRADE, onde sete
                      proporções diferentes viram mosaico irregular. Isto é uma
                      PILHA: um cartão por vez. O argumento não se aplica, e
                      aplicá-lo destruía a foto — labial-frontal é 1280x640
                      (proporção 2,0), e o cover num quadro 4/5 comia 70% da
                      largura, deixando só um macro de boca.
                      O contêiner mantém a caixa estável; a foto se acomoda
                      dentro dela na proporção que tem. */}
                  {/* A moldura encolhe até o tamanho da foto. Sem ela o rodapé
                      ficava ancorado no pé do CARTÃO, e como a foto passou a
                      ter altura própria, o texto caía fora da imagem, no vazio. */}
                  <div
                    className={estilos.moldura}
                    style={{ '--prop': String(item.proporcao) }}
                  >
                    <AntesDepois
                      item={item}
                      base={manifesto.base}
                      proporcao="preencher"
                      previa={previa && naoPublicado}
                      prioridade={i === 0}
                      semLegenda
                    />
                    <div className={estilos.rodapeCartao}>
                      <p className={estilos.selo}>
                        {String(i + 1).padStart(2, '0')} · {p.nome}
                      </p>
                      <p className={estilos.resumo}>{p.resumo}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <p className={estilos.aviso} role="note">
        Resultados variam de pessoa para pessoa. As imagens desta página são de
        pacientes que autorizaram o uso por escrito e não representam promessa
        de resultado.
      </p>
    </section>
  );
}
