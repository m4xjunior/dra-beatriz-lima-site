// Layout raiz.
//
// FONTES POR next/font, E NÃO POR <link> PARA O GOOGLE:
// a primeira versão deste arquivo carregava a folha do Google com
// media="print" e um script inline virando para "all" (o truque
// não-bloqueante que o BaseLayout.astro usava). Em Next isso produziu
// erro de hidratação MEDIDO — o script roda antes do React hidratar, o
// atributo no DOM já é "all" e o servidor tinha renderizado "print".
// next/font resolve a causa: baixa os arquivos no build, auto-hospeda,
// injeta @font-face sem requisição externa e sem FOUT. De quebra saem
// dois preconnect que agora não servem para nada.
//
// preconnect ao bucket FICA: é a decisão (c) do mapa do Hungry Tiger —
// o handshake TLS com o GCS não pode acontecer no meio do primeiro
// gesto de scroll.

import { Bricolage_Grotesque, Mulish, Cormorant_Garamond } from "next/font/google";
import ProvedorScroll from "@/components/ProvedorScroll";
import Nav from "@/components/Nav";
import Rodape from "@/components/Rodape";
import BotaoWhatsapp from "@/components/BotaoWhatsapp";
import "./globals.css";

// opsz e wdth são eixos que a direção visual usa de verdade: títulos
// grandes puxam opsz alto (corte display) e podem respirar em wdth.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
  variable: "--fonte-display",
});

const corpo = Mulish({
  subsets: ["latin"],
  display: "swap",
  variable: "--fonte-corpo",
});

// Só itálico: a serifa entra como a voz humana dentro do grotesco, uma
// palavra por headline. Carregar a romana seria peso sem uso.
const serifa = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["italic"],
  display: "swap",
  variable: "--fonte-serif",
});

export const metadata = {
  title: "Dra. Beatriz Lima — Biomédica Esteta",
  description:
    "Avaliação, procedimento e o que acontece depois — dia a dia, sem promessa de rosto que não é o seu.",
};

export const viewport = {
  themeColor: "#0C0A07",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      data-theme="clinico"
      className={`${display.variable} ${corpo.variable} ${serifa.variable}`}
    >
      <head>
        {/* preconnect ao Worker de borda, que é de onde a mídia sai agora
            (apps/cdn). O handshake TLS não pode acontecer no meio do
            primeiro gesto de scroll — é a decisão (c) do mapa do
            Hungry Tiger. */}
        <link rel="preconnect" href="https://bl-midia.meireles-maxjunior.workers.dev" crossOrigin="" />
      </head>
      <body>
        {/* A nav fica FORA do ProvedorScroll: ela é fixa e não participa
            do fluxo que o Lenis interpola. E antes do children para que
            o mix-blend-mode dela tenha a página inteira como fundo. */}
        <Nav />
        <ProvedorScroll>{children}</ProvedorScroll>

        {/* Rodapé fora do ProvedorScroll pela mesma razão da nav: ele não
            precisa da interpolação do Lenis, e mantê-lo fora evita que o
            fim da página participe do cálculo do scrub. */}
        <Rodape />

        {/* O flutuante é o último filho de propósito: ele observa o
            [data-rodape] para recuar e não tapar o CTA de lá, e o
            observer precisa que o alvo já exista na montagem. */}
        <BotaoWhatsapp />
      </body>
    </html>
  );
}
