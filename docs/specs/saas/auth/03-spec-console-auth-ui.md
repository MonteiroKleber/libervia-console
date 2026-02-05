# 03 — Spec (Console): UI Auth + Sessão canônica (Next)

## Objetivo
Ter fluxo de login/registro real e proteger rotas do app.

## Requisitos de segurança
- JWT guardado em **cookie httpOnly**.
- Nunca usar localStorage para tokens.
- UI não deve receber segredos do Engine.

## Rotas (UI)
- `/login`
- `/register`
- `/logout`

## BFF (rotas Next)
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Middleware
- Bloquear `src/app/(app)/*` se não houver sessão.
- Se não logado: redirect `/login`.

## DoD
- `http://localhost:3002` → redireciona para `/login` (quando auto-login dev estiver desligado).
- Login → `/dashboard`.
- Logout → `/login`.
