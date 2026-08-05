// Núcleo puro do scrub: scroll → progresso → quadro.
//
// Portado de apps/web/_referencia/fundo-vivo.ts.ref (v5, provada em uso
// real). Aqui ficam SÓ as funções sem efeito colateral, para que os
// invariantes que custaram caro tenham teste sem precisar de navegador.
// O driver com DOM, fila de seek e requestVideoFrameCallback vive em
// usarScrubDeVideo.js e importa daqui.
//
// Cada guarda abaixo existe por um defeito que aconteceu, não por
// precaução genérica. O teste ao lado nomeia qual.

/** Folga do fim: pedir exatamente `duration` devolve quadro preto em
 *  alguns decoders. */
export const MARGEM_FIM = 0.05;

/** Abaixo disto o quadro na tela já é o quadro do scroll — 1/10 de
 *  quadro a 24fps. Pedir um seek menor que isso é trabalho perdido. */
export const TOLERANCIA_SEEK = 0.004;

/**
 * Posição do scroll normalizada em 0..1.
 *
 * O clamp inferior não é enfeite: o overscroll elástico do macOS produz
 * scrollY negativo no topo, e sem ele o alvo ficava negativo e o wrap do
 * vídeo saltava para o FIM do clipe.
 */
export function progressoDoScroll(scrollY, alturaRolavel) {
  if (!(alturaRolavel > 0)) return 0;
  const bruto = scrollY / alturaRolavel;
  if (!Number.isFinite(bruto)) return 0;
  return Math.min(1, Math.max(0, bruto));
}

/**
 * Posição do scroll normalizada em 0..1 DENTRO DE UMA SEÇÃO.
 *
 * A v5 mapeava o clipe inteiro na altura inteira do documento. Com um
 * .mp4 de rosto por procedimento (decisão de 05/08/2026), cada seção
 * comanda o seu próprio vídeo e precisa do seu próprio 0..1.
 *
 * O percurso é a altura da seção MENOS a viewport: é a distância que o
 * scroll ainda anda enquanto a seção ocupa a tela. Quando a seção é mais
 * curta que a viewport esse número fica negativo, e dividir por ele
 * devolveria progresso invertido — daí a guarda, que vale para o último
 * bloco de uma página curta.
 *
 * Os dois clamps não são simetria decorativa. O de baixo segura o vídeo
 * no primeiro quadro enquanto a seção ainda desce; o de cima impede que
 * a seção seguinte empurre esta para além de 1 e o wrap devolva o vídeo
 * ao começo.
 */
export function progressoDaSecao(scrollY, topoDaSecao, alturaDaSecao, alturaViewport) {
  const percurso = alturaDaSecao - alturaViewport;
  if (!(percurso > 0)) return scrollY > topoDaSecao ? 1 : 0;
  const bruto = (scrollY - topoDaSecao) / percurso;
  if (!Number.isFinite(bruto)) return 0;
  return Math.min(1, Math.max(0, bruto));
}

/**
 * Progresso 0..1 → segundo do vídeo.
 *
 * `duracao` é NaN até o loadedmetadata chegar, e escrever NaN em
 * currentTime lança no Safari. Por isso o guarda de finitude.
 */
export function tempoAlvo(progresso, duracao, margemFim = MARGEM_FIM) {
  if (!Number.isFinite(duracao) || duracao <= 0) return 0;
  const teto = Math.max(0, duracao - margemFim);
  const p = Math.min(1, Math.max(0, progresso));
  return Math.min(teto, Math.max(0, p * duracao));
}

/**
 * Progresso 0..1 → índice de uma sequência de `total` quadros.
 *
 * O `total - 1` evita o erro clássico: floor(1 * 90) = 90, índice que
 * não existe num array de 90, e o quadro indefinido pinta transparente
 * (a peça "pisca" no fim do scroll).
 */
export function indiceDoFrame(progresso, total) {
  if (!(total > 0)) return 0;
  const p = Math.min(1, Math.max(0, progresso));
  return Math.min(total - 1, Math.max(0, Math.floor(p * total)));
}

/**
 * Vale a pena pedir este seek?
 *
 * Valor absoluto porque scrub é bidirecional: comparar com sinal faz o
 * scroll para cima parar de atualizar o quadro.
 */
export function precisaBuscar(destino, atual, tolerancia = TOLERANCIA_SEEK) {
  return Math.abs(destino - atual) >= tolerancia;
}
