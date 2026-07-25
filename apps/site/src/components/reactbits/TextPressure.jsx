// TextPressure — porte do componente homônimo do ReactBits
// (reactbits.dev/text-animations/text-pressure, por sua vez portado de
// codepen.io/JuanFuentes). Cada letra reage à proximidade do cursor
// (ou do dedo, via touchmove) variando os EIXOS DA FONTE VARIÁVEL —
// pressão tipográfica literal.
//
// Adaptações para o design system da Dra. Beatriz (não é cópia cega):
// · Fonte padrão = Bricolage Grotesque da marca (eixos reais: wght
//   200..800, wdth 75..100 — carregados no BaseLayout). O eixo 'ital'
//   do original saiu: a Bricolage não o possui.
// · Cor via token semântico (--text-heading), nunca hex solto.
// · Renderiza <p aria-label> em vez de <h1>: a página já tem um único
//   h1 (hero) e este texto é assinatura visual, não hierarquia.
// · prefers-reduced-motion: sem loop de rAF — o texto fica estático no
//   peso de descanso (AA, mesma regra do BL·Motion).
import { useEffect, useRef, useState, useCallback } from "react";

const dist = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Interpola o valor do eixo pela distância do cursor: perto do cursor
// → máximo do eixo; longe → mínimo.
const getAttr = (distance, maxDist, minVal, maxVal) => {
  const val = maxVal - Math.abs((maxVal * distance) / maxDist);
  return Math.max(minVal, val + minVal);
};

const debounce = (fn, delay) => {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), delay);
  };
};

// ATENÇÃO (bug real de produção): NADA de string com aspas/valores
// compostos em style inline aqui — o minificador de HTML do build
// (@playform/compress) mangla o atributo style quando há aspas simples
// aninhadas (ex.: fontFamily com "'Bricolage Grotesque', ...") e o
// browser passa a interpretar o resto das declarações como NOME DE
// FONTE. Resultado real: serifa fallback + wrap "BEATRIZ LI/MA".
// Estilo estático vive em CSS (AssinaturaPressao.astro, com token do
// DS); inline só fica o que é dinâmico e numérico.
export default function TextPressure({
  text = "BEATRIZ LIMA",
  // Eixos da Bricolage — ranges diferentes do Roboto Flex do original.
  weightRange = [200, 800],
  widthRange = [75, 100],
  width = true,
  weight = true,
  alpha = false,
  scale = false,
  className = "",
  minFontSize = 32,
}) {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const spansRef = useRef([]);

  const mouseRef = useRef({ x: 0, y: 0 });
  const cursorRef = useRef({ x: 0, y: 0 });

  const [fontSize, setFontSize] = useState(minFontSize);
  const [scaleY, setScaleY] = useState(1);
  const [lineHeight, setLineHeight] = useState(1);

  const chars = text.split("");

  useEffect(() => {
    const aoMoverMouse = (e) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
    };
    const aoMoverToque = (e) => {
      const t = e.touches[0];
      cursorRef.current.x = t.clientX;
      cursorRef.current.y = t.clientY;
    };

    window.addEventListener("mousemove", aoMoverMouse);
    window.addEventListener("touchmove", aoMoverToque, { passive: true });

    if (containerRef.current) {
      const { left, top, width: w, height: h } = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = left + w / 2;
      mouseRef.current.y = top + h / 2;
      cursorRef.current.x = mouseRef.current.x;
      cursorRef.current.y = mouseRef.current.y;
    }

    return () => {
      window.removeEventListener("mousemove", aoMoverMouse);
      window.removeEventListener("touchmove", aoMoverToque);
    };
  }, []);

  const setSize = useCallback(() => {
    if (!containerRef.current || !titleRef.current) return;

    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();

    // Piso responsivo: a assinatura precisa continuar sendo um ATO no
    // desktop (a caixa é alta) sem estourar a largura no celular.
    const piso = Math.max(
      minFontSize,
      window.matchMedia("(max-width: 920px)").matches ? 34 : 52,
    );

    let novoTamanho = containerW / (chars.length / 2);
    novoTamanho = Math.max(novoTamanho, piso);

    setFontSize(novoTamanho);
    setScaleY(1);
    setLineHeight(1);

    requestAnimationFrame(() => {
      if (!titleRef.current) return;
      // A régua original (containerW / chars/2) assume a Compressa,
      // condensadíssima — na Bricolage estoura. Medimos o texto REAL e
      // reescalamos pra caber SEM quebrar linha, aconteça o que for.
      const larguraReal = titleRef.current.scrollWidth;
      if (larguraReal > containerW) {
        novoTamanho = Math.max(piso, novoTamanho * (containerW / larguraReal) * 0.98);
        setFontSize(novoTamanho);
      }
      const rect = titleRef.current.getBoundingClientRect();
      if (scale && rect.height > 0) {
        const razao = containerH / rect.height;
        setScaleY(razao);
        setLineHeight(razao);
      }
    });
  }, [chars.length, minFontSize, scale]);

  useEffect(() => {
    const aoRedimensionar = debounce(setSize, 100);
    aoRedimensionar();
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [setSize]);

  useEffect(() => {
    // AA: sem movimento para quem pediu menos movimento.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alvo = containerRef.current;
    if (!alvo) return;

    // PERF (medida no Android durante o scrub do fundo vivo): o loop
    // abaixo chama getBoundingClientRect() em CADA letra a CADA frame.
    // Com a assinatura fora da tela isso é layout puro jogado fora,
    // competindo com o decode do vídeo justamente durante o gesto de
    // scroll. O observer não só pula o trabalho — ele DESLIGA o rAF.
    let rafId = null;
    let visivel = false;

    const observador = new IntersectionObserver((entradas) => {
      visivel = entradas[0].isIntersecting;
      if (visivel && rafId === null) {
        rafId = requestAnimationFrame(animar);
      } else if (!visivel && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
    observador.observe(alvo);

    function animar() {
      mouseRef.current.x += (cursorRef.current.x - mouseRef.current.x) / 15;
      mouseRef.current.y += (cursorRef.current.y - mouseRef.current.y) / 15;

      if (titleRef.current) {
        const rectTitulo = titleRef.current.getBoundingClientRect();
        const maxDist = rectTitulo.width / 2;

        spansRef.current.forEach((span) => {
          if (!span) return;

          const rect = span.getBoundingClientRect();
          const centro = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          const d = dist(mouseRef.current, centro);

          const wdth = width
            ? Math.floor(getAttr(d, maxDist, widthRange[0], widthRange[1]))
            : 100;
          const wght = weight
            ? Math.floor(getAttr(d, maxDist, weightRange[0], weightRange[1]))
            : 400;
          const alphaVal = alpha ? getAttr(d, maxDist, 0, 1).toFixed(2) : "1";

          const settings = `'wght' ${wght}, 'wdth' ${wdth}`;
          if (span.style.fontVariationSettings !== settings) {
            span.style.fontVariationSettings = settings;
          }
          if (alpha && span.style.opacity !== alphaVal) {
            span.style.opacity = alphaVal;
          }
        });
      }

      rafId = requestAnimationFrame(animar);
    }

    return () => {
      observador.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [width, weight, alpha, weightRange, widthRange]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", background: "transparent" }}
    >
      <p
        ref={titleRef}
        aria-label={text}
        className={[className, "text-pressure-titulo"].filter(Boolean).join(" ")}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight,
          transform: `scale(1, ${scaleY})`,
        }}
      >
        {chars.map((char, i) => (
          <span key={i} ref={(el) => (spansRef.current[i] = el)} data-char={char} aria-hidden="true">
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </p>
    </div>
  );
}
