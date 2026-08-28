/* Validação headless da separação completa de personalização por elemento.

   1) ADMIN: para cada elemento (nome/bio/endereco/avatar) muta a config DELE
      e prova que (a) aplica no preview, (b) os OUTROS 3 (config + DOM) ficam
      intactos.
   2) PÚBLICO: mesma prova na página pública via payloads variantes.
   3) MIGRAÇÃO: com um config 100% legado (global), prova que cada um dos 4
      elementos herdou os valores globais como ponto de partida.

   Uso: node test/independencia.mjs [--admin|--public|--migracao]
*/

import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import {
  LEGACY_CONFIG, NEW_CONFIG, ELEM_KEYS, TEST_VALUES, GLASS_OF, TEST_GLASS
} from './fixtures.mjs';

let failures = 0;
const only = process.argv[2] || '';
const log = (...a) => console.log(...a);

function ok(cond, msg) {
  log(cond ? '   ✅ ' + msg : '   ❌ ' + msg);
  if (!cond) failures++;
}

/* ================================================================
   ADMIN
   ================================================================ */
async function adminElemento(key) {
  log('\n━━━ [ADMIN] Independência do elemento: ' + key.toUpperCase() + ' ━━━');
  const { window, errors } = await boot(ADMIN_PATH, {
    supabase: supabaseStub(null),
    url: 'https://axiumlink.test/admin.html'
  });
  if (errors.length) {
    failures++;
    log('   ❌ Erros de boot:', errors.map((e) => String(e && e.message || e)).join(' | '));
    return;
  }
  window.__axEditor.init(NEW_CONFIG);
  const r = window.__espelhoIndependencia(key);
  r.checks.forEach((c) => ok(c.ok, c.label));
}

/* ================================================================
   PÚBLICO
   ================================================================ */
async function publicoElemento(key) {
  log('\n━━━ [PÚBLICO] Independência do elemento: ' + key.toUpperCase() + ' ━━━');
  const row = { config: NEW_CONFIG, slug: 'teste' };
  const { window, errors } = await boot(INDEX_PATH, {
    supabase: supabaseStub(row),
    url: 'https://axiumlink.test/?s=teste'
  });
  if (errors.length) {
    failures++;
    log('   ❌ Erros de boot:', errors.map((e) => String(e && e.message || e)).join(' | '));
    return;
  }
  const r = window.__alaPublica.espelho(NEW_CONFIG, key);
  ok(r.targetApplied, 'config do ' + key.toUpperCase() + ' aparece na página pública' + (r.deltaKeys && r.deltaKeys.length ? ' (delta: ' + r.deltaKeys.join(', ') + ')' : ''));
  r.others.forEach((o) => ok(o.ok, o.label));
}

/* ================================================================
   MIGRAÇÃO (legado global → por elemento)
   ================================================================ */
const EXPECTED_MIGRATION = {
  name: { font: 'Syne', size: 26, weight: 800, ls: 1, lh: 1.3, color: '#dc2626', align: 'right', bg: '', radius: 10, padding: [4, 14] },
  bio: { font: 'Lora', size: 15, weight: 500, ls: 0, lh: 1.6, color: '#334155', align: 'left', bg: '', radius: 10, padding: [4, 14] },
  address: { font: 'Montserrat', size: 13, weight: 700, ls: 0, lh: 1.4, color: '#ffffff', align: 'center', bg: '#0c0e16', radius: 20, padding: [8, 16] },
  avatar: {
    size: 112, shape: 'rounded', radius: 26,
    borderStyle: 'solid', borderWidth: 5, borderColor: '#ffcc00',
    shadowOn: true, shadowX: 0, shadowY: 10, shadowBlur: 28, shadowSpread: -6, shadowColor: '#000000', shadowAlpha: 45,
    glowOn: false, glowColor: '', glowIntensity: 35
  }
};

async function migracaoAdmin() {
  log('\n━━━ [ADMIN] Migração: config global legado → elementos separados ━━━');
  const { window, errors } = await boot(ADMIN_PATH, {
    supabase: supabaseStub(null),
    url: 'https://axiumlink.test/admin.html'
  });
  if (errors.length) { failures++; log('   ❌ Erros de boot:', errors.join(' | ')); return; }
  window.__axEditor.init(LEGACY_CONFIG);
  const got = window.__migracaoAdmin();
  ELEM_KEYS.forEach((k) => {
    log('   ▪ ' + k.toUpperCase() + ':');
    const exp = EXPECTED_MIGRATION[k];
    Object.keys(exp).forEach((prop) => {
      const a = JSON.stringify(got[k] && got[k][prop]);
      const b = JSON.stringify(exp[prop]);
      ok(a === b, k + '.' + prop + ' = ' + a + ' (esperado ' + b + ')');
    });
  });
}

const EXPECTED_PUBLIC_TITLE = {
  'font-family': '"Syne", system-ui, sans-serif',
  'font-size': '26px',
  'font-weight': '800',
  'letter-spacing': '1px',
  'line-height': '1.3',
  color: 'rgb(220, 38, 38)',
  'text-align': 'right'
};

async function migracaoPublica() {
  log('\n━━━ [PÚBLICO] Migração: Nome herdado do legado aplicado na página ━━━');
  const row = { config: LEGACY_CONFIG, slug: 'teste' };
  const { window, errors } = await boot(INDEX_PATH, {
    supabase: supabaseStub(row),
    url: 'https://axiumlink.test/?s=teste'
  });
  if (errors.length) { failures++; log('   ❌ Erros de boot:', errors.join(' | ')); return; }
  if (window.__alaPublica.ready) await window.__alaPublica.ready;
  const dom = window.__alaPublica.dom('#pgTitle');
  Object.keys(EXPECTED_PUBLIC_TITLE).forEach((prop) => {
    const got = dom && dom[prop];
    ok(got === EXPECTED_PUBLIC_TITLE[prop], 'pgTitle.' + prop + ' = ' + JSON.stringify(got) + ' (esperado ' + JSON.stringify(EXPECTED_PUBLIC_TITLE[prop]) + ')');
  });
}

/* ================================================================
   Main
   ================================================================ */
async function main() {
  if (only === '--migracao') {
    await migracaoAdmin();
    await migracaoPublica();
  } else if (only === '--admin') {
    for (const k of ELEM_KEYS) await adminElemento(k);
  } else if (only === '--public') {
    for (const k of ELEM_KEYS) await publicoElemento(k);
  } else {
    for (const k of ELEM_KEYS) await adminElemento(k);
    for (const k of ELEM_KEYS) await publicoElemento(k);
    await migracaoAdmin();
    await migracaoPublica();
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(failures === 0 ? '🎉 TODOS OS TESTES PASSARAM' : ('❌ FALHAS: ' + failures));
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(failures === 0 ? 0 : 1);
}

main();