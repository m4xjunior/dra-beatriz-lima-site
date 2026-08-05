// A linha do tempo do procedimento — o dado que a régua lê.
//
// POR QUE O SCROLL É UM CALENDÁRIO, E NÃO UMA BARRA DE PROGRESSO:
// toxina botulínica não aparece, ela INSTALA. Dia 3 dá o primeiro sinal,
// dia 7 tem ~70% do efeito, dia 14 é o resultado. Essa lentidão é do
// domínio, não uma metáfora que inventamos. Amarrar o polegar dela a
// esse calendário é o que separa esta peça de um filtro: um filtro é
// aplicado em você, aqui ela conduz, e conduz nos dois sentidos.
//
// SOBRE AS DOSES: são plano ILUSTRATIVO de um caso típico, não
// prescrição. Dose real depende de avaliação presencial, força muscular
// e assimetria própria. O aviso vai na tela, não só neste comentário —
// ver `avisoClinico` no fim do arquivo.

/** Marcos da instalação. `p` é a posição no scroll, 0..1. */
export const MARCOS = [
  {
    p: 0.0,
    dia: 0,
    fase: "avaliação",
    titulo: "Antes de qualquer agulha",
    corpo:
      "A avaliação é geométrica antes de ser estética: terços faciais, força de cada músculo, e a assimetria que você já tem. Simetria perfeita não é o objetivo — nenhum rosto humano é simétrico, e o que parece artificial costuma ser exatamente a tentativa de forçar isso.",
    pontos: [],
    unidades: 0,
  },
  {
    p: 0.18,
    dia: 0,
    fase: "aplicação",
    titulo: "Glabela",
    corpo:
      "A linha vertical entre as sobrancelhas, a que aparece quando você franze. Cinco pontos, músculo corrugador e prócero, plano intramuscular.",
    pontos: [
      { n: 1, regiao: "glabela", camada: "intramuscular", u: 20 },
    ],
    unidades: 20,
  },
  {
    p: 0.34,
    dia: 0,
    fase: "aplicação",
    titulo: "Terço superior",
    corpo:
      "Frontal, em dose baixa e distribuída. Aqui a contenção importa mais que em qualquer outro ponto: travar o frontal inteiro é o que produz a testa parada que todo mundo reconhece de longe.",
    pontos: [
      { n: 2, regiao: "frontal", camada: "intramuscular", u: 10 },
    ],
    unidades: 30,
  },
  {
    p: 0.48,
    dia: 0,
    fase: "aplicação",
    titulo: "Periorbital",
    corpo:
      "As linhas que abrem no canto do olho quando você sorri. Aplicação superficial, três pontos de cada lado, longe da órbita.",
    pontos: [
      { n: 3, regiao: "periorbital direito", camada: "subcutâneo", u: 6 },
      { n: 4, regiao: "periorbital esquerdo", camada: "subcutâneo", u: 6 },
    ],
    unidades: 42,
  },
  {
    p: 0.6,
    dia: 2,
    fase: "recuperação",
    titulo: "Dois dias depois",
    corpo:
      "Pode haver equimose nos pontos de entrada — o roxo que aparece quando a agulha encontra um vaso pequeno. É comum, é passageiro, e some sozinho. Nada mudou no rosto ainda.",
    pontos: [],
    unidades: 42,
    equimose: "cedo",
  },
  {
    p: 0.72,
    dia: 3,
    fase: "instalação",
    titulo: "O primeiro sinal",
    corpo:
      "A toxina começa a agir por volta do terceiro dia. O movimento fica mais lento antes de ficar mais leve. Quem convive com você ainda não percebe.",
    pontos: [],
    unidades: 42,
  },
  {
    p: 0.85,
    dia: 7,
    fase: "instalação",
    titulo: "Sete dias",
    corpo:
      "Cerca de setenta por cento do efeito. É aqui que a maioria das pessoas se olha no espelho e reconhece a diferença sem conseguir nomear o que mudou.",
    pontos: [],
    unidades: 42,
    equimose: "tarde",
  },
  {
    p: 1.0,
    dia: 14,
    fase: "resultado",
    titulo: "Catorze dias",
    corpo:
      "Resultado completo, e a data da reavaliação. O que ficou assimétrico se ajusta agora, com dose pequena. E o mais importante: isto não é permanente. A toxina metaboliza em três a quatro meses e o rosto volta inteiro ao que era.",
    pontos: [],
    unidades: 42,
  },
];

/**
 * Qual marco está valendo neste progresso.
 * Busca linear de propósito: são 8 itens, e um índice binário aqui
 * economizaria microssegundos ao custo de um lugar a mais para errar.
 */
export function marcoEm(progresso) {
  let atual = MARCOS[0];
  for (const m of MARCOS) {
    if (progresso >= m.p) atual = m;
    else break;
  }
  return atual;
}

export const avisoClinico =
  "Plano ilustrativo de um caso típico. Dose e pontos dependem de avaliação presencial — nenhum rosto recebe o mesmo mapa.";
