/* Fonte geral da página (Tipografia > "Fonte geral") × fonte individual.

   Requisito (decidido): a fonte geral só sobrescreve os elementos que estão
   em "Mesma da página" (fonte individual vazia). Elementos com fonte
   individual (typoName/typoBio/typoBtn/blockFont) mantêm a própria fonte.

   REGRESSÃO (bug): config com nome em "Mesma da página" (typoName.font='')
   mas com o campo legado `titleFont` ainda gravado fixava o título na fonte
   antiga no público (fallback `else if (st.titleFont)`). Correção: esse
   fallback foi movido para a construção de pElemName — valendo APENAS quando
   NÃO há sub-bloco typoName (config 100% legado). Assim, com "Mesma da
   página" escolhido, o título herda a fonte geral mesmo com titleFont no
   config.
*/

import { boot, supabaseStub, INDEX_PATH, ADMIN_PATH } from './harness.mjs';

const fontOf = (el) => (el && el.style.fontFamily) || '(herda)';

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  };

  const base = (custom) => {
    const c = {
      profile: { displayName: 'Maria', bio: 'Designer', address: 'SP', verified: false },
      links: [{ id: 's1', title: 'Site', url: 'https://site.com' }],
      style: {
        theme: 'dark', font: 'Poppins', letterSpacing: 0, lineHeight: 1.4,
        typoName: { font: '', size: 20, weight: 700, ls: 0, lh: 1.4 },
        typoBio: { font: '', size: 14, weight: 400, ls: 0, lh: 1.4 },
        typoBtn: { font: '', size: 15, weight: 600, ls: 0, lh: 1.4 },
        address: { blockFont: '', blockRadius: 999 }
      }
    };
    if (custom) custom(c);
    return c;
  };

  const pub = (c) => {
    const { window, errors } = boot(INDEX_PATH, {
      supabase: supabaseStub({ config: c, slug: 'teste' }),
      url: 'https://axiumlink.test/?s=teste'
    });
    if (errors.length) { check('boot público sem erros', false, errors.join(' | ')); return null; }
    window.__alaPublica.aplicar(c);
    return window;
  };
  const id = (w, s) => w.document.getElementById(s);
  const el = (w, s) => w.document.querySelector(s);

  console.log('\n━━━ FONTE GERAL — herança dos elementos em "Mesma da página" ━━━');

  /* (1) Tudo em "Mesma da página": NOME/BIO/BOTÃO herdam a fonte geral, e
     trocar a geral muda todos. */
  {
    const cfg = base();
    const w = pub(cfg);
    if (!w) return fail;
    const title = fontOf(id(w, 'pgTitle'));
    const bio = fontOf(id(w, 'pgSubtitle'));
    const btn = el(w, '.featured__body, #pgLinks a[href], a.pg-link') && fontOf(el(w, '.featured__body, #pgLinks a[href], a.pg-link'));
    const addr = fontOf(id(w, 'pgAddress'));
    check('nome herda (removeProperty → fonte do body)', title === '(herda)', title);
    check('bio herda', bio === '(herda)', bio);
    check('endereço herda', addr === '(herda)' || addr === 'inherit', addr);
    check('botão herda', btn === '(herda)' || btn === 'inherit', btn);
  }

  /* (2) REGRESSÃO: titleFont legado presente + typoName "Mesma da página"
     → o título DEVE herdar (não fica preso na fonte antiga). */
  {
    const cfg = base((c) => { c.style.titleFont = 'Syne'; });
    const w = pub(cfg);
    if (!w) return fail;
    const title = fontOf(id(w, 'pgTitle'));
    check('REGRESSÃO: nome com "Mesma da página" herda mesmo com titleFont legado no config', title === '(herda)', title);
  }

  /* (3) Fonte individual escolhida (typoName.font = 'Syne') NÃO é
     sobrescrita pela geral — "Só sobrescreve Mesma da página". */
  {
    const cfg = base((c) => { c.style.typoName.font = 'Syne'; });
    const w = pub(cfg);
    if (!w) return fail;
    const title = fontOf(id(w, 'pgTitle'));
    check('nome com fonte individual (Syne) mantém a própria fonte (não sobrescreve)', title.indexOf('Syne') >= 0, title);
  }

  /* (4) Config 100% legado (sem sub-bloco typoName): título usa titleFont
     como fallback (aparência antiga preservada). */
  {
    const cfg = {
      profile: { displayName: 'Maria', bio: 'Designer', address: 'SP', verified: false },
      links: [{ id: 's1', title: 'Site', url: 'https://site.com' }],
      style: { theme: 'dark', font: 'Poppins', titleFont: 'Syne', letterSpacing: 0, lineHeight: 1.4 }
    };
    const w = pub(cfg);
    if (!w) return fail;
    const title = fontOf(id(w, 'pgTitle'));
    check('config legado (sem typoName): título usa titleFont Syne', title.indexOf('Syne') >= 0, title);
  }

  /* (5) ADMIN preview espelha: pvName em "Mesma da página" herda, e com
     titleFont legado a fonte geral continua valendo para o nome. */
  {
    const cfg = base((c) => { c.style.titleFont = 'Syne'; });
    const { window: wA, errors } = boot(ADMIN_PATH, {
      supabase: supabaseStub(null),
      url: 'https://axiumlink.test/admin.html'
    });
    if (errors.length) { check('boot admin sem erros', false, errors.join(' | ')); return fail; }
    wA.__axEditor.init(cfg);
    const pvName = fontOf(id(wA, 'pvName'));
    check('admin: pvName "Mesma da página" herda mesmo com titleFont legado', pvName === '(herda)' || pvName === 'inherit' || pvName === '', pvName);

    const cfgF = base((c) => { c.style.typoName = { font: 'Lora', size: 20, weight: 700, ls: 0, lh: 1.4 }; });
    wA.__axEditor.init(cfgF);
    const pvNameF = fontOf(id(wA, 'pvName'));
    check('admin: pvName com fonte individual (Lora) aplica no preview', pvNameF.indexOf('Lora') >= 0, pvNameF);
  }

  console.log(`\n  ✅ FONTE GERAL Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}