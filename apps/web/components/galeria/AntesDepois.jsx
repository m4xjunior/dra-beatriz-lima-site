'use client';

// AntesDepois — comparador de resultado, com cortina arrastável.
//
// Portado do AntesDepois.astro (f62c005) para React. As três decisões que a
// spec manda sobreviver à portagem estão marcadas abaixo com (1) (2) (3).
//
// (1) A CORTINA RECORTA SÓ A CAMADA DE CIMA.
//     `antes` fica por baixo, inteiro. `depois` por cima com
//     clip-path: inset(0 0 0 var(--ad-corte)). A camada de baixo nunca é
//     repintada durante o arraste — o navegador recompõe um clip, sem layout
//     e sem redecodificar imagem. É o que segura 60fps num celular modesto.
//     Trocar clip-path por width ou left derruba isso.
//
// (2) A POSIÇÃO VAI NUMA CUSTOM PROPERTY, não em style.clipPath.
//     O fio e a camada leem o MESMO valor: uma escrita, dois efeitos, sem
//     risco de dessincronizar. E a escrita acontece dentro de
//     requestAnimationFrame porque num arraste chegam mais eventos de
//     ponteiro do que quadros — sem isso a mesma propriedade é reescrita
//     três vezes por frame.
//
// (3) O CONTROLE É UM <input type="range"> DE VERDADE.
//     Transparente (opacity: 0, NUNCA display: none), por cima de tudo,
//     ocupando o cartão inteiro. Teclado e leitor de tela funcionam sem uma
//     linha de JS. O script só existe para o gesto pegar em qualquer ponto
//     do cartão, porque o polegar nativo é invisível.
//
// A MOLDURA É UNIFORME, A FOTO É ÍNTEGRA. As sete fotos chegaram em sete
// proporções (2.0 no labial frontal, 0.56 na textura de pele). Num grid isso
// vira mosaico irregular, recusado. A saída não é cortar todas para um
// formato só — cortar destrói pixel e, em foto clínica, muda o que a paciente
// vê. É fixar a moldura em 4/5 e deixar cada foto preencher com object-fit
// cover ancorado no `foco` que o manifest traz por item.

import { useCallback, useEffect, useRef } from 'react';
import estilos from './AntesDepois.module.css';

/** Monta o srcset de um formato a partir dos derivados do manifest. */
function montarSrcSet(base, derivados, formato) {
  return derivados.map((d) => `${base}${d[formato]} ${d.largura}w`).join(', ');
}

/** Uma camada de foto. <picture> com AVIF primeiro, WebP como rede. */
function Camada({ base, lado, foco, alt, prioridade, className }) {
  const { derivados } = lado;
  const maior = derivados[derivados.length - 1];

  return (
    <picture className={className}>
      <source
        type="image/avif"
        srcSet={montarSrcSet(base, derivados, 'avif')}
        sizes="(max-width: 720px) 100vw, 560px"
      />
      <source
        type="image/webp"
        srcSet={montarSrcSet(base, derivados, 'webp')}
        sizes="(max-width: 720px) 100vw, 560px"
      />
      <img
        src={`${base}${maior.webp}`}
        alt={alt}
        width={maior.largura}
        height={maior.altura}
        loading={prioridade ? 'eager' : 'lazy'}
        decoding="async"
        style={{ objectPosition: foco }}
        className={estilos.foto}
      />
    </picture>
  );
}

