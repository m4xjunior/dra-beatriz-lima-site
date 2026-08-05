// Dados da clínica — fonte única.
//
// POR QUE EXISTE UM ARQUIVO SÓ PARA ISTO:
// endereço, WhatsApp e CRBM aparecem em cinco lugares (nav, localização,
// rodapé, botão flutuante, JSON-LD). Espalhar a string por cinco
// componentes garante que, no dia da mudança, um deles fica para trás.
//
// CAMPOS VAZIOS SÃO INTENCIONAIS.
// Número de CRBM, CNPJ e endereço são dados regulatórios: preencher com
// exemplo plausível é pior que deixar vazio, porque um placeholder
// verossímil vai ao ar sem ninguém notar. Toda seção que consome estes
// campos OMITE o bloco quando o valor está vazio, em vez de exibir
// "—" ou texto de exemplo. Ver `temValor` abaixo.
//
// PENDENTE DE PREENCHIMENTO PELA CLÍNICA: crbm, cnpj, razaoSocial,
// endereco.*, telefone, depoimentos (lib/depoimentos.js).

export const CLINICA = {
  nome: "Dra. Beatriz Lima",
  titulo: "Biomédica Esteta",
  cidade: "Goiânia",
  uf: "GO",

  // --- Regulatório (CFBM Res. 330/2020) ---------------------------
  // O CRBM é obrigatório em material de divulgação. Enquanto vazio, o
  // rodapé mostra um aviso em desenvolvimento e some em produção.
  crbm: "",
  razaoSocial: "",
  cnpj: "",

  // --- Contato ----------------------------------------------------
  // Só dígitos, com DDI. É o formato que a URL do wa.me exige.
  whatsapp: "",
  telefone: "",
  email: "",
  instagram: "drabeatrizlima",

  // --- Endereço ---------------------------------------------------
  endereco: {
    logradouro: "",
    complemento: "",
    bairro: "",
    cep: "",
  },

  // --- Atendimento ------------------------------------------------
  // Formato de par para o JSON-LD de LocalBusiness conseguir consumir
  // sem reparse de texto livre.
  horarios: [
    { dias: "Segunda a sexta", abre: "09:00", fecha: "19:00" },
    { dias: "Sábado", abre: "09:00", fecha: "13:00" },
  ],
};

/** Um campo só conta como preenchido se tiver conteúdo de verdade. */
export const temValor = (v) => typeof v === "string" && v.trim().length > 0;

/** Endereço em uma linha, montado só com as partes que existem. */
export function enderecoEmLinha() {
  const e = CLINICA.endereco;
  const partes = [e.logradouro, e.complemento, e.bairro, CLINICA.cidade, e.cep]
    .filter(temValor);
  return partes.join(", ");
}

/**
 * Link do WhatsApp com a mensagem já escrita.
 *
 * A mensagem pronta não é enfeite: sem ela a paciente abre a conversa em
 * branco, trava no "oi" e boa parte desiste ali. Com o contexto já
 * digitado, o primeiro envio custa um toque.
 *
 * Devolve null quando o número não foi preenchido — quem chama decide
 * se esconde o botão ou cai no Instagram.
 */
export function linkWhatsapp(assunto) {
  if (!temValor(CLINICA.whatsapp)) return null;
  const texto = assunto
    ? `Olá! Vim pelo site e gostaria de agendar uma avaliação sobre ${assunto}.`
    : "Olá! Vim pelo site e gostaria de agendar uma avaliação.";
  return `https://wa.me/${CLINICA.whatsapp}?text=${encodeURIComponent(texto)}`;
}

/** Instagram como saída quando o WhatsApp ainda não existe. */
export const linkInstagram = `https://instagram.com/${CLINICA.instagram}`;

/**
 * Melhor canal disponível agora. Todo CTA do site passa por aqui, então
 * o dia em que o WhatsApp for preenchido, todos mudam juntos.
 */
export function canalDeContato(assunto) {
  return linkWhatsapp(assunto) ?? linkInstagram;
}
