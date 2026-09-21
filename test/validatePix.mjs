import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

/* ================================================================
   PIX: bloco configurável no painel → modal público dinâmico.
   - ADMIN: campos carregam da config, bindings gravam em cfg.profile.pix
     e o trigger do preview (#pvPix) liga/desliga conforme o estado.
   - PÚBLICO: trigger #pgPixWrap + campos do modal (#pix-key, #pix-qr,
     #pixCta) preenchidos por applyPix(); sem conteúdo o trigger some.
   Exporta run() retornando o nº de falhas (para a suíte oficial).
   ================================================================ */

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  };

  const PIX_CFG = () => {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.profile = Object.assign({}, c.profile, {
      pix: { enabled: true, key: 'jose@ventura.com', qr: 'https://cdn.axium.test/pix-qr.png', link: 'https://pay.axium.test/123' }
    });
    return c;
  };

  /* ============================ ADMIN ============================ */
  console.log('\n━━━ PIX admin: campos carregam + preview reflete ━━━');
  {
    const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    const d = w.document;
    w.__axEditor.init(PIX_CFG());

    check('admin: #pixEnabled marcado', d.getElementById('pixEnabled').checked === true);
    check('admin: #pixKey carregado', d.getElementById('pixKey').value === 'jose@ventura.com');
    check('admin: #pixLink carregado', d.getElementById('pixLink').value === 'https://pay.axium.test/123');
    check('admin: #pixQrHint visível (QR presente)', d.getElementById('pixQrHint').style.display === 'block');
    check('admin: preview mostra #pvPix', w.__axEditor.dom('pvPix')._hidden === false);

    const wCfg = w.__axEditor.cfg();
    check('admin: cfg.profile.pix salvo', JSON.stringify(wCfg.profile.pix) === JSON.stringify(PIX_CFG().profile.pix));
  }

    console.log('\n━━━ PIX admin: bindings gravam em cfg.profile.pix ━━━');
  {
    const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    const d = w.document;
    const off = PIX_CFG();
    off.profile.pix = { enabled: false, key: '', qr: '', link: '' };
    w.__axEditor.init(off);

    check('admin: PIX desligado → #pvPix oculto', w.__axEditor.dom('pvPix')._hidden === true);

    /* Liga via toggle → bindings persistem em cfg.profile.pix */
    const toggle = d.getElementById('pixEnabled');
    toggle.checked = true;
    toggle.dispatchEvent(new w.Event('change', { bubbles: true }));
    check('admin: toggle grava pix.enabled', w.__axEditor.cfg().profile.pix.enabled === true);
    check('admin: ligar sem conteúdo → #pvPix segue oculto (chave/QR/link ainda vazios)', w.__axEditor.dom('pvPix')._hidden === true);

    /* Digita a chave → cfg.profile.pix.key atualiza */
    const key = d.getElementById('pixKey');
    key.value = 'chave.pix@teste.com';
    key.dispatchEvent(new w.Event('input', { bubbles: true }));
    check('admin: input da chave grava pix.key', w.__axEditor.cfg().profile.pix.key === 'chave.pix@teste.com');

    /* Digita o link → cfg.profile.pix.link atualiza */
    const link = d.getElementById('pixLink');
    link.value = 'https://pay.teste.com/abc';
    link.dispatchEvent(new w.Event('input', { bubbles: true }));
    check('admin: input do link grava pix.link', w.__axEditor.cfg().profile.pix.link === 'https://pay.teste.com/abc');

    /* Remove o QR → hint some e preview continua visível só com chave */
    d.getElementById('btnPixClear').dispatchEvent(new w.Event('click', { bubbles: true }));
    check('admin: remover QR zera pix.qr', w.__axEditor.cfg().profile.pix.qr === '');
    check('admin: após remover QR, hint some', d.getElementById('pixQrHint').style.display === 'none');
    check('admin: preview segue visível (chave presente)', w.__axEditor.dom('pvPix')._hidden === false);
  }

  /* ============================ PÚBLICO ============================ */
  console.log('\n━━━ PIX público: modal preenchido dinamicamente ━━━');
  {
    const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
    const d = w.document;
    w.__alaPublica.aplicar(PIX_CFG());

    check('público: adaptNewSchema carrega pix', JSON.stringify(w.__alaPublica.adapt(PIX_CFG()).profile.pix) === JSON.stringify(PIX_CFG().profile.pix));

    const wrap = w.__alaPublica.dom('#pgPixWrap');
    check('público: #pgPixWrap visível (enabled + conteúdo)', wrap && wrap._hidden === false);

    const keyEl = d.getElementById('pix-key');
    check('público: #pix-key preenchido', keyEl && keyEl.textContent === 'jose@ventura.com');
    const keyBox = d.getElementById('pixKeyBox');
    check('público: #pixKeyBox visível', keyBox && keyBox.hidden === false);

    const qrBox = d.getElementById('pix-qr');
    const qrImg = qrBox && qrBox.querySelector('img');
    check('público: #pix-qr recebe <img> com o QR', !!qrImg && qrImg.getAttribute('src') === 'https://cdn.axium.test/pix-qr.png');
    check('público: #pix-qr visível', qrBox && qrBox.hidden === false);

    const cta = d.getElementById('pixCta');
    check('público: #pixCta com link de pagamento', cta && cta.hidden === false && cta.getAttribute('href') === 'https://pay.axium.test/123');
  }

  console.log('\n━━━ PIX público: sem conteúdo o trigger desaparece ━━━');
  {
    const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
    const d = w.document;

    /* habilitado mas vazio → escondido */
    const empty = PIX_CFG();
    empty.profile.pix = { enabled: true, key: '', qr: '', link: '' };
    w.__alaPublica.aplicar(empty);
    let wrap = w.__alaPublica.dom('#pgPixWrap');
    check('público: enabled=true sem conteúdo → #pgPixWrap oculto', wrap && wrap._hidden === true);

    /* desabilitado com conteúdo → escondido */
    const off = PIX_CFG();
    off.profile.pix = { enabled: false, key: 'chave@x.com', qr: 'https://cdn.axium.test/qr.png', link: 'https://pay.test/1' };
    w.__alaPublica.aplicar(off);
    wrap = w.__alaPublica.dom('#pgPixWrap');
    check('público: enabled=false com conteúdo → #pgPixWrap oculto', wrap && wrap._hidden === true);

    /* config sem campo pix (configs antigas) → escondido */
    w.__alaPublica.aplicar(NEW_CONFIG);
    wrap = w.__alaPublica.dom('#pgPixWrap');
    check('público: config sem pix (legada) → #pgPixWrap oculto', wrap && wrap._hidden === true);
    const keyEl = d.getElementById('pix-key');
    check('público: pop-up não vaza dados com config sem pix', keyEl && keyEl.textContent === '');
  }

  console.log('\n━━━ PIX público: parcial (só chave) ━━━');
  {
    const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
    const d = w.document;
    const parcial = PIX_CFG();
    parcial.profile.pix = { enabled: true, key: '12.345.678/0001-90', qr: '', link: '' };
    w.__alaPublica.aplicar(parcial);

    const wrapP = w.__alaPublica.dom('#pgPixWrap');
    check('público: só chave → trigger visível', !!wrapP && wrapP._hidden === false);
    check('público: só chave → #pixKeyBox visível', d.getElementById('pixKeyBox').hidden === false);
    check('público: só chave → QR oculto', d.getElementById('pix-qr').hidden === true);
    check('público: só chave → CTA oculto', d.getElementById('pixCta').hidden === true);
  }

  /* ========================== INTERCALAÇÃO pix.order ========================== */
  console.log('\n━━━ PIX intercalado como item da lista (pix.order) ━━━');
  {
    /* config: 2 links + PIX intercalado na posição 1 */
    const orderCfg = () => {
      const c = PIX_CFG();
      c.profile.pix = Object.assign({}, c.profile.pix, { order: 1 });
      c.links = [
        { id: 'l1', title: 'WhatsApp', url: 'https://wa.me/1', icon: 'whatsapp' },
        { id: 'l2', title: 'Site', url: 'https://site.com', icon: 'site' }
      ];
      return c;
    };

    /* ---- ADMIN: preview virtual intercala o card PIX na posição ---- */
    {
      const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
      const d = w.document;
      w.__axEditor.init(orderCfg());

      const list = d.getElementById('previewLinksList');
      const pixCards = list.querySelectorAll('[data-pix]');
      const pixCard = list.querySelector('[data-pix]');
      check('admin: preview intercala card PIX (data-pix)', pixCards.length === 1 && !!pixCard);
      check('admin: card PIX intercalado na posição 1 (entre os 2 links)',
        Array.from(list.children).indexOf(pixCard) === 1 &&
        list.children.length === 3);
      check('admin: intercalado mantém data-dialog-open', pixCard && pixCard.getAttribute('data-dialog-open') !== null);
      check('admin: header #pvPix oculto quando PIX na lista (inList)', w.__axEditor.dom('pvPix')._hidden === true);

      const saved = w.__axEditor.cfg().profile.pix;
      check('admin: pix.order persistido', saved.order === 1);
    }

    /* ---- PÚBLICO: card PIX intercalado + #pgPixWrap oculto neste caso ---- */
    {
      const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const d = w.document;
      w.__alaPublica.aplicar(orderCfg());

      const listWrap = w.__alaPublica.dom('#pgPixWrap');
      check('público: #pgPixWrap oculto quando PIX na lista', listWrap && listWrap._hidden === true);

      const linksList = d.querySelector('#pgLinks .pg-links-list');
      const pixPub = linksList && linksList.querySelector('[data-pix]');
      const pixCount = linksList ? linksList.querySelectorAll('[data-pix]').length : 0;
      check('público: card PIX intercalado na lista ([data-pix])', pixCount === 1 && !!pixPub);
      check('público: intercalado na posição 1 (entre os 2 links)',
        linksList && Array.from(linksList.children).indexOf(pixPub) === 1 &&
        linksList.children.length === 3,
        `(${linksList ? linksList.children.length : '?'} children)`);
    }
  }

  console.log(`  ✅ PIX Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}