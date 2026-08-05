// Next.js — site público da Dra. Beatriz Lima (substitui apps/site em Astro).
//
// outputFileTracingRoot aponta para a RAIZ do monorepo porque o CSS do
// design system (tokens/*.css + styles.css) vive lá e é importado por
// app/globals.css com caminho relativo. Sem isto o Next avisa que
// inferiu a raiz errada e o rastreio de arquivos do build sai incompleto.
//
// Uma cópia só dos tokens, de propósito: até 05/08/2026 existiam duas
// (raiz e apps/site/src/design-system) e elas divergiram de verdade —
// a de apps/site tinha --bloom-strong e --gradient-gold-text-on-inverse
// que a raiz não tinha. Consumir a raiz direto elimina a classe de bug.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  // Export estático: a saída vai para `out/`, que é o que o apps/server
  // (Rust/axum) serve via DIST_DIR e o que o Cloudflare Pages recebe no
  // Direct Upload. O site não tem rota dinâmica nem dado de servidor —
  // tudo é client component lendo do bucket público.
  output: "export",
  // O indicador flutuante do Next dev senta em cima da régua no canto
  // inferior e encobre "Dia 00" nos screenshots do simulador. Ele não
  // existe no build de produção (verificado por grep no out/index.html),
  // mas a evidência de QA é tirada em dev — e evidência com artefato de
  // ferramenta em cima leva revisor a reportar defeito que não existe.
  // Foi o que aconteceu em 05/08/2026.
  devIndicators: false,
  outputFileTracingRoot: resolve(aqui, "../.."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
};
