// FAQ.
//
// Duas funções ao mesmo tempo, e a segunda é a que costuma ser esquecida:
// derruba a objeção antes do contato, e é a dobra que mais rende busca
// orgânica — porque é o único texto do site escrito exatamente com as
// palavras que a pessoa digita no Google.
//
// Por isso as perguntas estão em primeira pessoa e sem jargão. "Dói?" e
// não "Sobre o desconforto durante a aplicação".
//
// REGULATÓRIO: nenhuma resposta promete resultado, prazo de duração como
// garantia, ou usa termo de promoção. A validação está no fim do arquivo
// e roda no import — uma resposta fora da regra derruba o build, que é
// onde esse erro tem que aparecer.

export const PERGUNTAS = [
  {
    p: "Dói?",
    r: "Depende do procedimento e do seu limiar. Na toxina botulínica a agulha é muito fina e a maioria das pessoas descreve como uma fisgada rápida. Em preenchimentos usamos anestésico tópico antes, e o próprio produto costuma trazer anestésico na composição. Você pode pedir uma pausa a qualquer momento.",
  },
  {
    p: "Vou conseguir trabalhar no dia seguinte?",
    r: "Na maioria dos casos sim. É comum haver vermelhidão e inchaço nas primeiras horas, e em preenchimentos pode aparecer equimose (o roxo) que leva alguns dias para sair. Se você tem um compromisso importante, me diga na avaliação — a gente escolhe a data pensando nisso.",
  },
  {
    p: "Quanto tempo dura?",
    r: "Varia com o procedimento, o seu metabolismo e a sua rotina. Toxina botulínica e preenchimentos são temporários e precisam de manutenção; bioestimuladores trabalham ao longo de meses. Falo do intervalo esperado no seu caso durante a avaliação, com base no seu histórico.",
  },
  {
    p: "Quantas sessões vou precisar?",
    r: "Só dá para responder depois de avaliar o seu rosto. Alguns protocolos resolvem em sessão única, outros são construídos em etapas. Você sai da avaliação sabendo o número, o intervalo e o motivo de cada etapa.",
  },
  {
    p: "Posso fazer se estiver grávida ou amamentando?",
    r: "Não. Gestação e amamentação são contraindicação para a maior parte dos procedimentos injetáveis. Alguns protocolos de pele são possíveis, mas isso é avaliado caso a caso e sempre em conversa com quem acompanha o seu pré-natal.",
  },
  {
    p: "Vou ficar com cara de artificial?",
    r: "Esse é o medo mais comum e é legítimo. Trabalho a partir da sua anatomia, não de um modelo pronto: o objetivo é você descansada, não você parecida com outra pessoa. Na avaliação eu mostro o que pretendo fazer e o que não vou fazer, e você decide.",
  },
  {
    p: "O que acontece na avaliação?",
    r: "Conversamos sobre o que te incomoda, eu examino o seu rosto, levanto o seu histórico de saúde e de procedimentos anteriores. Saio dali com uma indicação clara — que pode inclusive ser não fazer nada agora. A avaliação não obriga você a fechar nada no mesmo dia.",
  },
  {
    p: "Preciso parar algum remédio antes?",
    r: "Alguns anticoagulantes e anti-inflamatórios aumentam a chance de equimose, e certos medicamentos são contraindicação. Por isso o histórico completo entra na avaliação. Nunca suspenda medicação por conta própria: a orientação vem de mim junto com quem prescreveu.",
  },
];

// Mesma barreira de linguagem que existia no schema dos procedimentos.
// Aqui ela precisa ser explícita porque não há Zod nesta coleção.
const TERMOS_PROIBIDOS =
  /promo(ç|c)[aã]o|desconto|vagas?|combo|garantid[oa]|milagr|resultado garantido/i;

for (const { p, r } of PERGUNTAS) {
  if (TERMOS_PROIBIDOS.test(`${p} ${r}`)) {
    throw new Error(
      `FAQ fora da CFBM Res. 330/2020 (promoção ou garantia de resultado): "${p}"`,
    );
  }
}
