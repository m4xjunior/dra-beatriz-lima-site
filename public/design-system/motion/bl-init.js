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
BLMotion.ready().then(() => BLMotion.auto());
