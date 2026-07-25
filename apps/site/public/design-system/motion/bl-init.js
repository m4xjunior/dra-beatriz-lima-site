// @ts-nocheck — BLMotion é global de terceiro, injetado pelos scripts
// anteriores (gsap, ScrollTrigger, SplitText, bl-motion.js).
//
// Por que este arquivo existe separado, e não inline no BaseLayout:
// os 4 scripts anteriores usam `defer` para baixar em paralelo (em vez
// de travar o parser um de cada vez). `defer` SÓ garante ordem de
// execução entre scripts que também são deferred — um <script> inline
// sem src ignora o atributo defer e roda na hora, fora de ordem, então
// `BLMotion` ainda não existia quando ele tentava chamar `.ready()`
// (ReferenceError: BLMotion is not defined). Botar essa linha num
// arquivo com src="" + defer resolve: agora ela entra na mesma fila
// ordenada dos outros 4 e só roda depois que bl-motion.js define
// `window.BLMotion`.
//
// O catch não é decoração: movimento é ENFEITE, e enfeite quebrado não
// pode derrubar a página. Se o CDN do GSAP não responder, o site tem que
// continuar legível e navegável — só sem as entradas coreografadas. Cada
// receita do BL·Motion já cai no estado final estático sozinha, então
// não há nada a restaurar aqui.
if (typeof BLMotion === "undefined") {
  console.warn("BL·Motion não carregou — o site segue estático.");
} else {
  BLMotion.ready()
    .then(() => BLMotion.auto())
    .catch((erro) => {
      console.warn("BL·Motion desligado:", erro.message);
    });
}
