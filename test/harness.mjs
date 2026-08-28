/* Harness: carrega admin.html/index.html em jsdom sem rede.
   - Remove <script src=...> (supabase CDN, env, etc.)
   - Injeta um stub de window.supabase
   - Executa os scripts inline na ordem via window.eval
   Fluxo real reproduzido: boot de auth (admin) / readConfig (público). */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ADMIN_PATH = join(root, 'admin.html');
export const INDEX_PATH = join(root, 'index.html');

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

function sanitize(filePath) {
  return read(filePath).replace(/<script\s+[^>]*\bsrc\s*=[^>]*><\/script>/gi, '');
}

function inlineScripts(filePath) {
  const html = read(filePath);
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (!/\bsrc\s*=/.test(m[1])) out.push(m[2]);
  }
  return out;
}

/* Stub funcional de supabase: qualquer .from() devolve encadeamento que
   resolve a `row` fornecida (config do cliente sob teste). */
export function supabaseStub(row) {
  const chain = {};
  ['select', 'eq', 'neq', 'order', 'limit', 'range', 'or', 'in', 'ilike', 'gte', 'lte', 'update', 'insert', 'delete', 'upsert', 'single', 'maybeSingle']
    .forEach((m) => {
      chain[m] = (...args) => {
        if (m === 'maybeSingle') return Promise.resolve({ data: row == null ? null : row, error: null });
        if (m === 'single') return Promise.resolve({ data: row == null ? null : row, error: null });
        if (m === 'update' || m === 'insert' || m === 'upsert') return Promise.resolve({ data: null, error: null });
        return chain;
      };
    });
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }),
      signUp: async () => ({ data: { user: { id: 'u1' } }, error: null })
    },
    storage: {
      from: () => ({ upload: async () => ({ data: { path: 'x' }, error: null }) })
    },
    from: () => chain
  };
}

export function boot(filePath, { supabase, url } = {}) {
  const html = sanitize(filePath);
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: url || 'https://axiumlink.test/'
  });
  const { window } = dom;
  window.supabase = supabase || supabaseStub(null);
  const errors = [];
  for (const src of inlineScripts(filePath)) {
    try {
      window.eval(src);
    } catch (err) {
      errors.push(err);
    }
  }
  return { window, dom, errors };
}