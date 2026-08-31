import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

/* ================================================================
   BUG 6: tipografia por-link do texto do botão.
   - Modal: controles de fonte/tamanho/peso/cor desabilitados quando o
     "Design do botão" é imagem customizada; ativos quando é padrão.
   - Admin preview: botão padrão respeita a tipografia por-link.
   - Público: botão padrão respeita a tipografia por-link.
   Exporta run() retornando o nº de falhas (para a suíte oficial).
   ================================================================ */

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  };

  console.log('\n━━━ BUG 6A: modal — desabilitar tipografia quando imagem ━━━');
  {
    const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    const d = w.document;
    w.__axEditor.init(NEW_CONFIG);

    const ids = ['blockTypoFont', 'blockTypoSize', 'blockTypoWeight', 'blockTextColor', 'blockTypoNotApp'];
    for (const id of ids) check(`${id} exists in modal`, !!d.getElementById(id));

    const design = d.getElementById('blockBtnDesign');
    design.value = 'imagem';
    design.dispatchEvent(new w.Event('change', { bubbles: true }));

    check('imagem: blockTypoFont disabled', d.getElementById('blockTypoFont').disabled);
    check('imagem: blockTypoSize disabled', d.getElementById('blockTypoSize').disabled);
    check('imagem: blockTypoWeight disabled', d.getElementById('blockTypoWeight').disabled);
    check('imagem: blockTextColor has is-disabled', d.getElementById('blockTextColor').classList.contains('is-disabled'));
    check('imagem: blockTypoNotApp visible', d.getElementById('blockTypoNotApp').style.display === 'block');
    check('imagem: blockImagePanel visible', d.getElementById('blockImagePanel').style.display === 'block');

    design.value = 'padrao';
    design.dispatchEvent(new w.Event('change', { bubbles: true }));

    check('padrao: blockTypoFont NOT disabled', !d.getElementById('blockTypoFont').disabled);
    check('padrao: blockTypoSize NOT disabled', !d.getElementById('blockTypoSize').disabled);
    check('padrao: blockTypoWeight NOT disabled', !d.getElementById('blockTypoWeight').disabled);
    check('padrao: blockTextColor NOT is-disabled', !d.getElementById('blockTextColor').classList.contains('is-disabled'));
    check('padrao: blockTypoNotApp hidden', d.getElementById('blockTypoNotApp').style.display === 'none');
    check('padrao: blockImagePanel hidden', d.getElementById('blockImagePanel').style.display === 'none');
  }

  console.log('\n━━━ BUG 6B: admin preview — padrão respeita tipografia por-link ━━━');
  {
    const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    const d = w.document;
    const CFG = JSON.parse(JSON.stringify(NEW_CONFIG));
    CFG.links = [
      { id: 's1', title: 'Site', url: 'https://site.com', linkFont: 'Poppins', linkFontSize: 20, linkFontWeight: 800, linkTextColor: '#ff0000' },
      { id: 'i1', title: 'WhatsApp', url: 'https://wa.me/1', customButtonImage: 'https://cdn.axium.test/btn-wa.png', linkFontSize: 24 }
    ];
    w.__axEditor.init(CFG);

    const std = d.querySelector('#previewLinksList .link-block:not(.link-block-customimg)');
    check('admin: standard button exists', !!std);
    if (std) {
      check('admin: std fontFamily= Poppins', (std.style.fontFamily || '').includes('Poppins'), std.style.fontFamily || '');
      check('admin: std fontSize= 20px', std.style.fontSize === '20px', std.style.fontSize);
      check('admin: std fontWeight= 800', std.style.fontWeight === '800', std.style.fontWeight);
      check('admin: std color= #ff0000', (std.style.color === '#ff0000' || std.style.color === 'rgb(255, 0, 0)' || std.style.color === 'rgb(255,0,0)'), std.style.color);
    }

    const img = d.querySelector('#previewLinksList .link-block-customimg');
    check('admin: customimg button exists', !!img);
    if (img) {
      check('admin: customimg shows ONLY <img> (no text node called WhatsApp)', !(img.textContent || '').includes('WhatsApp'));
      check('admin: customimg has exactly 1 img child', img.querySelectorAll('img').length === 1);
      check('admin: customimg has no .link-block-txt', !img.querySelector('.link-block-txt'));
    }
  }

  console.log('\n━━━ BUG 6C: público — padrão respeita tipografia por-link ━━━');
  {
    const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
    const d = w.document;
    const CFG = JSON.parse(JSON.stringify(NEW_CONFIG));
    CFG.links = [
      { id: 's1', title: 'Site', url: 'https://site.com', linkFont: 'Montserrat', linkFontSize: 18, linkFontWeight: 700, linkTextColor: '#00ff00' }
    ];
    if (w.__alaPublica?.aplicar) w.__alaPublica.aplicar(CFG);

    const card = d.querySelector('.pg-links-list a.featured__card:not(.featured__card--customimg)');
    check('public: standard card exists', !!card);
    if (card) {
      check('public: fontFamily= Montserrat', (card.style.fontFamily || '').includes('Montserrat'), card.style.fontFamily || '');
      check('public: fontSize= 18px', card.style.fontSize === '18px', card.style.fontSize);
      check('public: fontWeight= 700', card.style.fontWeight === '700', card.style.fontWeight);
      check('public: color= #00ff00', (card.style.color === '#00ff00' || card.style.color === 'rgb(0, 255, 0)' || card.style.color === 'rgb(0,255,0)'), card.style.color);
    }
  }

  console.log(`  ✅ BUG 6 Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}
