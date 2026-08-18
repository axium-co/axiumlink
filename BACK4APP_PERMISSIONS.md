# BACK4APP — Permissões Esperadas (Class-Level Permissions)

> Este arquivo documenta as permissões que DEVEM estar configuradas
> no dashboard do Back4App para o Axiumlink funcionar corretamente.

---

## Classe: `Client`

### Class-Level Permissions (CLP)

| Ação | Permitido | Quem |
|------|-----------|------|
| **Find** | ✅ Public | Qualquer pessoa (necessário para `index.html` buscar por slug) |
| **Get** | ✅ Public | Qualquer pessoa |
| **Create** | ✅ Users | Usuários autenticados (novo client no signup) |
| **Update** | ✅ Users | Usuários autenticados (salvar config) |
| **Delete** | ❌ Ninguém | Nenhum usuário pode deletar |
| **Add Field** | ❌ Ninguém | Impedir criação de campos novos via API |

### Row-Level Permissions (RLP)

| Regra | Campo | Descrição |
|-------|-------|-----------|
| `owner == pointerToCurrentUser` | `owner` | Cada usuário só pode **ler e escrever** no seu próprio `Client` |
| `owner exists` | `owner` | Todos os registros devem ter um `owner` |

### ACL por Registro (programático)

O código define automaticamente a ACL de cada registro `Client` ao salvar:

```js
const acl = new Parse.ACL();
acl.setPublicReadAccess(true);    // Página pública pode ler (por slug)
acl.setPublicWriteAccess(false);  // Ninguém escreve sem autenticação
acl.setReadAccess(Parse.User.current(), true);   // Dono pode ler
acl.setWriteAccess(Parse.User.current(), true);  // Dono pode escrever
client.setACL(acl);
```

- **Leitura pública** é necessária para que `index.html` busque o `Client` pelo slug na URL
- **Escrita é restrita** ao dono do registro (autenticado)

### Campos da Classe

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| `owner` | Pointer → `_User` | ✅ | Referência ao dono do registro |
| `slug` | String | ✅ | Identificador único na URL |
| `config` | Object/JSON | ❌ | Payload de configuração do cliente |

### Índices Recomendados

- **Campo `slug`**: Criar índice único para buscas rápidas na página pública
  - No dashboard: Database > Class: Client > + Add Column/Index
  - Tipo: **Unique Index** no campo `slug`

---

## Classe: `_User` (built-in)

Configurações padrão do Parse. Não requer alterações.

| Configuração | Valor Recomendado |
|--------------|-------------------|
| Require Email | ✅ Sim |
| Verify Email | ❌ Não (simplifica fluxo) |
| Allow Login com Username | ❌ Não (usar email) |

---

## Como Verificar no Dashboard

1. Acesse [Back4App Dashboard](https://dashboard.back4app.com)
2. Vá em **Database** > **Browser**
3. Selecione a classe `Client`
4. Clique em **+ Permissions** (ícone de cadeado)
5. Verifique as **Class Level Permissions**
6. Clique em **Row Level Permissions** e configure as regras acima

---

## Checklist de Segurança

- [ ] CLP de Find/Get está público (index.html precisa ler por slug)
- [ ] CLP de Create/Update restrita a usuários autenticados
- [ ] CLP de Delete desabilitada
- [ ] RLP configurada para `owner == currentUser`
- [ ] Índice único criado no campo `slug`
- [ ] Verificar se não há campos expostos desnecessariamente
