// O catálogo real: os 8 procedimentos que a Dra. faz.
//
// Substitui os 3 provisórios que eu tinha inventado só para conseguir
// medir o scrub. A lista veio do peer de UX; os 6 do
// dados/galeria/procedimentos.json são um subconjunto — nem todo
// procedimento tem foto de antes/depois com termo de consentimento
// assinado, e a galeria só mostra os que têm (CFBM 330/2020).
//
// `slugGaleria` é a ponte: null quer dizer "não tem prova fotográfica
// liberada", e a página do procedimento tem de funcionar sem ela.
//
// SOBRE O CONTEÚDO CLÍNICO: indicações e contraindicações aqui são
// gerais e informativas, do tipo que existe em material educativo. Não
// substituem avaliação, e cada página repete isso na tela. Números de
// duração são faixas típicas, não promessa — o que dura no rosto de uma
// pessoa não é o que dura no de outra.
//
// `video: null` é estado normal: os rostos por procedimento ainda vão
// ser gerados (pipeline em specs/video-procedimento.md). Enquanto isso a
// seção cai no clipe provisório e continua utilizável.

// A mídia passa pelo Worker de borda (apps/cdn), não pelo bucket direto.
//
// MEDIDO em 05/08/2026, na operação que o scrub mais faz — requisição de
// faixa de bytes, que é o que todo seek dispara:
//
//   GCS direto        ttfb 1,38s   (as três medições, sem variação)
//   via Cloudflare    ttfb 0,12s
//
// 11x. A causa: faixa de bytes no GCS NÃO bate no cache de borda do
// Google, vai até São Paulo toda vez. O Worker guarda o objeto inteiro
// na borda e corta local.
//
// O bucket continua sendo a fonte; o Worker só espelha, e só quatro
// prefixos (ver apps/cdn/src/index.js). Trocar esta linha de volta para
// a URL do bucket é o plano de contingência se a borda cair.
const GCS = "https://bl-midia.meireles-maxjunior.workers.dev";

/** Clipe da Dra. já encodado para scrub (GOP 4, keyframe a cada ~3,9
 *  quadros). Serve todas as seções até existir rosto por procedimento. */
export const videoProvisorio = {
  desktop: `${GCS}/v2/scrub_video/hero-1080-scrub.mp4`,
  desktopGrande: `${GCS}/v2/scrub_video/hero-1440-scrub.mp4`,
  mobile: `${GCS}/v2/scrub_video/hero-mobile-1080-scrub.mp4`,
  mobileLeve: `${GCS}/v2/scrub_video/hero-mobile-720-scrub.mp4`,
  posterDesktop: `${GCS}/v2/web_video/poster-desktop.jpg`,
  posterMobile: `${GCS}/v2/web_video/poster-mobile.jpg`,
};

