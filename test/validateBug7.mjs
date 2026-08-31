import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

/* ================================================================
   BUG 7: botão com imagem customizada não herda borda/fundo/sombra
   do estilo global do botão (linhas residuais cruzando a imagem).
   Testa com variantes que injetam borda (neon, ghost, glass) e com
   vidro ligado, no admin e no público.
   Exporta run() retornando o nº de falhas (para a suíte oficial).
   ================================================================ */

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  };

  function mkCfg(variant) {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.style = Object.assign({}, c.style, { btnVariant: variant });
    c.links = [
      { id: 's1', title: 'Site', url: 'https://site.com' },
      { id: 'i1', title: 'WhatsApp', url: 'https://wa.me/1', customButtonImage: 'https://cdn.axium.test/btn-wa.png' }
    ];
    return c;
  }

  for (const variant of ['solid', 'neon', 'ghost', 'glass']) {
    console.log(`\n━━━ BUG 7 admin (variante: ${variant}) ━━━`);
    const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    const d = w.document;
    w.__axEditor.init(mkCfg(variant));

    const img = d.querySelector('#previewLinksList .link-block-customimg');
    check('customimg exists', !!img);
    if (img) {
      check(`customimg border cleared (${variant})`, !img.style.border || img.style.border === 'none', String(img.style.border));
      check(`customimg boxShadow none (${variant})`, !img.style.boxShadow || img.style.boxShadow === 'none', String(img.style.boxShadow));
      check(`customimg background transparent (${variant})`, !img.style.background || img.style.background === 'transparent', String(img.style.background));
    }
    const std = d.querySelector('#previewLinksList .link-block:not(.link-block-customimg)');
    if (std && variant === 'neon') check('admin: standard keeps variant styling (color), customimg clean', !!std.style.color && std.style.color !== 'rgb(255, 255, 255)', String(std.style.color));
  }

  for (const variant of ['solid', 'neon', 'ghost', 'glass']) {
    console.log(`\n━━━ BUG 7 público (variante: ${variant}) ━━━`);
    const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
    const d = w.document;
    const c = mkCfg(variant);
    if (w.__alaPublica?.aplicar) w.__alaPublica.aplicar(c);

    const img = d.querySelector('a.featured__card--customimg');
    check('public customimg exists', !!img);
    if (img) {
      check(`customimg border cleared (${variant})`, !img.style.border || img.style.border === 'none', String(img.style.border));
      check(`customimg boxShadow none (${variant})`, !img.style.boxShadow || img.style.boxShadow === 'none', String(img.style.boxShadow));
      check(`customimg background transparent (${variant})`, !img.style.background || img.style.background === 'transparent', String(img.style.background));
      check(`customimg no gx-panel (${variant})`, !img.classList.contains('gx-panel'));
    }
  }

  console.log(`  ✅ BUG 7 Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}
