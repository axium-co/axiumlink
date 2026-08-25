# 🧪 Plano de Smoke Test — Migração Back4App → Supabase

> **Projeto Supabase:** `epshnbflnfdsrrqecjgt`
> **Escopo:** homologação da migração completa do backend (Parse SDK/Back4App → @supabase/supabase-js v2)
> **Pré-requisitos:** DDL executado (tabela `public.clients` + RLS + RPC), `js/env.js` preenchido, Auth Provider Email com *Confirm email* **OFF** (paridade Parse), query de normalização executada.
>
> **Nota técnica:** o código final usa `select` → `insert` → `update` (+ RPC opcional de merge). NÃO existe `.upsert()` — os verbos HTTP esperados são `GET`, `POST` e `PATCH`.

---

## Cenário 0 — Preparação (obrigatório antes de iniciar)

| # | Ação | Como |
|---|------|------|
| 0.1 | Isolar o ambiente | Abrir janela **anônima** (evita sessões Parse antigas e service worker em cache) |
| 0.2 | Limpar resíduos legados | Ver snippet abaixo |
| 0.3 | Configurar observabilidade | DevTools (F12) → aba Network → filtro `supabase.co` → ativar **Preserve log**; Console com filtro `Axiumlink` |

Snippet de limpeza (cole no Console do `admin.html`):

```js
Object.keys(localStorage)
  .filter(k => k.startsWith('axiumlink-preview-v1'))
  .forEach(k => localStorage.removeItem(k));
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
```

**Falhou aqui?** Mensagem de erro ao abrir a página já indica causa: ver seção *Diagnóstico geral* no fim do documento.

---

## Grupo 1 — Autenticação e criação automática do cliente

### Item 1.1 — Signup estabelece sessão imediata (paridade com Parse)

**Passo a passo:**
1. Abra `admin.html`. O console deve estar limpo de erros.
2. No overlay de autenticação, clique em **"Criar conta gratuita"**.
3. Cadastre um e-mail de teste (ex.: `qa+1@seudominio.com`) e uma senha forte.
4. Observe a aba Network na ordem exata:

| Ordem | Request | Status esperado |
|-------|---------|-----------------|
| 1 | `POST /auth/v1/signup` | `200`, corpo contém `access_token` |
| 2 | `GET /auth/v1/user` | `200` (validação server-side do JWT) |

**Comportamento esperado de sucesso:** overlay desaparece imediatamente após o signup (sem tela intermediária de "confirme seu e-mail"), painel administrativo visível.

**Validação no console:**
```js
const s = (await supabase.auth.getSession()).data.session;
s ? console.log('✅ Sessão ativa:', s.user.email,
    '| expira em', new Date(s.expires_at * 1000).toLocaleTimeString())
  : console.error('❌ Sem sessão — Confirm email voltou a ON?');
```

**Se falhar (F12):**

| Sintoma | Diagnóstico | Correção |
|---------|-------------|----------|
| `POST /auth/v1/signup` → `400` "Signups not allowed" | Registro de usuários desabilitado | Authentication → Sign In / Providers → habilitar Email signup |
| `POST /auth/v1/signup` → `422` "already registered" | E-mail já existe | Usar Login em vez de Signup, ou outro e-mail (`qa+2@...`) |
| Sessão nula no snippet | *Confirm email* está ON | Authentication → Providers → Email → desativar confirmação (homologação) |
| Sem request nenhum na rede | `env.js` com placeholder / adblock | Ver erro explícito do guarda no console; corrigir `js/env.js` |

---

### Item 1.2 — Cliente auto-criado com slug padrão `axium-xxx`

**Passo a passo:**
1. Logo após o signup do item 1.1, observe a rede:

| Ordem | Request | Status esperado |
|-------|---------|-----------------|
| 1 | `GET /rest/v1/clients?...&user_id=eq.<uuid>` | `200` corpo `[]` (não existe cliente ainda) |
| 2 | `POST /rest/v1/clients` | `201 Created`, resposta contém `slug: "axium-..."` e `config: {}` |

