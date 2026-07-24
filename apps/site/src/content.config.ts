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
    ]), // enum aberto a crescer — cada novo procedimento pode reusar categoria existente
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

export const collections = { procedimentos };
