// src/content.config.ts
// Fonte única da entidade "procedimento" (Content Collections, Astro 5+ — Content Layer API).
// Cadastrar um novo procedimento = adicionar um .md em src/content/procedimentos/ — nunca uma página nova.
// O slug da URL é o nome do arquivo (id da entrada) — não existe campo "slug" redundante no schema.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7: `z` via 'astro:content' está deprecated (só exporta valor, sem
// namespace de tipo — quebra `z.infer<...>`). Fonte correta: 'astro/zod'.
import { z } from 'astro/zod';

// Termos proibidos pela CFBM Res. 330/2020 — nunca podem aparecer na copy do procedimento.
// Espelha a lógica de "contraste AA é barreira de publicação" do design system, mas para linguagem.
const TERMOS_PROIBIDOS = /promo(ç|c)[aã]o|desconto|vagas?|combo|garantid[oa]|milagr/i;

export const procedimentoSchema = z
  .object({
    // --- Identidade / listagem ---
    titulo: z.string().min(3).max(80),
    eyebrow: z.string().min(3).max(48), // rótulo caixa alta — ex.: "PREENCHIMENTO LABIAL"
    categoria: z.enum([
      'labios',
      'bioestimulador',
      'toxina-harmonizacao',
      'peeling',
      'protocolo-pele',
      // Ampliado 05/08/2026 com a lista fechada de procedimentos que a
      // Dra. Beatriz realiza hoje. Cada valor vira uma aba de filtro na
      // galeria — por isso o enum, e não string livre: um typo no .md
      // criaria uma aba fantasma com um item só.
      'contorno-facial',
      'full-face',
      'capilar',
      'corporal',
    ]),
    carroChefe: z.boolean().default(false), // true só em "preenchimento labial" — controla destaque no ServiceCard
    ordem: z.number().int().min(0).default(0), // ordenação manual no catálogo

    // --- Copy clínica (tom sóbrio, técnico-acolhedor, 2ª pessoa) ---
    resumo: z.string().min(40).max(220), // 1–2 frases — usado no ServiceCard e como fallback de <meta description>
    indicacoes: z.array(z.string().min(3)).min(1),
    contraindicacoes: z.array(z.string().min(3)).min(1),
    cuidadosPosProcedimento: z.array(z.string().min(3)).optional(),
    duracaoMedia: z.string().max(60).optional(), // texto livre — ex.: "cerca de 40 minutos" (duração do ATENDIMENTO, nunca prazo de "resultado")
    notaPreco: z.string().max(140).optional(), // discreto — nunca número/moeda isolado, nunca promoção/desconto

    // --- Mídia (ilustrativa/macro clínico — nunca antes/depois de paciente sem consentimento; fora de escopo aqui) ---
    imagemCapa: z.string().optional(), // path relativo em src/assets/procedimentos/

    // --- Regulatório (CFBM Res. 330/2020) ---
    disclaimerExtra: z.string().max(280).optional(), // texto ADICIONAL — nunca substitui o <Disclaimer> padrão do componente

    // --- Publicação / SEO ---
    publicado: z.boolean().default(true),
    seoTitulo: z.string().max(60).optional(),
    seoDescricao: z.string().max(160).optional(),
  })
  // Barreira de publicação regulatória (§5.7 do readme: "todo parâmetro... validação").
  .refine(
    (dado) =>
      !TERMOS_PROIBIDOS.test(
        `${dado.titulo} ${dado.eyebrow} ${dado.resumo} ${dado.notaPreco ?? ''} ${dado.disclaimerExtra ?? ''}`
      ),
    {
      message:
        'Copy regulatória (CFBM Res. 330/2020): proibido usar termos de promoção, desconto, vagas, combo ou garantia de resultado.',
    }
  );

export type Procedimento = z.infer<typeof procedimentoSchema>;

const procedimentos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/procedimentos' }),
  schema: procedimentoSchema,
});

// ---------------------------------------------------------------------
// GALERIA DE RESULTADOS
//
// REVOGA a decisão de escopo anterior ("nunca antes/depois de paciente"),
// a pedido do Max em 05/08/2026, com as fotos entregues por ele.
//
// A CFBM Res. 330/2020 não proíbe antes/depois em bloco — ela condiciona.
// Exige consentimento escrito e específico da paciente PARA AQUELA
// divulgação, veda a promessa de resultado, e veda usar a imagem como
// chamariz comercial. Por isso `consentimento` é obrigatório no schema e
// `publicado` nasce FALSE: uma foto sem o termo assinado não sobe por
// esquecimento, ela simplesmente não renderiza. A barreira é o tipo, não
// a boa memória de quem edita.
//
// Os arquivos de imagem NÃO moram no repo. Vêm do bucket GCS
// (`gs://dra-beatriz-lima-estetica/galeria/`), com os recortes e
// derivados gerados por scripts/galeria/processar.py — que também escreve
// o manifest.json lido aqui. Editar o .json à mão não é o fluxo: mexer
// no inventário do script e rodar de novo é.
// ---------------------------------------------------------------------

const ladoSchema = z.object({
  origem: z.string(),
  nativo: z.object({ largura: z.number(), altura: z.number() }),
  derivados: z
    .array(
      z.object({
        largura: z.number(),
        altura: z.number(),
        webp: z.string(),
        avif: z.string(),
      })
    )
    .min(1),
});

export const galeriaSchema = z.object({
  slug: z.string(),
  procedimento: z.string(),
  legenda: z.string().min(8).max(140),
  // 'comparativo' = dois lados sobrepostos no slider
  // 'composto'    = peça única já diagramada (não separar)
  tipo: z.enum(['comparativo', 'composto']),
  foco: z.string().default('50% 50%'),
  proporcao: z.number().positive(),
  lados: z.object({
    antes: ladoSchema.optional(),
    depois: ladoSchema.optional(),
    unico: ladoSchema.optional(),
  }),
  // Preenchido pela clínica, não pelo script. Sem isto, não publica.
  consentimento: z
    .object({
      obtido: z.literal(true),
      data: z.string(),
      referencia: z.string().min(3), // nº do termo no prontuário
    })
    .optional(),
  publicado: z.boolean().default(false),
});

const galeria = defineCollection({
  // Duas fontes, de propósito. O manifest é máquina (regerado a cada run
  // do processar.py) e o publicacao.json é humano (a clínica edita
  // conforme os termos de consentimento chegam). Mantê-los separados é o
  // que impede o script de apagar a decisão editorial sem querer.
  loader: async () => {
    const dados = (await import('./content/galeria/manifest.json')).default;
    const publicacao: Record<string, Record<string, unknown>> = (
      await import('./content/galeria/publicacao.json')
    ).default as never;

    return dados.itens.map((item: Record<string, unknown>) => ({
      id: item.slug as string,
      ...item,
      ...(publicacao[item.slug as string] ?? {}),
    }));
  },
  schema: galeriaSchema,
});

export const collections = { procedimentos, galeria };
