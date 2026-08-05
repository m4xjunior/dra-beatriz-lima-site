// Testes do núcleo puro do scrub.
//
// Só matemática aqui: nada de DOM, nada de vídeo, nada de rede. É de
// propósito — estas quatro funções são as que carregam os defeitos reais
// já pagos neste projeto (ver ADR em _referencia/fundo-vivo.ts.ref), e
// defeito de aritmética não precisa de navegador para aparecer.
//
// Cada caso abaixo corresponde a um bug que ACONTECEU em uso, não a uma
// hipótese. O nome do teste diz qual.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  progressoDoScroll,
  progressoDaSecao,
  tempoAlvo,
  indiceDoFrame,
  precisaBuscar,
} from "./scrub.js";

// ---------------------------------------------------------------
// progressoDoScroll — scroll bruto vira 0..1
// ---------------------------------------------------------------

test("progressoDoScroll devolve 0 no topo e 1 no fim", () => {
  assert.equal(progressoDoScroll(0, 1000), 0);
  assert.equal(progressoDoScroll(1000, 1000), 1);
  assert.equal(progressoDoScroll(500, 1000), 0.5);
});

test("progressoDoScroll trava em 0 quando o scrollY é NEGATIVO (rubber-band do macOS)", () => {
  // BUG REAL registrado na ADR: sem clamp, o overscroll elástico do
  // macOS produz scrollY negativo, o alvo fica negativo, e o wrap do
  // vídeo jogava o frame para o FIM. Era o "bug do frame inicial".
  assert.equal(progressoDoScroll(-120, 1000), 0);
});

test("progressoDoScroll trava em 1 quando o scrollY passa do fim", () => {
  assert.equal(progressoDoScroll(4000, 1000), 1);
});

test("progressoDoScroll nunca divide por zero quando a página não rola", () => {
  // Página mais curta que a viewport: alturaRolavel = 0. Sem guarda isso
  // é 0/0 = NaN, e NaN contamina currentTime silenciosamente.
  const p = progressoDoScroll(0, 0);
  assert.ok(Number.isFinite(p), `esperava número finito, veio ${p}`);
  assert.equal(p, 0);
});

// ---------------------------------------------------------------
// progressoDaSecao — cada procedimento tem o SEU rosto e o SEU trecho
// ---------------------------------------------------------------
// Decisão do Max em 05/08/2026: um .mp4 de rosto POR PROCEDIMENTO, e a
// página vira um conjunto de seções. O mapeamento deixa de ser "o clipe
// inteiro na altura inteira do documento" (o que a v5 fazia) e passa a
// ser por seção. Estas são as bordas onde isso erra.

test("progressoDaSecao é 0 enquanto a seção ainda não chegou ao topo", () => {
  // Seção começa em 2000, o scroll está em 1200. Ela ainda vem descendo:
  // o vídeo dela tem de estar parado no primeiro quadro, não no meio.
  assert.equal(progressoDaSecao(1200, 2000, 3000, 800), 0);
});

test("progressoDaSecao é 0 exatamente quando o topo da seção encosta no topo da tela", () => {
  assert.equal(progressoDaSecao(2000, 2000, 3000, 800), 0);
});

test("progressoDaSecao é 1 quando a seção terminou de passar", () => {
  // percurso = altura da seção (3000) - viewport (800) = 2200.
  // 2000 + 2200 = 4200 é o fim.
  assert.equal(progressoDaSecao(4200, 2000, 3000, 800), 1);
});

test("progressoDaSecao continua 1 depois que a seção já saiu de vista", () => {
  // Sem clamp superior, a seção seguinte empurraria esta para além de 1
  // e o wrap jogaria o vídeo de volta ao começo — o mesmo defeito de
  // frame inicial que o clamp do rubber-band resolveu no global.
  assert.equal(progressoDaSecao(9000, 2000, 3000, 800), 1);
});

test("progressoDaSecao chega à metade no meio do percurso", () => {
  // percurso 2200, metade = 1100, logo scrollY 3100.
  assert.equal(progressoDaSecao(3100, 2000, 3000, 800), 0.5);
});

