# Console API — Contrato Filesystem (sem burlar governança)

Objetivo
- Chat/UI falam com o Engine via rotas IDL/job.
- Console API **não escreve outbox diretamente** (outbox é do Engine, pós-gates/approval).

Safe (list/scan/suggest)
1) Console → Engine `job.request`
2) Engine auto-enqueue (se permitido) → outbox
3) Runtime executa → report
4) Console consulta `job.get` e exibe resultado

Destrutivo (delete/move/rename)
1) Console → Engine `job.request` (retorna `job_id` + `approval_id`)
2) Console → Engine decide approval
3) Engine `job.enqueue` → outbox
4) Runtime executa → report
5) UI exibe status final + audit trail

