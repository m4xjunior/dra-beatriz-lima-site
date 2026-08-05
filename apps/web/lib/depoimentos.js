// Depoimentos de pacientes.
//
// A LISTA NASCE VAZIA, E ISSO É A IMPLEMENTAÇÃO, NÃO UMA PENDÊNCIA.
//
// Depoimento inventado é avaliação falsa. Não existe versão aceitável
// disso: nem como "exemplo para ver o layout", porque exemplo plausível
// é justamente o que vai ao ar sem ninguém notar. A seção some enquanto
// a lista estiver vazia.
//
// A CFBM Res. 330/2020 alcança depoimento igual alcança foto: precisa de
// consentimento e não pode prometer resultado. Por isso o campo
// `consentimento` é obrigatório para publicar, mesma trava da galeria.
//
// POR QUE ISTO NÃO É A MESMA COISA QUE A GALERIA:
// a foto mostra o que mudou no rosto. O depoimento mostra como foi ser
// atendida — se doeu, se foi explicado, se ela voltaria. É a segunda
// pergunta que trava o agendamento, e nenhuma foto responde.
//
// Formato de cada entrada:
//
//   {
//     nome: "Primeiro nome + inicial",   // nunca nome completo
//     contexto: "Toxina botulínica",     // o que ela fez
//     texto: "...",                      // palavras dela, não reescritas
//     consentimento: { obtido: true, data: "AAAA-MM-DD", referencia: "TDEP-2026-001" },
//   }
//
// `referencia` é o nº do termo de uso de depoimento no prontuário.

export const DEPOIMENTOS = [];

/** Só entra no site quem tem termo. A trava é a função, não a memória. */
export const depoimentosPublicaveis = () =>
  DEPOIMENTOS.filter((d) => d?.consentimento?.obtido === true);