test("progressoDaSecao não divide por zero quando a seção é menor que a viewport", () => {
  // Seção de 600 numa viewport de 800: percurso negativo. Sem guarda
  // isso vira divisão por número <= 0 e o progresso sai NaN ou invertido.
  const p = progressoDaSecao(2000, 2000, 600, 800);
  assert.ok(Number.isFinite(p), `esperava número finito, veio ${p}`);
  assert.ok(p >= 0 && p <= 1, `esperava 0..1, veio ${p}`);
});

test("progressoDaSecao trata seção de altura exatamente igual à viewport", () => {
  const p = progressoDaSecao(2000, 2000, 800, 800);
  assert.ok(Number.isFinite(p), `esperava número finito, veio ${p}`);
});

// ---------------------------------------------------------------
// tempoAlvo — progresso vira segundos de vídeo
// ---------------------------------------------------------------

test("tempoAlvo mapeia 0..1 na duração do vídeo", () => {
  assert.equal(tempoAlvo(0, 10, 0), 0);
  assert.equal(tempoAlvo(0.5, 10, 0), 5);
});

test("tempoAlvo respeita a margem do fim (pedir duration exata devolve frame preto)", () => {
  // Alguns decoders devolvem quadro preto quando currentTime == duration.
  // A margem existe por isso, e o teste garante que ela não seja perdida
  // num refactor.
  assert.equal(tempoAlvo(1, 10, 0.05), 9.95);
});

test("tempoAlvo nunca devolve negativo", () => {
  assert.equal(tempoAlvo(-1, 10, 0.05), 0);
});

test("tempoAlvo devolve 0 enquanto a duração é desconhecida (NaN antes do loadedmetadata)", () => {
  // video.duration é NaN até os metadados chegarem. Escrever NaN em
  // currentTime lança no Safari.
  const t = tempoAlvo(0.5, NaN, 0.05);
  assert.ok(Number.isFinite(t), `esperava número finito, veio ${t}`);
  assert.equal(t, 0);
});

// ---------------------------------------------------------------
// indiceDoFrame — progresso vira índice de sequência
// ---------------------------------------------------------------

test("indiceDoFrame cobre o primeiro e o último frame", () => {
  assert.equal(indiceDoFrame(0, 90), 0);
  assert.equal(indiceDoFrame(1, 90), 89);
});

test("indiceDoFrame nunca estoura o array no progresso 1", () => {
  // O erro clássico: floor(1 * 90) = 90, que é índice inexistente num
  // array de 90. Um frame indefinido pinta transparente e a peça
  // "pisca" no fim do scroll.
  for (const total of [1, 2, 24, 90, 290]) {
    const i = indiceDoFrame(1, total);
    assert.ok(i <= total - 1, `total ${total}: índice ${i} estourou`);
    assert.ok(i >= 0, `total ${total}: índice ${i} é negativo`);
  }
});

test("indiceDoFrame distribui os frames uniformemente pelo progresso", () => {
  assert.equal(indiceDoFrame(0.5, 100), 50);
});

// ---------------------------------------------------------------
// precisaBuscar — evita seek que não muda nada
// ---------------------------------------------------------------

test("precisaBuscar é falso quando o destino já está na tela", () => {
  // Pedir um seek menor que 1/10 de frame é trabalho jogado fora, e em
  // aparelho lento cada seek desperdiçado atrasa o que importa.
  assert.equal(precisaBuscar(5.0, 5.001, 0.004), false);
});

test("precisaBuscar é verdadeiro quando a diferença passa a tolerância", () => {
  assert.equal(precisaBuscar(5.0, 5.2, 0.004), true);
});

test("precisaBuscar enxerga diferença nos dois sentidos", () => {
  // Scrub é bidirecional. Comparar sem valor absoluto faz o scroll para
  // cima parar de atualizar o frame.
  assert.equal(precisaBuscar(4.8, 5.0, 0.004), true);
});