2. Confirme que o campo **slug** do painel foi populado automaticamente.

**Comportamento esperado de sucesso:** exatamente **um** registro criado, slug casando com `/^axium-[a-z0-9]+$/`.

**Validação no console:**
```js
const u = (await supabase.auth.getUser()).data.user;
const { data: cli, error } = await supabase
  .from('clients').select('id, slug, config, created_at').eq('user_id', u.id).maybeSingle();
if (error) console.error('❌ Query falhou:', error);
else console.log(/^axium-[a-z0-9]+$/.test(cli.slug)
  ? '✅ Slug no padrão:' : '⚠️ Slug FORA do padrão:', cli.slug,
  '| config inicial:', JSON.stringify(cli.config));
```

**Se falhar (F12):**

| Sintoma | Diagnóstico | Correção |
|---------|-------------|----------|
| `GET` → `403` (code `42501`) | Policy RLS ausente ou errada | Reexecutar bloco RLS do DDL no SQL Editor |
| `GET` → `404` / erro `42P01` | Tabela não existe | Executar DDL completo |
| `POST` → `403` "new row violates row-level security policy" | Policy INSERT sem `with check (user_id = auth.uid())` | Reexecutar DDL |
| Slug fora do padrão mas válido | Registro legado migrado | Aceitável — só novos registros usam `axium-*` |

---

### Item 1.3 — Reload mantém a sessão (login automático)

**Passo a passo:**
1. Pressione **F5** no `admin.html`.
2. Observe a rede: `GET /auth/v1/user` → `200` (e possivelmente `POST /auth/v1/token?grant_type=refresh_token` → `200`).

**Comportamento esperado de sucesso:** login automático **sem** overlay de auth; slug recarregado no campo; console sem `[Axiumlink] Sessão expirada`.

**Se falhar (F12):**

| Sintoma | Diagnóstico | Correção |
|---------|-------------|----------|
| Overlay reaparece + `POST /token` → `400` "Invalid Refresh Token" | Refresh token corrompido/expirado | Limpar localStorage (`sb-<ref>-auth-token`) e logar novamente; se recorrente, checar clock do dispositivo |
| `[Axiumlink] Supabase inacessível` no console | Rede/CORS | Ver Diagnóstico geral (fim do documento) |

---

## Grupo 2 — Persistência do `config` (regressão do bug original PUT-replace)

> **Contexto:** no Parse, salvar sem fetch prévio gerava PUT que apagava `owner`/`slug`. Aqui o PATCH deve tocar **somente** na coluna `config`.

### Item 2.1 — Autosave envia PATCH 204 com payload só de `config`

**Passo a passo:**
1. No painel, altere a **cor global dos botões** para um hex memorável (ex.: `#ff0055`).
2. Aguarde ~2s (debounce do autosave).
3. Inspecione na rede:

| Verificação | Esperado |
|-------------|----------|
| Método HTTP | **PATCH** (nunca PUT) |
| URL | `/rest/v1/clients?id=eq.<id>&user_id=eq.<uuid>` |
| Status | **`204 No Content`** |
| Request Payload | Objeto cuja **única chave é `config`** — zero `slug`, zero `user_id` |

**Comportamento esperado de sucesso:** indicador do topo muda para **"Salvo na nuvem"**; botão salvar também loga payload completo no console (`===== Axiumlink | Dados do cliente =====`).

**Se falhar (F12):**

| Sintoma | Diagnóstico | Correção |
|---------|-------------|----------|
| `PATCH` → `403` | Sessão expirou entre load e save | Fazer logout/login; investigar refresh token |
| Payload contém `slug`/`user_id` | Regressão no código | Interromper testes e reportar |
| Status fica "Sem conexão com a nuvem" | `_checkSupabaseConnection` retornou false | Ver Diagnóstico geral |

---

### Item 2.2 — Roundtrip: banco reflete fielmente o que foi salvo

**Passo a passo:** execute no console e confira o resultado:

