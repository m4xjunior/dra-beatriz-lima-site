// Dock — porte do componente homônimo do ReactBits
// (reactbits.dev/components/dock). A mecânica-assinatura é a
// magnificação estilo macOS: o item sob o ponteiro cresce, e os
// vizinhos crescem menos, proporcionalmente à distância.
//
// Adaptações para o design system da Dra. Beatriz (não é cópia cega):
// · Sem framer-motion (o original usa useSpring/useTransform). A
//   magnificação sai de um lerp em rAF escrevendo uma custom property
//   por item — mesma decisão do ChromaGrid.jsx: não pendurar navegação
//   num CDN de terceiro.
// · Isto NÃO é enfeite: o site não tinha navegação de procedimento
//   nenhuma no celular além do hambúrguer. No toque o Dock é uma barra
//   de navegação de verdade, fixa no rodapé, com área de toque de 44px.
// · TOQUE: magnificação por proximidade não existe em dedo. Em
//   (pointer: coarse) o efeito é desligado por completo — o item ativo
//   vem da rota, e o feedback é o estado de press.
// · prefers-reduced-motion: nenhum loop, escala fixa.
//
// ATENÇÃO (mesmo bug de produção documentado em TextPressure.jsx):
// nada de style inline com aspas/valores compostos — o minificador de
// HTML do build mangla o atributo. Valor dinâmico só via setProperty.
import { useEffect, useRef } from "react";

/**
 * @typedef {object} ItemDock
 * @property {string} href
 * @property {string} rotulo     nome curto, visível sob o ícone
 * @property {string} inicial    sigla de descanso enquanto não há foto
 * @property {string} descricao  nome completo, só pro leitor de tela
 * @property {string} [imagem]   miniatura (imagemCapa do procedimento)
 * @property {boolean} [ativo]   derivado da rota, no build
 */

/**
 * @param {{ itens?: ItemDock[], alcance?: number, ampliacao?: number }} props
 *   `alcance` = raio de influência em px; `ampliacao` = escala máxima.
 */
export default function Dock({ itens = [], alcance = 130, ampliacao = 0.55 }) {
  const dockRef = useRef(null);
  const itensRef = useRef([]);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const fino = window.matchMedia("(pointer: fine)").matches;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fino || reduzido) return;

    let raf = null;
    let ponteiroX = null;

    // Uma medição por gesto, não por frame: a posição de cada item só
    // muda quando o dock muda de tamanho, então ler o rect de todos a
    // cada frame seria layout jogado fora.
    let centros = [];
    const medir = () => {
      centros = itensRef.current.map((el) => {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
      });
    };

    const desenhar = () => {
      let precisaContinuar = false;

      itensRef.current.forEach((el, i) => {
        if (!el) return;
        const atual = parseFloat(el.style.getPropertyValue("--dock-escala")) || 0;

        // Queda linear com a distância: no centro vale `ampliacao`, no
        // limite do alcance vale 0. É o bastante pra ler como onda.
        const desejado =
          ponteiroX === null
            ? 0
            : Math.max(0, 1 - Math.abs(ponteiroX - centros[i]) / alcance) *
              ampliacao;

        const proximo = atual + (desejado - atual) / 4;
        el.style.setProperty("--dock-escala", proximo.toFixed(4));
        if (Math.abs(desejado - proximo) > 0.001) precisaContinuar = true;
      });

      raf = precisaContinuar ? requestAnimationFrame(desenhar) : null;
    };

    const ligar = () => {
      if (raf === null) raf = requestAnimationFrame(desenhar);
    };

    const aoEntrar = () => medir();
    const aoMover = (e) => {
      ponteiroX = e.clientX;
      ligar();
    };
    const aoSair = () => {
      ponteiroX = null;
      ligar();
    };

    dock.addEventListener("pointerenter", aoEntrar);
    dock.addEventListener("pointermove", aoMover);
    dock.addEventListener("pointerleave", aoSair);
    window.addEventListener("resize", medir, { passive: true });
    medir();

    return () => {
      dock.removeEventListener("pointerenter", aoEntrar);
      dock.removeEventListener("pointermove", aoMover);
      dock.removeEventListener("pointerleave", aoSair);
      window.removeEventListener("resize", medir);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [alcance, ampliacao]);

  if (!itens.length) return null;

  return (
    <nav ref={dockRef} className="dock" aria-label="Procedimentos">
      <ul className="dock__lista">
        {itens.map((item, i) => (
          <li key={item.href} className="dock__item">
            <a
              ref={(el) => (itensRef.current[i] = el)}
              href={item.href}
              className="dock__link"
              // O rótulo visível é abreviação ("Lábios"); quem ouve
              // precisa do nome do procedimento inteiro.
              aria-label={item.descricao}
              aria-current={item.ativo ? "page" : undefined}
              data-ativo={item.ativo ? "true" : undefined}
            >
              <span className="dock__moldura">
                {item.imagem ? (
                  <img
                    className="dock__imagem"
                    src={item.imagem}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width="96"
                    height="96"
                  />
                ) : (
                  <span className="dock__inicial" aria-hidden="true">
                    {item.inicial}
                  </span>
                )}
              </span>
              <span className="dock__rotulo" aria-hidden="true">
                {item.rotulo}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
