# Spec 001 — Esqueleto do módulo de simulação estética (Fase 1 MVP)

> Fragmento spec-driven, per instruções do projeto "Estética Beatriz". Escopo
> deliberadamente pequeno: esqueleto plugável, não a integração real com
> provedor pago (decisão do usuário — ver "Questões em aberto").

## Objetivo

Dar ao funil público (Astro) um fluxo real de "enviar foto → pedir simulação →
receber um resultado" **sem** depender ainda de uma API paga de terceiro
(Perfect Corp/YouCam ou equivalente) — o backend Rust expõe um contrato
estável hoje, e trocar o provedor real entra depois só implementando um
trait, sem tocar o resto do sistema.

## Escopo

**Dentro:**
- Endpoint Rust/Axum para registrar um pedido de simulação (procedimento +
  referência de imagem/captura) e devolver um id.
- Endpoint de status/resultado por id (processamento assíncrono simulado).
- Trait `ProvedorSimulacao` com uma implementação `ProvedorMock` (sem custo,
  sem chamada de rede real) — o ponto de extensão documentado para o
  provedor real depois.
- Persistência em **PostgreSQL local** (banco `estetica_beatriz`, já criado
  neste Mac via Homebrew — ver "Riscos" sobre produção/VPS) via `sqlx`.
- Página Astro mínima para disparar o pedido e ver o status.

**Fora (Fase 2/3 do documento do projeto, não desta spec):**
- Integração real com Perfect Corp/YouCam ou qualquer provedor pago (o
  usuário decidiu adiar — ver "Questões em aberto").
- App nativo iOS/ARKit, scan 3D real, FLAME 2023 Open.
- ERP interno em GPUI, CFTV, pagamentos (Asaas), NFS-e.
- RIPD/TCLE formal — **este esqueleto não deve ser tratado como produção**
  enquanto a Fase 0 jurídica do documento do projeto não for concluída.

## Contratos de dados

### `POST /api/simulacoes`
Request:
```json
{ "procedimento_slug": "preenchimento-labial", "captura_id": "uuid-opcional" }
```
Response `202 Accepted`:
```json
{ "id": "uuid", "status": "processando" }
```

### `GET /api/simulacoes/:id`
Response `200`:
```json
{
  "id": "uuid",
  "status": "processando | concluido | falhou",
  "procedimento_slug": "preenchimento-labial",
  "provedor": "mock",
  "resultado_url": "string|null",
  "criado_em": "RFC3339",
  "aviso": "Ilustração / expectativa — não é uma previsão do seu resultado."
}
```

### Tabela `simulacoes` (Postgres)
```sql
CREATE TABLE simulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimento_slug TEXT NOT NULL,
  captura_id UUID,
  status TEXT NOT NULL DEFAULT 'processando',
  provedor TEXT NOT NULL DEFAULT 'mock',
  resultado_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Dependências

- `sqlx` (postgres, runtime-tokio, uuid, chrono) no `server/Cargo.toml`.
- PostgreSQL 16 local (Homebrew, já rodando) — banco `estetica_beatriz`
  criado. **Em produção real (VPS 4vCPU/8GB) isto vira Postgres gerenciado
  na própria VPS**, per o documento do projeto — não é uma decisão desta
  spec, só uma constatação de onde isso vai morar depois.
- Nenhuma dependência de rede externa nesta etapa (o mock não chama nada).

## Critérios de aceite

- [ ] `cargo build --release` limpo em `server/`.
- [ ] `POST /api/simulacoes` cria uma linha em `simulacoes` e devolve um id.
- [ ] `GET /api/simulacoes/:id` reflete uma transição de status
      (`processando` → `concluido`) após um pequeno delay simulado
      (o mock não precisa ser instantâneo — o objetivo é provar o fluxo
      assíncrono que um provedor real também teria).
- [ ] Página Astro dispara o POST, faz polling do GET, mostra o
      resultado (mesmo que seja um placeholder) com o aviso regulatório
      obrigatório sempre visível.
- [ ] Nenhum dado de imagem real é enviado a lugar nenhum fora desta
      máquina (mock roda 100% local).

## Riscos

- **Confundir protótipo com produção.** Este esqueleto não passou pela
  Fase 0 (jurídica) do documento do projeto — não deve ser exposto a
  pacientes reais como está.
- **Postgres local ≠ Postgres de produção.** Rodando na mesma máquina de
  desenvolvimento agora; a URL de conexão fica em variável de ambiente
  desde já (nunca hardcoded) para a troca ser só configuração depois.
- **Mock pode criar expectativa errada internamente** (parecer "pronto")
  quando na verdade não há nenhuma IA de verdade rodando — por isso o
  campo `provedor: "mock"` fica explícito na resposta, não escondido.

## Questões em aberto

- **Qual provedor de simulação (Perfect Corp, YouCam, outro)?** Usuário
  decidiu adiar essa escolha — ver `ProvedorSimulacao` como o ponto de
  extensão quando decidir.
- **Onde este Postgres roda em produção** (VPS própria, gerenciado)?
  Não decidido nesta spec.
