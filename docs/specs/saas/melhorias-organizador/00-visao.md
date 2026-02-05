# 00 — Visão

## Objetivo
Transformar o Organizador (Personal Ops) em um executor local **completo** e **governado** para tarefas de filesystem, mantendo o core neutro.

## Princípios (não negociáveis)
1) **IDL é a fonte da verdade**
- alterações de contrato/rotas/permissões/approvals/SoD devem ser feitas no `source.idl`.
- artefatos gerados (`operations.json`, `rbac.json`, `approvals.json`, `sod.json`, `source.ir.json`) nunca são editados manualmente.

2) **Jobs first-class**
- operações do mundo real são **jobs** com lifecycle (`requested → enqueued → executed/failed`) e audit.

3) **Engine neutro**
- Engine não ganha regra de negócio específica (ex.: “financeiro”, “organizador”).
- O Engine aplica enforcement baseado em bundle/IDL.

4) **Nada destrutivo sem approval + SoD**
- delete/move/rename em lote exigem approval.
- quem solicita não aprova.

5) **Sem gambiarras de estado**
- não editar `engine/var` na mão.
- sempre usar APIs e gates.

## Escopo: “tudo” (em camadas)
Quando você diz “tudo”, a leitura canônica é:
- cobrir as operações mais comuns de filesystem
- suportar organização em lote com preview e rollback quando possível
- permitir rotinas seguras (scan/relatórios) sem destruição
- ter alguns utilitários locais (zip/backup/metadados)

## O que NÃO entra (por enquanto)
- conectores de SaaS externos (Google Drive, Dropbox, etc.)
- automação destrutiva autônoma (sem solicitação)
- políticas de billing/planos
