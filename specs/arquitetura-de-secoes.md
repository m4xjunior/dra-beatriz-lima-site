# Arquitetura de seções — o que falta no site

Auditoria de 05/08/2026 sobre `apps/web` (o Astro em `apps/site` já foi
apagado). Base: `ui-ux-pro-max`, domínios `landing`, `product` e `ux`.

## O diagnóstico

A home hoje é `page.jsx`: três seções de procedimento com scroll-scrub e
a régua de instalação. Não existe nav, hero, rodapé, prova, contato nem
CTA. O scroll está resolvido; **o site não existe ainda**.

## O padrão que se aplica

A skill devolve dois padrões, e ela é os dois ao mesmo tempo:

| Tipo de produto | Padrão de landing |
|---|---|
| Medical Clinic | Trust & Authority + Conversion |
| Beauty/Spa/Wellness Service | Hero-Centric + Social Proof |

A diferença entre eles não é cosmética e decide a ordem das dobras:

- No **médico**, a credencial vem **antes** do serviço. Ninguém lê a
  lista de procedimentos de alguém que ainda não sabe se é habilitado.
- No **beauty**, a prova social vem **antes** do CTA. A decisão é
  emocional e a última coisa antes de agendar tem que ser outra pessoa
  dizendo que deu certo.

Ordem abaixo respeita as duas: credencial cedo, prova social imediatamente
antes de cada CTA.

---

## O que falta, em ordem

Legenda: **[novo]** não existe · **[existe]** já implementado

### 0. Nav — [novo]

Fixa, no máximo 5 itens (regra `bottom-nav-limit`, e vale para topo).
Procedimentos · Resultados · Sobre · Contato + botão de agendar.

O botão de agendar é o único elemento em cor de ação da barra. Se dois
itens disputam a ênfase, nenhum tem.

Cuidado medido pela skill (`Sticky Navigation`, severidade média): a nav
fixa não pode cobrir o começo da primeira seção. Com o scrub em tela
cheia isso é fácil de errar — o palco ocupa a viewport inteira e a nav
come o topo do rosto.

### 1. Hero — [novo]

Quem é, onde atende, o que faz, e um CTA. Hoje o usuário cai direto num
rosto girando sem saber de quem é o site.

Precisa responder em 3 segundos: **nome + "biomédica esteta" + Goiânia**.
Negócio local sem cidade acima da dobra perde a busca e perde a pessoa.

### 2. Credencial — [novo]

O bloco de autoridade do padrão médico. CRBM com número, formação,
tempo de atuação, especializações.

Vem **antes** dos procedimentos, não no rodapé. É o que autoriza tudo
que vem depois a ser lido.

### 3. Procedimentos — [existe]

`SecaoProcedimento` com o scrub. Hoje são 3; a lista real da Dra. tem 8:
limpeza de pele, peelings, toxina botulínica, bioestimulador de colágeno,
perfiloplastia, preenchimentos full face, mesoterapia capilar,
harmonização glúteo.

Oito seções de scrub em tela cheia é uma home longa demais. Sugestão:
3 com o tratamento completo na home, as outras 5 em cartão, e todas com
página própria.

### 4. Resultados — [existe]

`components/galeria/`. Já portada.

### 5. Depoimentos — [novo]

Não é a mesma coisa que Resultados, e trocar um pelo outro é o erro
comum. Foto mostra o que mudou no rosto. Depoimento mostra como foi ser
atendida — se doeu, se foi explicado, se ela voltaria.

A segunda pergunta é a que trava o agendamento, e nenhuma foto responde.

Padrão da skill: 3 a 5 depoimentos, cada um com foto, nome e contexto.
Depoimento sem rosto e sem nome não conta como prova.

### 6. Como funciona — [novo]

Avaliação → procedimento → retorno. Três passos, o que acontece em cada
um, quanto tempo leva.

Existe para dissolver a ansiedade do desconhecido, que é o que faz a
pessoa fechar a aba em vez de mandar mensagem. É também onde a
avaliação individual (a posição clínica da marca) vira algo concreto em
vez de slogan.

### 7. Sobre a Dra. — [novo]

Rosto, história, por que biomedicina estética. Serviço prestado por uma
pessoa se compra da pessoa.

Diferente da dobra 2: lá é credencial (o que autoriza), aqui é vínculo
(por que ela e não outra).

### 8. FAQ — [novo]

Dói? Quanto dura? Posso trabalhar no dia seguinte? Quantas sessões?
Pode em gestante?

Dupla função: derruba objeção antes do contato e é a dobra que mais
rende busca orgânica, porque é escrita exatamente com as palavras que a
pessoa digita.

Marcação `FAQPage` do schema.org. Sem isso a dobra existe e o Google
não a usa.

### 9. Localização e horários — [novo]

Endereço, mapa, horário de atendimento, estacionamento, WhatsApp.

Em negócio local isto **é conversão**, não rodapé. A pessoa decidiu e a
próxima pergunta é "onde fica e dá pra ir sábado".

### 10. CTA de agendamento — [novo]

Repetido: depois dos procedimentos, depois dos depoimentos e no fim.
Um CTA só, no topo, perde quem decidiu no meio da página.

### 11. Rodapé — [novo]

Razão social, CNPJ, CRBM, endereço, redes, política de privacidade,
o `<Disclaimer>` regulatório.

### Fora da lista de dobras

- **WhatsApp flutuante.** É como clínica converte no Brasil. Alvo mínimo
  de 44×44 px (regra crítica de toque da skill) e não pode cobrir o CTA
  do rodapé no celular.
- **Página de privacidade.** LGPD. Qualquer formulário sem ela é
  exposição, não detalhe.
- **`/procedimentos/[slug]`.** Existiam no Astro e sumiram com ele. São
  as páginas que ranqueiam, uma por procedimento, com indicações e
  contraindicações.

---

## Ordem final da home

```
Nav
 1. Hero                    quem, onde, o quê
 2. Credencial              autoriza o resto            ← padrão médico
 3. Procedimentos           scrub (3 na home)
 4. Resultados              antes/depois
 5. Depoimentos             prova social                ← padrão beauty
 6. CTA agendamento
 7. Como funciona           dissolve a ansiedade
 8. Sobre a Dra.            vínculo
 9. FAQ                     objeção + busca
10. Localização             conversão local
11. CTA agendamento
Rodapé
WhatsApp flutuante
```

## Checklist de entrega (da skill)

- [ ] Sem emoji como ícone. SVG (Heroicons ou Lucide)
- [ ] `cursor: pointer` em tudo que é clicável
- [ ] Transição de hover entre 150 e 300 ms
- [ ] Contraste de texto mínimo 4.5:1
- [ ] Foco visível no teclado
- [ ] `prefers-reduced-motion` respeitado — já é regra do design system
- [ ] Testado em 375, 768, 1024 e 1440 px
- [ ] Hierarquia de heading sequencial, sem pular nível
- [ ] Nav fixa não cobre o topo da primeira seção
