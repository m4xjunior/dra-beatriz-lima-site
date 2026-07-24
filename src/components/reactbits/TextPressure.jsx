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

export default function TextPressure({
  text = "BEATRIZ LIMA",
  fontFamily = "'Bricolage Grotesque', 'Space Grotesk', system-ui, sans-serif",
  // Eixos da Bricolage — ranges diferentes do Roboto Flex do original.
  weightRange = [200, 800],
  widthRange = [75, 100],
  width = true,
  weight = true,
  alpha = false,
  flex = true,
  scale = false,
  textColor = "var(--text-heading)",
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

    let novoTamanho = containerW / (chars.length / 2);
    novoTamanho = Math.max(novoTamanho, minFontSize);

    setFontSize(novoTamanho);
    setScaleY(1);
    setLineHeight(1);

    requestAnimationFrame(() => {
      if (!titleRef.current) return;
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

    let rafId;
    const animar = () => {
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
    };

    animar();
    return () => cancelAnimationFrame(rafId);
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
          fontFamily,
          color: textColor,
          textTransform: "uppercase",
          fontSize,
          lineHeight,
          transform: `scale(1, ${scaleY})`,
          transformOrigin: "center top",
          margin: 0,
          textAlign: "center",
          userSelect: "none",
          whiteSpace: "nowrap",
          fontWeight: 200,
          width: "100%",
          display: flex ? "flex" : "block",
          justifyContent: flex ? "space-between" : undefined,
        }}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            ref={(el) => (spansRef.current[i] = el)}
            data-char={char}
            aria-hidden="true"
            style={{ display: "inline-block" }}
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </p>
    </div>
  );
}
