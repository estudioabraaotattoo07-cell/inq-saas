# MAPA OFICIAL DO ECOSSISTEMA INK SYSTEM

## Documento 04

**Versão 1.0**

---

## 1. O ECOSSISTEMA

O ecossistema Ink System é composto por três projetos independentes, com responsabilidades distintas.

Nenhum projeto deve assumir responsabilidades pertencentes a outro.

## 2. LABORATÓRIO P&D

Projeto: `inq-saas`

Responsabilidade:

É a Mãe. É a fonte única de desenvolvimento. Tudo nasce aqui. Tudo é corrigido aqui. Tudo é auditado aqui. Tudo é aprovado aqui.

Nunca recebe clientes comerciais.

Nunca representa um Release.

É um ambiente de desenvolvimento permanente.

## 3. INK SYSTEM 1.0

Responsabilidade:

É o produto. Não é laboratório. Não é ambiente de desenvolvimento. Não recebe implementação. Recebe apenas Releases.

Seu objetivo é entregar estabilidade.

Seu código sempre nasce da Mãe. Nunca evolui sozinho.

Quanto a licenciamento: **ele não administra licenças, apenas consome as informações de licenciamento para decidir o comportamento do sistema em tempo real** — licença ativa, assinatura vencida, período de tolerância, recursos habilitados, limites de uso, quantidade de artistas, armazenamento, créditos, e qualquer outro entitlement definido pela Mãe. Em resumo: o Ink System 1.0 obedece às regras, não as define nem as gerencia.

## 4. INK-SYSTEM-PLATAFORM

Responsabilidade exclusiva: Comercial.

Landing Pages. Marketing. CRM Comercial (leads interessados em comprar o Ink System). Checkout. Assinatura. Cobrança recorrente. Recuperação de pagamento. Provisionamento do novo estúdio. Criação e gestão da licença. Renovação. Cancelamento. Área administrativa comercial.

O **CRM Comercial** deste projeto não possui qualquer relação com o CRM utilizado pelos estúdios (Pipeline/Clientes/Agenda/Financeiro do Ink System 1.0) — é um CRM à parte, para gerenciar os leads que ainda não são clientes, ainda não confundir os dois.

Após o provisionamento, o cliente deixa o ambiente comercial e passa a utilizar exclusivamente o Ink System 1.0.

Nenhuma funcionalidade operacional do CRM (dos estúdios) pertence a este projeto.

## 5. O BANCO DE DADOS

Existe um único banco.

Todos os projetos utilizam o mesmo banco.

O isolamento acontece por: `user_id`, RLS, Auth, Proxy.

Nunca por bancos separados.

## 6. O FLUXO OFICIAL

```
Problema
↓
Discussão
↓
Arquitetura
↓
Mãe
↓
Auditoria
↓
Aprovação
↓
Fotografia
↓
Ink System 1.0
↓
Uso diário
↓
Melhoria encontrada
↓
Retorna para a Mãe
```

Esse desenho resume praticamente toda a filosofia do projeto.

## 7. O FLUXO COMERCIAL

```
Visitante
↓
ink-system-plataform
↓
Checkout
↓
Pagamento
↓
Provisionamento
↓
Criação da licença
↓
Onboarding
↓
Ink System 1.0
↓
Uso diário
```

Perceba uma coisa interessante: o Laboratório P&D nem aparece nesse fluxo. Porque ele não participa da operação comercial. Isso reforça a separação de responsabilidades.

## 8. O QUE PERTENCE A CADA PROJETO

| Funcionalidade | Mãe | Ink 1.0 | Comercial |
|---|---|---|---|
| Pipeline | ✅ | ✅ | ❌ |
| Clientes | ✅ | ✅ | ❌ |
| Agenda | ✅ | ✅ | ❌ |
| Financeiro | ✅ | ✅ | ❌ |
| Meu Site | ✅ | ✅ | ❌ |
| Aura Interna | ✅ | ❌ | ❌ |
| Campanhas | ✅ | ❌ | ❌ |
| Disparos | ✅ | ❌ | ❌ |
| Debug | ✅ | ❌ | ❌ |
| Landing Page | ❌ | ❌ | ✅ |
| Checkout | ❌ | ❌ | ✅ |
| Provisionamento | ❌ | ❌ | ✅ |
| Licenciamento | ✅ | ✅ | ✅ |

> Nota (2026-08-06, resolvida): "Licenciamento" aparece nos três projetos, cada um com responsabilidade diferente, não a mesma função replicada três vezes:
> - **Mãe** — origem da arquitetura: desenvolve, evolui e valida toda a lógica de licenciamento, permissões e entitlements. Nenhuma lógica de licenciamento nasce fora dela.
> - **Ink System 1.0** — leitura e aplicação dos entitlements em tempo real (licença ativa, assinatura vencida, período de tolerância, recursos habilitados, limites de uso, artistas, armazenamento, créditos). Não administra, só obedece.
> - **ink-system-plataform** — gestão comercial: criação/renovação/cancelamento da licença, assinatura, cobrança recorrente, recuperação de pagamento, e o CRM Comercial dos leads compradores (sem relação com o CRM dos estúdios).

## 9. REGRAS ABSOLUTAS

Nunca implementar no Ink System 1.0.

Nunca implementar no Comercial.

Nunca corrigir um bug fora da Mãe.

Nunca criar funcionalidades paralelas.

Nunca duplicar evolução.

Nunca alterar arquitetura durante implementação.

## 10. CICLO PERMANENTE

```
Mãe
↓
Release
↓
Produto
↓
Uso
↓
Melhoria
↓
Mãe
```

Esse ciclo nunca termina. É assim que o Ink System evoluirá para sempre.
