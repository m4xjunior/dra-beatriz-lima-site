// @ts-check
// Dra. Beatriz Lima — Biomédica Esteta · site público (Astro)
// output 'static': catálogo de procedimentos via Content Collections, sem
// formulário/booking nesta etapa (ver readme.md, Roteiro).
import { defineConfig } from "astro/config";
import critters from "astro-critters";
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
    // Inlina o CSS crítico de cada página (perf-astro: LCP sem FOUC).
    critters(),
    // Minifica CSS/HTML/JS do build final. Imagem e SVG ficam de fora:
    // não há pipeline de imagem nesta etapa (sem fotografia oficial —
    // ver readme.md "Fontes recebidas") e os SVGs de ícone (Etapa 2+)
    // não devem ser reotimizados às cegas.
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: false,
    }),
  ],
});
