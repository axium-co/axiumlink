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

  /* =============== ESTILO COMPLETO DO BOTÃO PIX (painel) =============== */
  const PIX_STYLE = () => ({
    variant: 'neon', format: 'pill', animation: 'float',
    shadow: { type: 'none', intensity: 0 },
    radius: 24, glow: '#22d3ee',
    gradient: { start: '#16a34a', end: '#15803d', angle: 60 },
    glass: { enabled: false, blur: 20, opacity: 16, borderOpacity: 25, highlight: true, noise: true },
    colors: { background: '#0f172a', text: '#f8fafc' }
  });
  const PIX_STYLE_CFG = () => {
    const c = PIX_CFG();
    c.profile.pix.style = PIX_STYLE();
    return c;
  };

  console.log('\n━━━ PIX estilo: painel completo reflete + grava pix.style ━━━');
  {
    const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    const d = w.document;
    w.__axEditor.init(PIX_STYLE_CFG());

    const sel = (id) => d.getElementById(id);
    check('admin: #pixStVariant reflete pix.style.variant', sel('pixStVariant').value === 'neon');
    check('admin: #pixBtnShape reflete o format (10 opções)', sel('pixBtnShape').value === 'pill');
    check('admin: #pixBtnShape oferece as 10 opções (3 optgroups)', sel('pixBtnShape').querySelectorAll('option').length === 10);
    check('admin: #pixStAnimation reflete animation', sel('pixStAnimation').value === 'float');
    check('admin: #pixStShadowStyle reflete shadow.type', sel('pixStShadowStyle').value === 'none');
    check('admin: #pixStGlassToggle reflete glass.enabled (off)', sel('pixStGlassToggle').checked === false);
    check('admin: #pixStGlassNoise reflete glass.noise', sel('pixStGlassNoise').checked === true);
    check('admin: #pixStGlassHighlight reflete glass.highlight', sel('pixStGlassHighlight').checked === true);

    /* Binding: muda variante → grava em profile.pix.style */
    const varSel = sel('pixStVariant');
    varSel.value = 'gradient';
    varSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    check('admin: variante → pix.style.variant', w.__axEditor.cfg().profile.pix.style.variant === 'gradient');

    /* Binding: formato → grava em pix.style.format */
    const fmtSel = sel('pixBtnShape');
    fmtSel.value = 'organic';
    fmtSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    check('admin: formato → pix.style.format', w.__axEditor.cfg().profile.pix.style.format === 'organic');

    /* Binding: animação → grava e reflete na classe do preview */
    const animSel = sel('pixStAnimation');
    animSel.value = 'shine';
    animSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    check('admin: animação → pix.style.animation', w.__axEditor.cfg().profile.pix.style.animation === 'shine');
    check('admin: animação aplicada no header (#pvPix pv-anim-shine)', d.getElementById('pvPix').classList.contains('pv-anim-shine'));

    /* Binding: vidro → grava glass.enabled e aplica gx-panel no header */
    const glass = sel('pixStGlassToggle');
    glass.checked = true;
    glass.dispatchEvent(new w.Event('change', { bubbles: true }));
    check('admin: vidro → pix.style.glass.enabled', w.__axEditor.cfg().profile.pix.style.glass.enabled === true);
    check('admin: vidro aplicado no header (#pvPix gx-panel)', d.getElementById('pvPix').classList.contains('gx-panel'));

    /* Binding: ruído → grava glass.noise e aplica gx-noise no header */
    const noise = sel('pixStGlassNoise');
    noise.checked = true;
    noise.dispatchEvent(new w.Event('change', { bubbles: true }));
    check('admin: ruído → pix.style.glass.noise', w.__axEditor.cfg().profile.pix.style.glass.noise === true);
    check('admin: ruído aplicado no header (#pvPix gx-noise)', d.getElementById('pvPix').classList.contains('gx-noise'));

    /* Binding: blur → grava glass.blur e o backdropFilter do preview reflete */
    const blur = sel('pixStGlassBlur');
    blur.value = '30';
    blur.dispatchEvent(new w.Event('input', { bubbles: true }));
    check('admin: blur → pix.style.glass.blur = 30', w.__axEditor.cfg().profile.pix.style.glass.blur === 30);
  }

  console.log('\n━━━ PIX estilo: header do preview aplica o flat (neon/pill) ━━━');
  {
    const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    const d = w.document;
    w.__axEditor.init(PIX_STYLE_CFG());

    const node = d.getElementById('pvPix');
    const cs = w.getComputedStyle(node);
    check('admin: header neon → fundo transparente', cs.backgroundColor === 'rgba(0, 0, 0, 0)');
    check('admin: header neon → cor = glow (#22d3ee)', cs.color.toLowerCase().replace(/\s/g, '') === 'rgb(34,211,238)');
    check('admin: formato pill → border-radius 9999px', cs.borderRadius === '9999px');
  }

  console.log('\n━━━ PIX estilo: público aplica o flat no header e no card intercalado ━━━');
  {
    /* ---- Header (#pgPixWrap .pg-pix__btn) sem order ---- */
    {
      const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const d = w.document;
      w.__alaPublica.aplicar(PIX_STYLE_CFG());
      const btn = d.querySelector('.pg-pix__btn');
      const cs = w.getComputedStyle(btn);
      check('público: header neon → fundo transparente', cs.backgroundColor === 'rgba(0, 0, 0, 0)');
      check('público: header neon → cor = glow', cs.color.toLowerCase().replace(/\s/g, '') === 'rgb(34,211,238)');
      check('público: header pill → border-radius 9999px', cs.borderRadius === '9999px');
      check('público: header animação float (ax-anim-float)', btn.classList.contains('ax-anim-float'));
    }

    /* ---- Header com variante SÓLIDA mas vidro global/individual ligado:
           blur (backdropFilter) e ruído precisam chegar MESMO sem glass variant ---- */
    {
      const c = PIX_STYLE_CFG();
      c.profile.pix.style.variant = 'solid';
      c.profile.pix.style.glass = { enabled: true, blur: 24, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: true, borderOpacity: 25 };
      const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const d = w.document;
      w.__alaPublica.aplicar(c);
      const btn = d.querySelector('.pg-pix__btn');
      const cs = w.getComputedStyle(btn);
      check('público: header sólido+vidro → blur inline no botão', /blur\(24px\)/.test(btn.style.backdropFilter || ''), String(btn.style.backdropFilter));
      check('público: header sólido+vidro → classe gx-noise', btn.classList.contains('gx-noise'));
      check('público: header sólido+vidro → classe gx-highlight', btn.classList.contains('gx-highlight'));
      check('público: header sólido+vidro → classe gx-panel', btn.classList.contains('gx-panel'));
    }

    /* ---- Card intercalado (pix.order) usa o estilo individual ---- */
    {
      const c = PIX_STYLE_CFG();
      c.profile.pix.order = 1;
      c.links = [
        { id: 'l1', title: 'WhatsApp', url: 'https://wa.me/1', icon: 'whatsapp' },
        { id: 'l2', title: 'Site', url: 'https://site.com', icon: 'site' }
      ];
      const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const d = w.document;
      w.__alaPublica.aplicar(c);
      const card = d.querySelector('[data-pix]');
      const cs = w.getComputedStyle(card);
      check('público: card intercalado neon → fundo transparente', cs.backgroundColor === 'rgba(0, 0, 0, 0)');
      check('público: card intercalado neon → cor = glow', cs.color.toLowerCase().replace(/\s/g, '') === 'rgb(34,211,238)');
      check('público: card intercalado pill → border-radius 9999px', cs.borderRadius === '9999px');
      check('público: card intercalado animação float', card.classList.contains('ax-anim-float'));
    }
  }

  console.log('\n━━━ PIX estilo: tamanho do botão (width/height) + tipografia ━━━');
  {
    const SIZED = () => {
      const c = PIX_STYLE_CFG();
      c.profile.pix.style.width = 560;
      c.profile.pix.style.height = 72;
      c.profile.pix.style.font = 'Poppins';
      c.profile.pix.style.fontSize = 22;
      c.profile.pix.style.fontWeight = 800;
      return c;
    };

    /* ---- ADMIN: controles refletem + binding grava + preview aplica ---- */
    {
      const { window: w } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
      const d = w.document;
      w.__axEditor.init(SIZED());
      check('admin: #pixStWidth reflete pix.style.width', d.getElementById('pixStWidth').value === '560');
      check('admin: #pixStWidthVal mostra 560px', d.getElementById('pixStWidthVal').textContent === '560px');
      check('admin: #pixStHeight reflete pix.style.height', d.getElementById('pixStHeight').value === '72');
      check('admin: #pixStHeightVal mostra 72px', d.getElementById('pixStHeightVal').textContent === '72px');
      check('admin: #pixStFont reflete pix.style.font', d.getElementById('pixStFont').value === 'Poppins');
      check('admin: #pixStFontSize reflete pix.style.fontSize', d.getElementById('pixStFontSize').value === '22');
      check('admin: #pixStFontSizeVal mostra 22px', d.getElementById('pixStFontSizeVal').textContent === '22px');
      check('admin: #pixStFontWeight reflete pix.style.fontWeight', d.getElementById('pixStFontWeight').value === '800');

      const node = d.getElementById('pvPix');
      check('admin: header aplica largura 560px', node.style.maxWidth === '560px', node.style.maxWidth);
      check('admin: header aplica altura 72px', node.style.minHeight === '72px', node.style.minHeight);
      check('admin: header aplica font-size 22px', node.style.fontSize === '22px', node.style.fontSize);
      check('admin: header aplica font-weight 800', node.style.fontWeight === '800', node.style.fontWeight);
      check('admin: header aplica fonte Poppins', (node.style.fontFamily || '').indexOf('Poppins') >= 0, node.style.fontFamily);
      check('admin: header mantém padding padrão', node.style.padding === '0.8rem 1.25rem', node.style.padding);
      check('admin: header mantém ícone 18px', node.querySelector('.pv-pix__ico').style.width === '18px');

      const widthSlider = d.getElementById('pixStWidth');
      widthSlider.value = '300';
      widthSlider.dispatchEvent(new w.Event('input', { bubbles: true }));
      check('admin: largura → pix.style.width = 300', w.__axEditor.cfg().profile.pix.style.width === 300);
      check('admin: output da largura vira 300px', d.getElementById('pixStWidthVal').textContent === '300px');
      const heightSlider = d.getElementById('pixStHeight');
      heightSlider.value = '0';
      heightSlider.dispatchEvent(new w.Event('input', { bubbles: true }));
      check('admin: altura → pix.style.height = 0', w.__axEditor.cfg().profile.pix.style.height === 0);
      check('admin: output da altura vira Auto', d.getElementById('pixStHeightVal').textContent === 'Auto');
      const fontSel = d.getElementById('pixStFont');
      fontSel.value = 'Inter';
      fontSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      check('admin: change → pix.style.font = Inter', w.__axEditor.cfg().profile.pix.style.font === 'Inter');
      const fs = d.getElementById('pixStFontSize');
      fs.value = '12';
      fs.dispatchEvent(new w.Event('input', { bubbles: true }));
      check('admin: fonte → pix.style.fontSize = 12', w.__axEditor.cfg().profile.pix.style.fontSize === 12);
      check('admin: output da fonte vira 12px', d.getElementById('pixStFontSizeVal').textContent === '12px');
      const fw = d.getElementById('pixStFontWeight');
      fw.value = '300';
      fw.dispatchEvent(new w.Event('input', { bubbles: true }));
      check('admin: peso → pix.style.fontWeight = 300', w.__axEditor.cfg().profile.pix.style.fontWeight === 300);
      check('admin: output do peso vira 300', d.getElementById('pixStFontWeightVal').textContent === '300');
    }

    /* ---- PÚBLICO: header com tamanho + fonte/tamanho/peso ---- */
    {
      const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const d = w.document;
      w.__alaPublica.aplicar(SIZED());
      const btn = d.querySelector('.pg-pix__btn');
      check('público: header largura 560px', btn.style.maxWidth === '560px', btn.style.maxWidth);
      check('público: header altura 72px', btn.style.minHeight === '72px', btn.style.minHeight);
      check('público: header font-size 22px', btn.style.fontSize === '22px', btn.style.fontSize);
      check('público: header font-weight 800', btn.style.fontWeight === '800', btn.style.fontWeight);
      check('público: header fonte Poppins', (btn.style.fontFamily || '').indexOf('Poppins') >= 0, btn.style.fontFamily);
      const ico = btn.querySelector('.pg-pix__ico');
      check('público: header ícone 18px', ico.style.width === '18px' && ico.style.height === '18px');
    }

    /* ---- PÚBLICO: sem tamanho/tipografia → padrão (560px / 72px / 15px / 600) ---- */
    {
      const c = PIX_STYLE_CFG();
      delete c.profile.pix.style.width;
      delete c.profile.pix.style.height;
      delete c.profile.pix.style.font;
      delete c.profile.pix.style.fontSize;
      delete c.profile.pix.style.fontWeight;
      const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const d = w.document;
      w.__alaPublica.aplicar(c);
      const btn = d.querySelector('.pg-pix__btn');
      check('público: default preserva padding', btn.style.padding === '0.8rem 1.25rem', btn.style.padding);
      check('público: default largura 560px', btn.style.maxWidth === '560px', btn.style.maxWidth);
      check('público: default altura 72px', btn.style.minHeight === '72px', btn.style.minHeight);
      check('público: default fonte 15px', btn.style.fontSize === '15px', btn.style.fontSize);
      check('público: default peso 600', btn.style.fontWeight === '600', btn.style.fontWeight);

      c.profile.pix.style.height = 0;
      w.__alaPublica.aplicar(c);
      const btnAuto = d.querySelector('.pg-pix__btn');
      check('público: altura 0 = automática (sem min-height)', btnAuto.style.minHeight === '', btnAuto.style.minHeight);
    }

    /* ---- PÚBLICO: card intercalado recebe tamanho + tipografia ---- */
    {
      const c = SIZED();
      c.profile.pix.order = 1;
      c.links = [{ id: 'l1', title: 'WhatsApp', url: 'https://wa.me/1', icon: 'whatsapp' }];
      const { window: w } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const d = w.document;
      w.__alaPublica.aplicar(c);
      const card = d.querySelector('[data-pix]');
      check('público: card intercalado largura 560px', card.style.maxWidth === '560px', card.style.maxWidth);
      check('público: card intercalado altura 72px', card.style.minHeight === '72px', card.style.minHeight);
      check('público: card intercalado font-size 22px', card.style.fontSize === '22px', card.style.fontSize);
      check('público: card intercalado font-weight 800', card.style.fontWeight === '800', card.style.fontWeight);
    }
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