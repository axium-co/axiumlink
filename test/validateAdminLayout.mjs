/* ESTRUTURA DO LAYOUT DO ADMIN (grid de 2 colunas).

   REGRESSÃO: um `</div>` a mais no painel Perfil fechava `.admin-layout`
   antes do fim da coluna esquerda. Os 6 `section.panel.sec` e a
   `section.preview-col` passavam a ser irmãos do `.admin-layout` dentro de
   `#appShell`, então o `grid-template-columns: ... 1fr` do `.admin-layout`
   ficava com UMA coluna: o mockup de celular saía do grid e aparecia
   embaixo do editor (invisível em desktop largo). Nenhum teste cobria a
   hierarquia do DOM, por isso a suíte continuava verde.

   Este teste trava o contrato: `.admin-layout` = `aside` + `section.preview-col`,
   todos os painéis dentro do `aside`, e o HTML sem tags de fechamento em falta.
*/

import { readFileSync } from 'node:fs';
import { boot, supabaseStub, ADMIN_PATH } from './harness.mjs';

const TAG_BALANCE = [['div', /<div(?=[\s>])/g, /<\/div>/g], ['details', /<details(?=[\s>])/g, /<\/details>/g], ['section', /<section(?=[\s>])/g, /<\/section>/g], ['aside', /<aside(?=[\s>])/g, /<\/aside>/g]];

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
  };

  console.log('\n━━━ LAYOUT DO ADMIN — hierarquia do grid ━━━');

  /* (1) Balanço de tags no admin.html (fora de <script>/<style>): um delta
     != 0 significa que algum </tag> está na posição errada e vai fechar o
     elemento vizinho — exatamente a origem da regressão. */
  {
    const raw = readFileSync(ADMIN_PATH, 'utf8')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    for (const [tag, open, close] of TAG_BALANCE) {
      const a = (raw.match(open) || []).length;
      const b = (raw.match(close) || []).length;
      check(`<${tag}> balanceado no admin.html (${a} abre / ${b} fecha)`, a === b, a === b ? '' : `delta ${a - b}`);
    }
  }

  const { window, errors } = boot(ADMIN_PATH, {
    supabase: supabaseStub(null),
    url: 'https://axiumlink.test/admin.html'
  });
  if (errors.length) { check('boot admin sem erros', false, errors.join(' | ')); return fail; }
  const doc = window.document;
  const el = (s) => doc.querySelector(s);
  const els = (s) => [...doc.querySelectorAll(s)];
  const cls = (n) => (n.getAttribute('class') || '').split(/\s+/)[0] || n.tagName.toLowerCase();

  /* (2) .admin-layout tem exatamente 2 filhos: aside (esquerda) + preview (direita). */
  {
    const layout = el('.admin-layout');
    check('.admin-layout existe', !!layout);
    if (!layout) return fail;
    const kids = [...layout.children];
    check('.admin-layout tem exatamente 2 filhos de elemento', kids.length === 2, kids.map(cls).join(' + '));
    check('1º filho é <aside class="admin-content">', kids[0] && kids[0].tagName === 'ASIDE' && kids[0].classList.contains('admin-content'), kids[0] ? cls(kids[0]) : '(nenhum)');
    check('2º filho é <section class="preview-col">', kids[1] && kids[1].tagName === 'SECTION' && kids[1].classList.contains('preview-col'), kids[1] ? cls(kids[1]) : '(nenhum)');
  }

  /* (3) Os 6 painéis ficam DENTRO do aside (a coluna esquerda do grid). */
  {
    const aside = el('.admin-layout > aside.admin-content');
    const panels = els('section.panel.sec[data-section]');
    check('existem 6 painéis (section.panel.sec[data-section])', panels.length === 6, String(panels.length));
    const fora = panels.filter((p) => !aside || !aside.contains(p));
    check('todos os painéis são descendentes do aside', fora.length === 0, fora.length ? fora.map((p) => p.getAttribute('data-section')).join(', ') : '');
    const soltos = panels.filter((p) => p.parentElement !== aside);
    check('painéis são filhos diretos do aside', soltos.length === 0, soltos.length ? 'soltos: ' + soltos.length : '');
  }

  /* (4) Nenhum painel nem a coluna de preview escapou para #appShell. */
  {
    const shell = el('#appShell');
    const vazando = [...els('section.panel.sec[data-section]'), el('section.preview-col')]
      .filter(Boolean)
      .filter((n) => n.parentElement === shell);
    check('nenhum painel/coluna de preview é filho direto de #appShell', vazando.length === 0, vazando.length ? 'vazando: ' + vazando.length : '');
  }

  /* (5) O mockup de celular vive dentro de .preview-col, dentro do grid. */
  {
    const pv = el('.admin-layout > section.preview-col');
    const phone = el('.phone-mockup');
    const page = el('#pvPage');
    check('.phone-mockup está dentro de .preview-col', !!pv && !!phone && pv.contains(phone));
    check('#pvPage está dentro de .preview-col', !!pv && !!page && pv.contains(page));
  }

  /* (6) O preview renderiza de verdade depois do init (não só existe no HTML). */
  {
    window.__axEditor.init({
      profile: { displayName: 'Maria', bio: 'Designer', address: 'SP', verified: false },
      links: [{ id: 's1', title: 'Site', url: 'https://site.com' }],
      style: { theme: 'dark', font: 'Poppins', letterSpacing: 0, lineHeight: 1.4 }
    });
    const page = el('#pvPage');
    check('#pvPage preenchido após init (links espelhados)', !!page && page.querySelectorAll('a').length > 0, 'ancoras: ' + (page ? page.querySelectorAll('a').length : 0));
    check('mockup continua no preview-col após init', !!el('.preview-col .phone-mockup'));
  }

  /* (7) O grid é declarado com 2 colunas (a outra metade do contrato). */
  {
    const css = readFileSync(ADMIN_PATH, 'utf8').match(/\.admin-layout\s*\{[^}]*\}/);
    const txt = css ? css[0] : '';
    check('.admin-layout declara display:grid', /display\s*:\s*grid/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 90));
    check('.admin-layout declara 2 colunas (grid-template-columns)', /grid-template-columns\s*:\s*[^;]*\s1fr/.test(txt));
  }

  console.log(`\n  ✅ LAYOUT ADMIN Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}