```js
const u = (await supabase.auth.getUser()).data.user;
const { data } = await supabase.from('clients')
  .select('config, updated_at').eq('user_id', u.id).single();
console.log('updated_at:', data.updated_at);
console.log(JSON.stringify(data.config, null, 2)); /* Ctrl+F pelo hex salvo (#ff0055) */
```

**Comportamento esperado de sucesso:** hex alterado presente no JSON retornado; `updated_at` ≈ horário do save (trigger `moddatetime` funcionando).

**Se falhar (F12):** valor antigo no banco + `updated_at` velho ⇒ autosave silenciosamente falhando ⇒ procurar por `Supabase save error` no console e seguir tabela do item 2.1.

---

### Item 2.3 — RPC `mergeClientConfig` preserva chaves vizinhas

**Passo a passo:**
```js
/* Injeta chave de sondagem SEM tocar no resto */
await SupaApp.mergeClientConfig({ _qa_probe: Date.now() });

const chk = await supabase.from('clients').select('config')
  .eq('user_id', (await supabase.auth.getUser()).data.user.id).single();

console.log(chk.data.config._qa_probe ? '✅ RPC mesclou' : '❌ RPC falhou',
  '| hex ainda lá?', JSON.stringify(chk.data.config).includes('#ff0055'));
```

**Comportamento esperado de sucesso:** ambas as marcações ✅ — merge adicionou `_qa_probe` **e** preservou as demais chaves (prova do `jsonb || jsonb` atômico).

**Limpeza pós-teste:** a chave `_qa_probe` é inofensiva ao renderer; opcionalmente remova via Dashboard (Table Editor → clients → editar config).

**Se falhar (F12):**

| Sintoma | Diagnóstico | Correção |
|---------|-------------|----------|
| Erro `schema cache` / `Could not find function` | RPC não criada | Reexecutar bloco `update_client_config` do DDL |
| Chaves vizinhas perdidas | Regressão grave na função SQL | Conferir se a função usa `config \|\| p_patch` (merge) e não substituição |

---

### Item 2.4 — Integridade: mutação de `user_id` deve ser BLOQUEADA

**Passo a passo:** teste negativo — execute e espere o **erro**:

```js
const cliId = (await supabase.from('clients').select('id').limit(1)).data[0].id;
const { error } = await supabase.from('clients')
  .update({ user_id: '00000000-0000-0000-0000-000000000000' })
  .eq('id', cliId);
error ? console.log('✅ Proteção ativa:', error.message)
      : console.error('🚨 FALHA GRAVE: user_id foi alterado!');
```

**Comportamento esperado de sucesso:** erro bloqueando a operação (trigger `user_id é imutável` e/ou violação de RLS).

**Se falhar (F12):** 🚨 se o UPDATE passar sem erro, há furo crítico de segurança — reexecutar trigger `protect_clients_user_id` + policies RLS do DDL **imediatamente** e re-testar.

---

## Grupo 3 — Página pública `index.html?s=<slug>`

> **Pipeline esperado:** `env.js` → `supabase-init.js` (createClient) → `readConfig()` faz `GET /rest/v1/clients?select=config&slug=eq.<slug>` **sem JWT (anon)** → `applyConfig()` renderiza → polling de 30s + BroadcastChannel ficam ativos.

### Item 3.1 — Leitura anônima por slug funciona

**Passo a passo:**
1. No painel, clique em **"Ver Página"** (URL com `?s=` correto).
2. Abra a mesma URL numa **janela anônima separada** (valida a policy anon).
3. Na rede da página pública: `GET /rest/v1/clients?select=config&slug=eq...` → `200` com a linha.

**Validação no console da página pública:**
```js
const slug = new URLSearchParams(location.search).get('s');
const { data, error } = await supabase.from('clients')
  .select('slug, config').eq('slug', slug).maybeSingle();
error ? console.error('❌', error)
  : data ? console.log('✅ Anon lê:', data.slug, '| chaves do config:',
      Object.keys(data.config))
  : console.warn('⚠️ slug não encontrado:', slug);
```

**Comportamento esperado de sucesso:** página renderiza nome/bio/botões do config; probe retorna ✅ nas duas janelas.

