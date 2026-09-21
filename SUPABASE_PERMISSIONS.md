# SUPABASE — Permissões e Schema Esperados

> Este arquivo documenta o que DEVE estar configurado no projeto Supabase
> para o Axiumlink funcionar corretamente. Substituiu o antigo
> `BACK4APP_PERMISSIONS.md` (a plataforma está 100% no Supabase).

---

## Projeto

- **Referência:** `epshnbflnfdsrrqecjgt` (ver `js/env.js`)
- **SDK:** `@supabase/supabase-js` v2 (UMD do CDN) — ver `js/supabase-init.js`
- **Segurança:** a anon key é pública por design; a segurança real é 100% RLS.

---

## Tabela: `public.clients`

### Colunas

| Coluna | Tipo | Obrigatório | Observação |
|--------|------|-------------|------------|
| `id` | `uuid` PK (default `gen_random_uuid()`) | ✅ | Identificador único |
| `user_id` | `uuid` → `auth.users` | ✅ | Dono do registro. **Imutável via trigger** |
| `slug` | `text` **UNIQUE** | ✅ | Identificador único na URL (`index.html?s=<slug>`) |
| `nome` | `text` | ❌ | Nome amigável para o card do dashboard |
| `config` | `jsonb` | ❌ | Payload completo do cliente (profile, links, style, design) |
| `created_at` | `timestamptz` default `now()` | — | |
| `updated_at` | `timestamptz` | — | Atualizado por trigger `moddatetime` |

### RLS — Class Level / Row Level

A página pública lê **sem JWT** (anon) por slug; o painel escreve apenas nas
linhas do usuário autenticado (`user_id = auth.uid()`).

| Ação | Permitido | Quem | Regra |
|------|-----------|------|-------|
| **SELECT** | ✅ Público (anon) | Qualquer pessoa | Necessário para `index.html` buscar por slug — policy "Leitura pública (páginas por slug)" |
| **SELECT** | ✅ Autenticado | Dono | Listar/carregar perfis no painel — `user_id = auth.uid()` |
| **INSERT** | ✅ Autenticado | Dono | Autocriação do primeiro perfil — `with check (user_id = auth.uid())` |
| **UPDATE** | ✅ Autenticado | Dono | Autosave com filtro duplo `id` + `user_id` |
| **DELETE** | ✅ Autenticado | Dono | Excluir perfil no painel — `using (user_id = auth.uid())` (duplo check `id` + `user_id` no cliente) |

### Trigger de integridade

- `protect_clients_user_id` — impede `UPDATE` que altere `user_id`
  (imutabilidade do dono).
- `moddatetime` — atualiza `updated_at` a cada `UPDATE` (usado no smoke test).

### Índice

- **Unique index em `slug`** — garante unicidade e busca rápida por slug.

---

## RPC — merge atômico do `config`

- **Nome sugerido:** `mergeClientConfig` (ou `update_client_config`).
- **Comportamento:** recebe um patch e aplica `config \|\| patch` (merge
  jsonb **atômico**) — preserva chaves vizinhas, nunca substitui o objeto
  inteiro. Usado pelo smoke test para injetar sondas sem apagar nada.

---

## Storage — bucket `avatars`

- Upload real de imagens (avatar, ícone de botão, banner/fundo).
- **Bucket público** `avatars`.
- **Caminho:** `<uid>/<tipo>-<timestamp>-<rand>.<ext>`.
- **RLS do storage:** política de insert/select casando
  `storage.foldername(name)[1] = auth.uid()` (cada usuário só sobe/lê na
  própria pasta); leitura pública dos objetos publicados.

---

## Auth (built-in `auth.users`)

| Configuração | Valor Recomendado |
|--------------|-------------------|
| Email provider | ✅ Habilitado (signup) |
| Confirm email | ❌ Desligado (paridade com o fluxo antigo — sessão imediata pós-signup) |

---

## Como Verificar no Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard).
2. **Table Editor** → `clients` → conferir colunas, unique de `slug`.
3. **Authentication → Policies** → conferir as policies RLS acima.
4. **SQL Editor** → revisar triggers (`moddatetime`, `protect_clients_user_id`)
   e a função RPC de merge.
5. **Storage** → bucket `avatars` + policies de pasta por usuário.

---

## Checklist de Segurança

- [ ] `slug` com índice único (23505 vira "slug já em uso" no painel)
- [ ] SELECT de leitura pública por slug habilitado para `anon`
- [ ] INSERT com `with check (user_id = auth.uid())`
- [ ] UPDATE/GET restritos a `user_id = auth.uid()`
- [ ] DELETE restrito a `user_id = auth.uid()`
- [ ] Trigger `protect_clients_user_id` ativo (UPDATE de `user_id` falha)
- [ ] RPC de merge aplica `config || patch` (nunca substituição)
- [ ] Storage `avatars` com pasta por usuário + leitura pública
- [ ] Confirm email desligado (sessão imediata no signup)