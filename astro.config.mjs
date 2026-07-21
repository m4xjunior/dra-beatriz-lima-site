// @ts-check
// Dra. Beatriz Lima — Biomédica Esteta · site público (Astro)
// output 'static': catálogo de procedimentos via Content Collections, sem
// formulário/booking nesta etapa (ver readme.md, Roteiro).
import { defineConfig } from "astro/config";
import critters from "astro-critters";
import compress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  site: "https://drabeatrizlima.com.br",
  output: "static",
  integrations: [
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