**Se falhar (F12):**

| Sintoma | Diagnóstico | Correção |
|---------|-------------|----------|
| Console: `Nenhum Client com slug "..."` | Slug errado na URL ou registro inexistente | Copiar slug exato do painel |
| `GET` → `401`/`403` para anon | Policy de leitura pública ausente | Reexecutar policy "Leitura publica (paginas por slug)" |
| Página renderiza defaults (config.js) | Fallback local mascarando falha da nuvem | Rodar limpeza do Cenário 0 + verificar rede |
| Config chega vazio `{}` | String legada não normalizada | Executar DO block de normalização |

---

### Item 3.2 — Edição reflete ao vivo (Broadcast 2s / Polling 30s)

**Passo a passo:**
1. Deixe a página pública aberta **ao lado** do admin (mesmo browser).
2. Abra a mesma URL pública numa **janela anônima** também.
3. No admin, mude outra cor e aguarde.

**Comportamento esperado de sucesso:**

| Janela | Canal | Latência esperada |
|--------|-------|-------------------|
| Mesma browser | BroadcastChannel | ≤ ~2s |
| Anônima (sem canal compartilhado) | Polling `readConfig()` | ≤ 30s |

**Se falhar (F12):**

| Sintoma | Diagnóstico | Correção |
|---------|-------------|----------|
| Nem em 30s atualiza | Autosave falhando (ver 2.1) ou polling morto | Checar erros `[Axiumlink]` no console do admin |
| Atualiza no anônimo mas não na mesma browser | BroadcastChannel bloqueado (raro) | Cosmético — polling cobre; seguir |

---

## ✅ Matriz de aceite final

| # | Verificação | Critério objetivo | Status |
|---|-------------|-------------------|--------|
| 1.1 | Signup → sessão imediata | `POST /auth/v1/signup` = 200 + token; sem overlay pós-cadastro | ☐ |
| 1.2 | Cliente auto-criado | `POST /rest/v1/clients` = 201; slug casa `/^axium-[a-z0-9]+$/`; 1 registro apenas | ☐ |
| 1.3 | Reload mantém login | F5 → sem overlay; `GET /auth/v1/user` = 200 | ☐ |
| 2.1 | Autosave seguro | `PATCH` = 204; payload somente `{ config }` | ☐ |
| 2.2 | Roundtrip fiel | Hex presente no SELECT subsequente; `updated_at` fresco | ☐ |
| 2.3 | Merge parcial via RPC | `_qa_probe` injetada sem perder chaves vizinhas | ☐ |
| 2.4 | `user_id` imutável | UPDATE malicioso retorna erro | ☐ |
| 3.1 | Leitura anônima por slug | Probe ✅ em janela normal E anônima | ☐ |
| 3.2 | Sync ao vivo | 2s mesmo browser / ≤30s anônimo | ☐ |

**Critério de liberação:** 9/9 itens aprovados = migração homologada. Qualquer reprova nos itens 2.4 ou 3.1 = bloqueante de segurança, não prosseguir.

---

## 🔧 Diagnóstico geral (vale para todos os itens)

| Sintoma transversal | Causa provável | Correção |
|---------------------|----------------|----------|
| `Failed to fetch` em toda chamada | CORS/adblock/offline | Desativar extensões, testar rede limpa |
| Console: "SUPABASE_URL inválida ou placeholder" | `js/env.js` não preenchido | Project Settings → API → copiar Project URL + anon key |
| Dados antigos aparecem após correções | Service worker/localStorage em cache | Limpeza do Cenário 0 + hard reload (Ctrl+Shift+R) |
| Erros `42P01` / `42501` | DDL incompleto (tabela/policies) | Reexecutar DDL completo no SQL Editor |
| `JWT expired` intermitente | Clock do dispositivo dessincronizado | Sincronizar relógio do SO |

---

*Documento gerado durante a homologação da migração Back4App → Supabase. Manter versionado junto ao código; atualizar sempre que o schema (`public.clients`) ou os fluxos de auth mudarem.*
