// ChromaGrid — porte do componente homônimo do ReactBits
// (reactbits.dev/components/chroma-grid). A mecânica-assinatura é um
// holofote que segue o ponteiro e DEVOLVE a cor: a grade descansa
// dessaturada e só o que está sob a luz aparece por inteiro.
//
// Adaptações para o design system da Dra. Beatriz (não é cópia cega):
// · O original pinta cada card com um gradiente colorido próprio. Aqui
//   a paleta é só obsidiana/ouro/nude do DS — o dourado é ACENTO
//   cirúrgico, nunca área grande (direção visual § Cor). O holofote é
//   luz quente passando sobre material, não confete.
// · Sem framer-motion (o original depende dela) e sem GSAP: o
//   posicionamento do holofote é rAF + lerp na mão, escrevendo custom
//   properties. Isso segue o precedente do TextPressure.jsx e evita
//   pendurar a galeria num CDN que já provamos que pode falhar.
// · TOQUE: holofote que segue ponteiro não existe em dedo. Em
//   (pointer: coarse) a dessaturação de descanso é desligada por CSS —
//   tudo nasce nítido — e a interação vira toque direto no cartão.
//   Adaptar, não amputar.
// · prefers-reduced-motion: nenhum loop de rAF, nada se move.
//
// ATENÇÃO (mesmo bug de produção documentado em TextPressure.jsx):
// nada de style inline com aspas/valores compostos — o minificador de
// HTML do build mangla o atributo. Aqui todo valor dinâmico entra por
// setProperty em JS, e o estilo estático mora no CSS do .astro pai.
import { useEffect, useRef } from "react";

/**
 * Uma peça da vitrine. O componente é burro: recebe tudo pronto do
 * build (ver GaleriaProcedimentos.astro) e não busca nada em runtime.
 *
 * @typedef {object} PecaChroma
 * @property {string} href      rota do procedimento
 * @property {string} titulo
 * @property {string} eyebrow   rótulo caixa alta
 * @property {string} [resumo]
 * @property {string} [imagem]  ausente = composição tipográfica de descanso
 * @property {boolean} [destaque] carro-chefe: ocupa duas colunas
 */

/**
 * @param {{ itens?: PecaChroma[], raio?: number }} props
 *   `raio` é o alcance do holofote em px.
 */
export default function ChromaGrid({ itens = [], raio = 320 }) {
  const gradeRef = useRef(null);

  useEffect(() => {
    const grade = gradeRef.current;
    if (!grade) return;

    // Sem ponteiro fino não há holofote a seguir, e quem pediu menos
    // movimento não recebe loop nenhum.
    const fino = window.matchMedia("(pointer: fine)").matches;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fino || reduzido) return;

    // Alvo = onde o ponteiro está. Suave = onde a luz está desenhada.
    // O lerp é o que dá o peso de "lanterna", em vez de a luz grudar
    // no cursor.
    const alvo = { x: 0, y: 0 };
    const suave = { x: 0, y: 0 };
    let raf = null;

    grade.style.setProperty("--holofote-raio", `${raio}px`);

    const desenhar = () => {
      suave.x += (alvo.x - suave.x) / 6;
      suave.y += (alvo.y - suave.y) / 6;
      grade.style.setProperty("--holofote-x", `${suave.x}px`);
      grade.style.setProperty("--holofote-y", `${suave.y}px`);

      // Desliga o loop assim que a luz alcança o ponteiro parado. Um
      // rAF girando à toa sobre um vídeo em decode é exatamente o tipo
      // de custo que estamos tirando do site.
      const convergiu =
        Math.abs(alvo.x - suave.x) < 0.5 && Math.abs(alvo.y - suave.y) < 0.5;
      raf = convergiu ? null : requestAnimationFrame(desenhar);
    };

    const ligar = () => {
      if (raf === null) raf = requestAnimationFrame(desenhar);
    };

    const aoEntrar = (e) => {
      const r = grade.getBoundingClientRect();
      // Primeira posição sem lerp: senão a luz varre a tela inteira
      // vindo do canto 0,0 na primeira vez que o ponteiro entra.
      alvo.x = suave.x = e.clientX - r.left;
      alvo.y = suave.y = e.clientY - r.top;
      grade.style.setProperty("--holofote-forca", "1");
      ligar();
    };

    const aoMover = (e) => {
      const r = grade.getBoundingClientRect();
      alvo.x = e.clientX - r.left;
      alvo.y = e.clientY - r.top;
      ligar();
    };

    const aoSair = () => {
      grade.style.setProperty("--holofote-forca", "0");
    };

    grade.addEventListener("pointerenter", aoEntrar);
    grade.addEventListener("pointermove", aoMover);
    grade.addEventListener("pointerleave", aoSair);

    return () => {
      grade.removeEventListener("pointerenter", aoEntrar);
      grade.removeEventListener("pointermove", aoMover);
      grade.removeEventListener("pointerleave", aoSair);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [raio]);

  return (
    <div ref={gradeRef} className="chroma">
      {itens.map((item, i) => (
        <a
          key={item.href}
          href={item.href}
          className="chroma__peca"
          data-destaque={item.destaque ? "true" : undefined}
          data-tom={i % 3}
        >
          <span className="chroma__moldura">
            {item.imagem ? (
              <img
                className="chroma__imagem"
                src={item.imagem}
                alt=""
                loading="lazy"
                decoding="async"
                width="600"
                height="750"
              />
            ) : (
              // Estado sem foto: composição tipográfica deliberada, não
              // caixa cinza de "imagem faltando". Fica de pé sozinha
              // hoje e sai de cena quando a fotografia chegar.
              <span className="chroma__vazio" aria-hidden="true">
                <span className="chroma__inicial">{item.titulo.charAt(0)}</span>
                <span className="chroma__fio"></span>
              </span>
            )}
          </span>

          <span className="chroma__texto">
            {/* Dentro do bloco de texto de propósito: no desktop ele é
                posicionado sobre a imagem, mas no celular precisa
                FLUIR acima do eyebrow — fora daqui ele se sobrepunha
                ao rótulo (visto em captura). */}
            {item.destaque && <span className="chroma__selo">Carro-chefe</span>}
            <span className="chroma__eyebrow">{item.eyebrow}</span>
            <span className="chroma__titulo">{item.titulo}</span>
            {item.resumo && <span className="chroma__resumo">{item.resumo}</span>}
          </span>
        </a>
      ))}

      {/* Camada única de luz. Pinta por cima de tudo em soft-light e
          não recebe ponteiro — é paint puro, sem custo de layout. */}
      <span className="chroma__luz" aria-hidden="true"></span>
    </div>
  );
}
