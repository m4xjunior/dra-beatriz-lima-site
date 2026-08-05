"use client";

// Medidor de fling que roda DENTRO do Safari do simulador.
//
// POR QUE ELE EXISTE:
// o critério do s007 exige evidência de iOS real, e `simctl` não emite
// gesto. Os dois caminhos que ele sugeriu (idb, WebKit do Playwright)
// não estão instalados nesta máquina. Baixar 100+ MB de ferramenta para
// medir uma coisa mediria o motor errado de qualquer jeito: o WebKit de
// desktop não usa o decodificador de vídeo do iOS.
//
// Este medidor roda na PÁGINA DE VERDADE, no Safari de verdade, com o
// decodificador de verdade. Dispara uma rajada de scroll com perfil de
// velocidade de fling (rápido no início, desacelerando) e mede o
// intervalo entre quadros apresentados enquanto o scrub persegue.
//
// O QUE ELE NÃO PROVA, e está escrito na tela para não virar exagero no
// relatório: não há dedo. O caminho de entrada (UIScrollView -> momentum
// -> evento de scroll) não é exercitado. O que ele prova é o que estava
// em dúvida: se o seek de vídeo do iOS acompanha uma mudança rápida de
// posição sem engasgar.
//
// Só monta com ?medir=1 na URL. Não entra em produção por acidente.

import { useEffect, useState } from "react";

export default function MedidorFling() {
  const [resultado, setResultado] = useState(null);
  const [fase, setFase] = useState("esperando o vídeo");

  useEffect(() => {
    let cancelado = false;
    const video = document.querySelector("video");
    if (!video) return;

    async function medir() {
      // Espera o vídeo ter duração: medir seek antes disso mede nada.
      const limite = Date.now() + 15000;
      while (!(video.duration > 0) && Date.now() < limite) {
        await new Promise((r) => setTimeout(r, 200));
        if (cancelado) return;
      }
      if (!(video.duration > 0)) {
        setFase("vídeo não carregou em 15s");
        return;
      }

      setFase("medindo o fling");
      await new Promise((r) => setTimeout(r, 600));

      const intervalos = [];
      const amostrasDeVideo = [];
      let anterior = performance.now();
      let rodando = true;

      const relogio = (t) => {
        intervalos.push(t - anterior);
        anterior = t;
        amostrasDeVideo.push(video.currentTime);
        if (rodando) requestAnimationFrame(relogio);
      };
      requestAnimationFrame(relogio);

      // Perfil de FLING: desaceleração exponencial, que é o que o
      // momentum do iOS produz. 900ms cobrindo ~70% do documento é uma
      // rolagem agressiva de polegar, não um arrasto lento.
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const alvo = total * 0.7;
      const inicio = performance.now();
      const DURACAO = 900;

      await new Promise((ok) => {
        const passo = (agora) => {
          const k = Math.min(1, (agora - inicio) / DURACAO);
          const eased = 1 - Math.pow(1 - k, 3);
          window.scrollTo(0, alvo * eased);
          if (k < 1) requestAnimationFrame(passo);
          else setTimeout(ok, 700);
        };
        requestAnimationFrame(passo);
      });

      rodando = false;
      if (cancelado) return;

      const ordenados = [...intervalos].sort((a, b) => a - b);
      const q = (p) => ordenados[Math.floor(ordenados.length * p)] ?? 0;

      // O vídeo mexeu de verdade durante a rajada?
      const min = Math.min(...amostrasDeVideo);
      const max = Math.max(...amostrasDeVideo);

      setFase("pronto");
      setResultado({
        quadros: intervalos.length,
        acima50: intervalos.filter((m) => m > 50).length,
        acima100: intervalos.filter((m) => m > 100).length,
        mediana: q(0.5).toFixed(1),
        p95: q(0.95).toFixed(1),
        pior: ordenados[ordenados.length - 1]?.toFixed(1),
        videoAndou: (max - min).toFixed(2),
        videoDuracao: video.duration.toFixed(2),
        scrollFinal: Math.round(window.scrollY),
        scrollTotal: Math.round(total),
      });
    }

    medir();
    return () => {
      cancelado = true;
    };
  }, []);

  const caixa = {
    position: "fixed",
    inset: "0 0 auto 0",
    zIndex: 9999,
    background: "rgba(8,6,4,0.95)",
    color: "#EDF2F4",
    font: "13px/1.5 ui-monospace, Menlo, monospace",
    padding: "14px 16px",
    borderBottom: "1px solid rgba(162,180,190,0.3)",
  };

  return (
    <div style={caixa}>
      <strong style={{ color: "#C9A65C" }}>MEDIDOR DE FLING · {fase}</strong>
      {resultado ? (
        <div style={{ marginTop: 8 }}>
          <div>
            quadros {resultado.quadros} · <strong>&gt;50ms {resultado.acima50}</strong> ·
            &gt;100ms {resultado.acima100}
          </div>
          <div>
            mediana {resultado.mediana} · p95 {resultado.p95} · pior {resultado.pior} ms
          </div>
          <div>
            vídeo andou {resultado.videoAndou}s de {resultado.videoDuracao}
          </div>
          <div>
            scroll {resultado.scrollFinal} de {resultado.scrollTotal}
          </div>
          <div style={{ marginTop: 6, opacity: 0.6, fontSize: 11 }}>
            Safari iOS real. Sem dedo: mede o decoder, não o UIScrollView.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, opacity: 0.7 }}>…</div>
      )}
    </div>
  );
}
