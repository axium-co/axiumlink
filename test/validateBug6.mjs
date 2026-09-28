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
    const icon = ok ? '?' : '?';
    console.log(`  ${icon} ${label}${detail ? ' - ' + detail : ''}`);
  };
  /* Tamanho do primeiro card na página pública, para comparar mockup x site. */
  const pubSize = (cfg) => {
    const { window: pw } = boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
    pw.__alaPublica.aplicar(JSON.parse(JSON.stringify(cfg)));
    const card = pw.document.querySelector('#pgLinks a.featured__card');
    return card ? card.style.fontSize : '(sem card)';
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

  /* ================================================================
     BUG 6D: herança da tipografia do painel. O "Tamanho da fonte" global
     morria para qualquer link já salvo: submitBlock gravava linkFontSize à
     força, então o botão nascia travado no 15px e o slider global virava
     no-op. Agora o modal tem "Usar a tipografia do painel".
     ================================================================ */
  console.log('\n=== BUG 6D: heranca da tipografia do painel ===');
  {
    const mkCfg = () => {
      const c = JSON.parse(JSON.stringify(NEW_CONFIG));
      c.profile = c.profile || {};
      c.profile.pix = { enabled: false };
      c.style = c.style || {};
      c.style.showCategoryTabs = false;
      c.style.typoBtn = { font: '', size: 15, weight: 600, ls: 0, lh: 1.4 };
      c.links = [{ id: 'l1', title: 'Site', url: 'https://a.com', type: 'site' }];
      return c;
    };
    /* Salvar o bloco mexendo SÓ no título não pode cravar o tamanho. */
    const { window: w } = boot(ADMIN_PATH, { supabase: supabaseStub(mkCfg()), url: 'https://axiumlink.test/admin.html' });
    const d = w.document;
    w.__axEditor.init(mkCfg());
    d.querySelector('#linksList .icon-btn').click();
    const box = d.getElementById('blockTypoGlobal');
    check('heranca: link novo abre herdando do painel', !!box && box.checked === true);
    d.getElementById('blockTitle').value = 'Meu Site';
    d.getElementById('blockTitle').dispatchEvent(new w.Event('input', { bubbles: true }));
    d.getElementById('btnBlockSave').click();
    check('heranca: salvar mexendo so no titulo nao grava linkFontSize', w.__axEditor.cfg().links[0].linkFontSize == null, JSON.stringify(w.__axEditor.cfg().links[0].linkFontSize));

    /* E o slider global volta a mandar nesse link. */
    const g = d.getElementById('typoBtnSize');
    g.value = '27';
    g.dispatchEvent(new w.Event('input', { bubbles: true }));
    const pv = d.querySelector('#previewLinksList .link-block');
    check('heranca: slider global volta a valer depois de salvar o bloco', !!pv && pv.style.fontSize === '27px', pv ? pv.style.fontSize : '?');
    check('heranca: publico tambem obedece o global', pubSize(w.__axEditor.cfg()) === '27px', pubSize(w.__axEditor.cfg()));

    /* Override explícito: arrastar o slider desmarca a herança. */
    d.querySelector('#linksList .icon-btn').click();
    const sz = d.getElementById('blockTypoSize');
    sz.value = '28';
    sz.dispatchEvent(new w.Event('input', { bubbles: true }));
    check('override: arrastar o slider desmarca "usar a do painel"', box.checked === false);
    d.getElementById('btnBlockSave').click();
    check('override: gravou linkFontSize=28', w.__axEditor.cfg().links[0].linkFontSize === 28, String(w.__axEditor.cfg().links[0].linkFontSize));
    check('override: publico renderiza 28px', pubSize(w.__axEditor.cfg()) === '28px', pubSize(w.__axEditor.cfg()));

    /* Reabrir mostra o override; remarcar a herança volta ao global. */
    d.querySelector('#linksList .icon-btn').click();
    check('override: reabrir com o box desmarcado', box.checked === false);
    box.checked = true;
    box.dispatchEvent(new w.Event('change', { bubbles: true }));
    check('heranca: remarcar traz o valor global de volta no slider', d.getElementById('blockTypoSize').value === g.value, d.getElementById('blockTypoSize').value + ' (global ' + g.value + ')');
    d.getElementById('btnBlockSave').click();
    check('heranca: volta a gravar null (liberta o link do global)', w.__axEditor.cfg().links[0].linkFontSize == null, JSON.stringify(w.__axEditor.cfg().links[0].linkFontSize));
  }

  /* Piso de 13px: o mockup não pode mostrar 12px de um config legado se o
     público sobe para 13px. */
  console.log('\n=== BUG 6E: piso de 13px coerente entre mockup e publico ===');
  {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.profile = c.profile || {};
    c.profile.pix = { enabled: false };
    c.links = [{ id: 'l1', title: 'Site', url: 'https://a.com', type: 'site', linkFontSize: 12 }];
    const { window: w } = boot(ADMIN_PATH, { supabase: supabaseStub(JSON.parse(JSON.stringify(c))), url: 'https://axiumlink.test/admin.html' });
    w.__axEditor.init(JSON.parse(JSON.stringify(c)));
    const pv = w.document.querySelector('#previewLinksList .link-block');
    const ps = pubSize(c);
    check('piso: slider nao oferece menos de 13px', w.document.getElementById('blockTypoSize').min === '13', w.document.getElementById('blockTypoSize').min);
    check('piso: mockup e publico batem em config legado de 12px', (pv ? pv.style.fontSize : '') === ps, (pv ? pv.style.fontSize : '?') + ' vs ' + ps);
  }

  console.log(`  ✅ BUG 6 Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}
