// @ts-check
// Dra. Beatriz Lima — Biomédica Esteta · site público (Astro)
// output 'static': catálogo de procedimentos via Content Collections, sem
// formulário/booking nesta etapa (ver readme.md, Roteiro).
import { defineConfig } from "astro/config";
import compress from "@playform/compress";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  // Domínio VIVO atual (Cloudflare Pages). Quando drabeatrizlima.com.br
  // apontar pro projeto Pages, voltar este valor — o og:image do preview
  // de WhatsApp usa esta base e precisa resolver de verdade.
  site: "https://dra-beatriz-lima.pages.dev",
  output: "static",
  integrations: [
    // Ilhas React SÓ para os componentes ReactBits (TextPressure,
    // FloatingLines) — o resto do site segue Astro puro + BL·Motion.
    react(),
    // critters() REMOVIDO (25/07/2026): o inline de CSS crítico quebrava
    // as @media em produção — build servia layout mobile no desktop
    // (hambúrguer + grids 1 coluna; achado do QA do s002, medido em
    // preview de build). LCP volta a depender só do CSS normal, que é
    // pequeno; reavaliar critical CSS depois com config correta.
    // Minifica HTML/JS do build final. Imagem e SVG ficam de fora:
    // não há pipeline de imagem nesta etapa (sem fotografia oficial —
    // ver readme.md "Fontes recebidas") e os SVGs de ícone (Etapa 2+)
    // não devem ser reotimizados às cegas.
    //
    // CSS: false (25/07/2026) — CAUSA-RAIZ do bug que foi atribuído ao
    // critters. O Astro já minifica o CSS com lightningcss, que reescreve
    // `@media (min-width: 768px)` na sintaxe de range moderna
    // `@media (width>=768px)`. O parser do compressor não entende essa
    // sintaxe e DESCARTA o bloco inteiro em silêncio. Medido no build:
    // com CSS:true a folha final não tinha NENHUMA media query de
    // largura — só as de (pointer:coarse) e (prefers-reduced-motion),
    // que não usam range. Efeito em produção: o desktop recebia o layout
    // mobile (hambúrguer no lugar do menu, grids de 1 coluna) — o mesmo
    // sintoma que fez o critters ser removido em 25/07, e que continuou
    // acontecendo depois porque o culpado era este segundo passe.
    // O passe extra economizava 1,79 KB (~3,5%) sobre um CSS que já
    // vinha minificado. Não vale o layout do site.
    compress({
      CSS: false,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: false,
    }),
  ],
});