export const PROCEDIMENTOS = [
  {
    slug: "toxina-botulinica",
    nome: "Toxina botulínica",
    resumo: "Relaxa a musculatura que marca a expressão, sem apagar o movimento.",
    regiao: "terço superior",
    instrumento: "agulha 30G",
    slugGaleria: "toxina-botulinica",
    video: null,
    // 5 e não 4: a primeira seção carrega o Hero além dos marcos, e o
    // scrub precisa de percurso para os dois sem acelerar o vídeo.
    dobras: 5,
    duracao: "3 a 4 meses",
    sessoes: "1 sessão, reavaliação em 14 dias",
    oQueE:
      "A toxina reduz a contração de músculos específicos. As linhas que aparecem quando você franze deixam de se formar com a mesma força, e a pele acima delas para de dobrar sempre no mesmo lugar.",
    indicacoes: [
      "Linhas de expressão na glabela, testa e canto dos olhos",
      "Assimetria de sobrancelha por diferença de força muscular",
      "Prevenção em quem tem marca profunda começando cedo",
    ],
    contraindicacoes: [
      "Gravidez e amamentação",
      "Doenças neuromusculares (miastenia gravis, Eaton-Lambert)",
      "Infecção ativa no local da aplicação",
      "Alergia conhecida a qualquer componente da fórmula",
    ],
  },
  {
    slug: "preenchimentos-full-face",
    nome: "Preenchimentos full face",
    resumo: "Devolve volume onde o rosto perdeu sustentação, lendo a face inteira.",
    regiao: "terços médio e inferior",
    instrumento: "cânula romba e agulha",
    slugGaleria: "preenchimentos-full-face",
    video: null,
    dobras: 3,
    duracao: "12 a 18 meses",
    sessoes: "1 a 2 sessões, conforme o plano",
    oQueE:
      "Ácido hialurônico reposto em planos diferentes conforme a região. Full face quer dizer que a leitura é do rosto inteiro: repor só onde parece faltar costuma desequilibrar o resto.",
    indicacoes: [
      "Perda de volume no terço médio, com sulco nasogeniano marcado",
      "Contorno mandibular pouco definido",
      "Olheira de sulco (não a de pigmento)",
    ],
    contraindicacoes: [
      "Gravidez e amamentação",
      "Doença autoimune em atividade",
      "Infecção ativa ou lesão de pele no local",
      "Histórico de reação a ácido hialurônico",
    ],
  },
  {
    slug: "preenchimento-labial",
    nome: "Preenchimento labial",
    resumo: "Hidratação, contorno e proporção — não volume pelo volume.",
    regiao: "lábios",
    instrumento: "cânula romba",
    slugGaleria: "preenchimento-labial",
    video: null,
    dobras: 3,
    duracao: "9 a 12 meses",
    sessoes: "1 sessão",
    oQueE:
      "Ácido hialurônico aplicado respeitando a proporção entre lábio superior e inferior e o desenho do arco do cupido. A referência clássica é o inferior maior que o superior; forçar simetria entre os dois é o que produz a boca que se reconhece de longe.",
    indicacoes: [
      "Lábios finos por característica ou por perda de volume",
      "Contorno apagado, com o batom escorrendo nas linhas",
      "Assimetria entre os lados",
    ],
    contraindicacoes: [
      "Herpes labial em atividade",
      "Gravidez e amamentação",
      "Doença autoimune em atividade",
      "Preenchedor permanente prévio na região",
    ],
  },
  {
    slug: "bioestimulador",
    nome: "Bioestimulador de colágeno",
    resumo: "Não preenche: faz a sua pele produzir colágeno de novo.",
    regiao: "terço médio, pescoço, colo",
    instrumento: "agulha longa",
    slugGaleria: null,
    video: null,
    dobras: 3,
    duracao: "18 a 24 meses",
    sessoes: "2 a 3 sessões, com 30 a 45 dias entre elas",
    oQueE:
      "A substância aplicada é um estímulo, não um volume. O corpo reage produzindo colágeno próprio ao longo de semanas, e por isso o resultado aparece devagar — entre 60 e 90 dias. Quem espera diferença na semana seguinte acha que não funcionou.",
    indicacoes: [
      "Flacidez leve a moderada de pele",
      "Perda de firmeza no terço médio, pescoço e colo",
      "Quem quer melhora de qualidade de pele, não mudança de contorno",
    ],
    contraindicacoes: [
      "Gravidez e amamentação",
      "Doença autoimune em atividade",
      "Infecção ativa no local",
      "Tendência a queloide, dependendo do produto",
    ],
  },
  {
    slug: "perfiloplastia",
    nome: "Perfiloplastia",
    resumo: "Reorganiza o perfil: nariz, mento e mandíbula lidos em conjunto.",
    regiao: "perfil — nariz, mento, mandíbula",
    instrumento: "cânula",
    slugGaleria: "perfiloplastia",
    video: null,
    dobras: 3,
    duracao: "12 a 18 meses",
    sessoes: "1 a 2 sessões",
    oQueE:
      "O perfil é uma relação, não três peças soltas. Projetar o mento muda como o nariz é percebido, e definir a mandíbula muda os dois. Por isso a avaliação é feita de lado, com foto padronizada, antes de decidir o que recebe produto.",
    indicacoes: [
      "Mento retraído, com aparência de nariz proeminente",
      "Ângulo mandibular pouco marcado",
      "Dorso nasal com giba leve, em caso selecionado",
    ],
    contraindicacoes: [
      "Gravidez e amamentação",
      "Rinoplastia recente ou cirurgia programada na região",
      "Doença autoimune em atividade",
      "Infecção ativa no local",
    ],
  },
  {
    slug: "peelings",
    nome: "Peelings",
    resumo: "Renova a camada superficial para tratar mancha, textura e acne.",
    regiao: "face, colo, mãos",
    instrumento: "aplicação tópica",
    slugGaleria: "peelings",
    video: null,
    dobras: 2,
    duracao: "depende do protocolo e da manutenção",
    sessoes: "3 a 6 sessões, com 15 a 30 dias entre elas",
    oQueE:
      "Um ativo aplicado na pele acelera a renovação da camada superficial. A profundidade muda tudo: superficial descama pouco e permite rotina normal, médio pede afastamento de sol por semanas.",
    indicacoes: [
      "Melasma e hiperpigmentação pós-inflamatória",
      "Textura irregular e poro dilatado",
      "Acne ativa leve a moderada e suas marcas",
    ],
    contraindicacoes: [
      "Exposição solar intensa recente ou prevista",
      "Uso de isotretinoína nos últimos meses",
      "Herpes em atividade",
      "Gravidez, dependendo do ativo",
    ],
  },
  {
    slug: "limpeza-de-pele",
    nome: "Limpeza de pele",
    resumo: "A base de tudo: extração, higienização e barreira restaurada.",
    regiao: "face",
    instrumento: "extração manual e aparelhos",
    slugGaleria: "limpeza-de-pele",
    video: null,
    dobras: 2,
    duracao: "manutenção a cada 30 a 60 dias",
    sessoes: "1 sessão, repetida na manutenção",
    oQueE:
      "Higienização profunda com extração de comedões e finalização que devolve a barreira da pele. É o procedimento menos comentado e o que mais muda a resposta de todos os outros: pele com barreira comprometida reage pior a qualquer ativo.",
    indicacoes: [
      "Comedões abertos e fechados",
      "Oleosidade com poro obstruído",
      "Preparo de pele antes de peeling ou de procedimento injetável",
    ],
    contraindicacoes: [
      "Acne inflamatória grave em atividade (avaliar antes)",
      "Lesão ou ferida aberta na face",
      "Rosácea em surto",
      "Uso recente de isotretinoína",
    ],
  },
  {
    slug: "mesoterapia-capilar",
    nome: "Mesoterapia capilar",
    resumo: "Ativos aplicados no couro cabeludo para sustentar o fio.",
    regiao: "couro cabeludo",
    instrumento: "microagulha",
    slugGaleria: null,
    video: null,
    dobras: 2,
    duracao: "manutenção contínua",
    sessoes: "4 a 8 sessões semanais ou quinzenais",
    oQueE:
      "Microinjeções levam os ativos direto ao couro cabeludo, sem depender de absorção pela superfície. O resultado é sustentação do fio existente e melhora do ambiente do folículo, não criação de folículo novo — folículo perdido não volta por esta via.",
    indicacoes: [
      "Afinamento de fio e queda difusa",
      "Complemento de tratamento clínico já em curso",
      "Couro cabeludo oleoso ou com descamação, conforme o protocolo",
    ],
    contraindicacoes: [
      "Infecção ou dermatite ativa no couro cabeludo",
      "Gravidez e amamentação, dependendo do ativo",
      "Distúrbio de coagulação ou uso de anticoagulante sem liberação",
      "Alopecia cicatricial (a via não se aplica)",
    ],
  },
];

export function procedimentoPorSlug(slug) {
  return PROCEDIMENTOS.find((p) => p.slug === slug) ?? null;
}

/** As seções que aparecem na home. A home não mostra os oito: oito
 *  palcos de scroll seguidos são vinte e quatro dobras de vídeo antes de
 *  qualquer prova social, e a página deixaria de ter ritmo. O resto vive
 *  na rota própria, que é a que ranqueia. */
const DESTAQUES_HOME = ["toxina-botulinica", "preenchimentos-full-face", "bioestimulador"];

/** Pronto para consumir: `PROCEDIMENTOS` cresceu de 3 para 8, e a home
 *  que mapeava a lista inteira passaria a montar oito palcos de vídeo.
 *  Quem monta a home usa ESTE array. */
export const PROCEDIMENTOS_HOME = DESTAQUES_HOME.map((s) =>
  PROCEDIMENTOS.find((p) => p.slug === s),
).filter(Boolean);