export default function AntesDepois({
  item,
  base,
  /** `moldura` usa 4/5 uniforme (grade). `real` usa a proporção da foto. */
  proporcao = 'moldura',
  previa = false,
  prioridade = false,
  /** Quem já desenha o próprio rodapé desliga a legenda daqui, senão as
   *  duas ocupam o mesmo canto e o texto empilha ilegível. */
  semLegenda = false,
}) {
  const figuraRef = useRef(null);
  const controleRef = useRef(null);
  const quadroRef = useRef(0);

  // (2) uma escrita por quadro, na custom property.
  const aplicar = useCallback((pct) => {
    const figura = figuraRef.current;
    if (!figura) return;
    cancelAnimationFrame(quadroRef.current);
    quadroRef.current = requestAnimationFrame(() => {
      figura.style.setProperty('--ad-corte', `${pct}%`);
    });
  }, []);

  useEffect(() => {
    const figura = figuraRef.current;
    const controle = controleRef.current;
    if (!figura || !controle) return undefined;

    // O gesto pega em qualquer ponto do cartão, não só no polegar invisível.
    const seguir = (ev) => {
      if (ev.pointerType === 'mouse' && ev.buttons !== 1) return;
      const r = figura.getBoundingClientRect();
      const pct = Math.min(100, Math.max(0, ((ev.clientX - r.left) / r.width) * 100));
      controle.value = String(pct);
      aplicar(pct);
    };

    const aoPressionar = (ev) => {
      ev.target.setPointerCapture?.(ev.pointerId);
      seguir(ev);
    };

    figura.addEventListener('pointerdown', aoPressionar);
    figura.addEventListener('pointermove', seguir);

    return () => {
      // Strict Mode monta duas vezes em dev. Sem este cleanup ficam dois
      // pares de listeners e um rAF órfão por remontagem.
      figura.removeEventListener('pointerdown', aoPressionar);
      figura.removeEventListener('pointermove', seguir);
      cancelAnimationFrame(quadroRef.current);
    };
  }, [aplicar]);

  // `preencher` deixa a proporção com o pai. Quem empilha cartões precisa
  // limitar a caixa nos DOIS eixos (uma foto de proporção 0,5 com largura
  // 100% gera o dobro de altura e vaza pra fora da seção), e isso só se
  // resolve no contêiner, que conhece o espaço disponível.
  const estiloFiguraBase = {
    '--ad-corte': '50%',
    aspectRatio: proporcao === 'real' ? String(item.proporcao) : undefined,
    ...(proporcao === 'preencher' ? { width: '100%', height: '100%' } : null),
  };

  // Peça única (limpeza de pele): não existe par para comparar. Renderiza a
  // foto sozinha, sem cortina e sem controle — inventar um "antes" aqui seria
  // fabricar prova clínica que não existe.
  if (item.tipo === 'composto' || !item.lados.antes || !item.lados.depois) {
    const unico = item.lados.unico ?? item.lados.depois;
    return (
      <figure
        className={`${estilos.figura} ${estilos.unica}`}
        style={estiloFiguraBase}
        data-proporcao={proporcao}
      >
        <Camada
          base={base}
          lado={unico}
          foco={item.foco}
          alt={item.legenda}
          prioridade={prioridade}
          className={estilos.camada}
        />
        {previa && <span className={estilos.previa}>prévia</span>}
        {!semLegenda && (
          <figcaption className={estilos.legenda}>{item.legenda}</figcaption>
        )}
      </figure>
    );
  }

  const rotulo = `Comparar antes e depois — ${item.legenda}`;

  return (
    <figure
      ref={figuraRef}
      className={estilos.figura}
      style={estiloFiguraBase}
      data-proporcao={proporcao}
    >
      {/* (1) camada de baixo, inteira, nunca recortada */}
      <Camada
        base={base}
        lado={item.lados.antes}
        foco={item.foco}
        alt={`${item.legenda} — antes`}
        prioridade={prioridade}
        className={estilos.camada}
      />

      {/* (1) camada de cima, a única que o clip-path toca */}
      <Camada
        base={base}
        lado={item.lados.depois}
        foco={item.foco}
        alt={`${item.legenda} — depois`}
        prioridade={prioridade}
        className={`${estilos.camada} ${estilos.camadaDepois}`}
      />

      <span className={estilos.fio} aria-hidden="true">
        <span className={estilos.puxador} />
      </span>

      <span className={`${estilos.marca} ${estilos.marcaAntes}`} aria-hidden="true">
        antes
      </span>
      <span className={`${estilos.marca} ${estilos.marcaDepois}`} aria-hidden="true">
        depois
      </span>

      {previa && <span className={estilos.previa}>prévia</span>}

      {/* (3) controle nativo: teclado e leitor de tela sem JS nenhum */}
      <input
        ref={controleRef}
        type="range"
        min="0"
        max="100"
        defaultValue="50"
        step="0.1"
        className={estilos.controle}
        aria-label={rotulo}
        onChange={(ev) => aplicar(Number(ev.target.value))}
      />

      {!semLegenda && (
        <figcaption className={estilos.legenda}>{item.legenda}</figcaption>
      )}
    </figure>
  );
}
