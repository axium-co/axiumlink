/* ================================================================
   PARIDADE DO BOTÃO PIX
   ----------------------------------------------------------------
   O PIX é um botão da lista: precisa se comportar EXATAMENTE como o
   botão de link nos três lugares onde ele é desenhado — preview do
   admin, página pública e render-core.js.

   Este teste cobre as três frentes:
     A) PAINEL  — o painel PIX tem os mesmos controles do painel Link
                   (mesmo motor, mesmas chaves) e reflete o salvo.
     B) PREVIEW = PÚBLICO — assinatura visual idêntica do card PIX.
     C) PÚBLICO = RENDER-CORE — mesmas classes para a mesma config.
   ================================================================ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
  };

  /* ============================ HELPERS ============================ */

  const PIX_CFG = (style) => {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.profile = Object.assign({}, c.profile, {
      pix: { enabled: true, key: 'jose@ventura.com', qr: 'https://cdn.axium.test/qr.png', link: 'https://pay.axium.test/1', order: 1, buttonText: 'Pagar agora' }
    });
    if (style) c.profile.pix.style = style;
    c.links = [{ id: 'l1', title: 'Meu site', url: 'https://site.com', type: 'site' }];
    return c;
  };

  const adminRender = (cfg) => {
    const { window } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    window.__axEditor.init(cfg);
    const d = window.document;
    return { d, w: window, card: d.querySelector('#previewLinksList [data-pix="1"]') };
  };

  const publicRender = (cfg) => {
    const { window } = boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
    window.__alaPublica.aplicar(cfg);
    const d = window.document;
    return { d, w: window, card: d.querySelector('.pg-links-list [data-pix="1"]') };
  };

  const coreRender = (cfg) => {
    const code = readFileSync(join(root, 'js/render-core.js'), 'utf8');
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="host"></div></body></html>', { runScripts: 'outside-only', url: 'https://axiumlink.test/' });
    const { window } = dom;
    window.eval(code);
    const host = window.document.getElementById('host');
    window.RenderCore.renderLinksList(host, cfg.links || [], cfg, false);
    return { d: window.document, w: window, card: host.querySelector('[data-pix="1"]') };
  };

  /* Assinatura comparável entre preview e público: só o que os dois
    Contexts escrevem de fato (o resto da class list é específico de cada
     stylesheet). */
  const signature = (card) => {
    if (!card) return null;
    const s = card.style;
    const ico = card.querySelector('.pv-pix__ico, .pg-pix__ico, .featured__icon, .link-block-icon');
    const icoImg = ico ? ico.querySelector('img') : null;
    const txt = card.querySelector('.link-block-title, .featured__body strong, strong');
    const t = txt ? txt.style : null;
    return {
      kind: card.classList.contains('link-block-customimg') || card.classList.contains('featured__card--customimg') ? 'customimg'
        : card.classList.contains('featured__card--testimonial') ? 'testimonial'
          : card.classList.contains('featured__card--highlight') ? 'highlight' : 'pix',
      fontStyle: s.fontStyle || '',
      padding: s.padding || '',
      maxWidth: s.maxWidth || '',
      minHeight: s.minHeight || '',
      marginLeft: s.marginLeft || '',
      marginRight: s.marginRight || '',
      marginTop: s.marginTop || '',
      alignSelf: s.alignSelf || '',
      customImgH: s.getPropertyValue('--customimg-h').trim(),
      iconImg: icoImg ? icoImg.getAttribute('src') : '',
      iconKey: ico ? (ico.querySelector('i') ? ico.querySelector('i').className : '') : '',
      iconDisplay: ico ? ico.style.display : '',
      iconW: ico ? ico.style.width : '',      textFontSize: t ? (t.fontSize || '') : '',
      textFontWeight: t ? (t.fontWeight || '') : '',
      textLetterSpacing: t ? (t.letterSpacing || '') : '',
      textLineHeight: t ? (t.lineHeight || '') : '',
      textFontFamily: t ? (t.fontFamily || '') : ''
    };
  };

  const diffKeys = (a, b) => {
    if (!a || !b) return ['(card ausente)'];
    return Object.keys(a).filter((k) => a[k] !== b[k]);
  };

  /* ===================== A) PAINEL (admin) ===================== */

  console.log('\n━━━ PARIDADE PIX: painel tem os mesmos controles do link ━━━');

  const GLASS_KEYS = ['GlassToggle', 'GlassBlur', 'GlassSaturate', 'GlassOpacity', 'GlassColor', 'GlassBorderGlow', 'GlassShadowDepth', 'GlassHighlight', 'GlassNoise', 'GlassBorderOpacity'];

  {
    const { d } = adminRender(PIX_CFG());
    /* Paridade de painel = MESMO conjunto de controles, prefixo à parte.
       Compara os sufixos dos ids de cada painel (perBtn* vs pixSt*). */
    const suffixes = (re) => {
      const out = new Set();
      d.querySelectorAll('[id]').forEach((el) => {
        const m = String(el.id).match(re);
        if (m) out.add(m[1]);
      });
      return out;
    };
    const linkIds = suffixes(/^perBtn([A-Z].*)$/);
    const pixIds = suffixes(/^pixSt([A-Z].*)$/);
    const onlyLink = [...linkIds].filter((k) => !pixIds.has(k));
    const onlyPix = [...pixIds].filter((k) => !linkIds.has(k));
    check('painel: PIX tem os mesmos controles do link', onlyLink.length === 0, 'só no link: ' + onlyLink.join(','));
    /* O painel do link usa modal para tipografia, ícone, cardStyle, btnDesign,
       spacing, etc. (prefixo block*). O painel do PIX expõe tudo inline.
       A paridade real é no motor de estilo (STYLE_CONTROLS), não no DOM do painel. */

    const glassLink = GLASS_KEYS.filter((k) => !d.getElementById('perButton' + k));
    const glassPix = GLASS_KEYS.filter((k) => !d.getElementById('pixSt' + k));
    check('painel: link tem o grupo de vidro completo', glassLink.length === 0, glassLink.join(','));
    check('painel: PIX tem o grupo de vidro completo', glassPix.length === 0, glassPix.join(','));

    check('painel: vidro do link tem wrapper de opções', !!d.getElementById('perButtonGlassOpts'));
    check('painel: vidro do PIX tem wrapper de opções', !!d.getElementById('pixStGlassOpts'));
  }

  console.log('\n━━━ PARIDADE PIX: painel reflete o style salvo (vidro) ━━━');
  {
    const style = {
      variant: 'glass', format: 'pill', animation: 'shine',
      shadow: { type: 'soft', intensity: 55 },
      glass: { enabled: true, blur: 33, opacity: 44, borderOpacity: 55, saturate: 190, borderGlow: 66, shadowDepth: 77, highlight: true, noise: true, color: '#123456' }
    };
    const { d } = adminRender(PIX_CFG(style));
    const g = (id) => d.getElementById(id);
    check('reflete vidro ligado (PIX)', g('pixStGlassToggle').checked === true);
    check('reflete blur do PIX', g('pixStGlassBlur').value === '33', g('pixStGlassBlur').value);
    check('reflete saturação do PIX', g('pixStGlassSaturate').value === '190', g('pixStGlassSaturate').value);
    check('reflete opacidade do PIX', g('pixStGlassOpacity').value === '44', g('pixStGlassOpacity').value);
    check('reflete opacidade da borda do PIX', g('pixStGlassBorderOpacity').value === '55', g('pixStGlassBorderOpacity').value);
    check('reflete brilho da borda do PIX', g('pixStGlassBorderGlow').value === '66', g('pixStGlassBorderGlow').value);
    check('reflete profundidade da sombra do PIX', g('pixStGlassShadowDepth').value === '77', g('pixStGlassShadowDepth').value);
    check('reflete reflexo de luz do PIX', g('pixStGlassHighlight').checked === true);
    check('reflete ruído do PIX', g('pixStGlassNoise').checked === true);
    check('reflete cor do vidro do PIX', (g('pixStGlassColor').querySelector('.color-trigger-hex') || {}).textContent === '#123456');
  }

  console.log('\n━━━ PARIDADE PIX: herança de tipografia no painel ━━━');
  {
    const c = PIX_CFG({ fontSize: null, fontWeight: null, letterSpacing: null, lineHeight: null });
    const { d, w } = adminRender(c);
    check('herança: null → "usar global" marcado no PIX', d.getElementById('pixStTypoGlobal').checked === true);
    check('herança: null mostra o tamanho global (15)', d.getElementById('pixStFontSize').value === '15', d.getElementById('pixStFontSize').value);

    const inp = d.getElementById('pixStFontSize');
    inp.value = '22';
    inp.dispatchEvent(new w.Event('input', { bubbles: true }));
    check('herança: mexer no tamanho grava no PIX', w.__axEditor.cfg().profile.pix.style.fontSize === 22);
    check('herança: mexer no tamanho desmarca "usar global"', d.getElementById('pixStTypoGlobal').checked === false);
  }

  /* =============== B) PREVIEW DO ADMIN = PÚBLICO =============== */

  console.log('\n━━━ PARIDADE PIX: preview do admin = página pública ━━━');

  const CASES = [
    ['padrão (sem style)', null],
    ['caixa sólida + gradiente', { variant: 'solid', format: 'pill', animation: 'float', shadow: { type: 'soft', intensity: 30 }, radius: 18, gradient: { start: '#111111', end: '#222222', angle: 45 }, colors: { background: '#16a34a', text: '#ffffff' } }],
    ['vidro ligado', { variant: 'glass', glass: { enabled: true, blur: 20, opacity: 16, borderOpacity: 25, saturate: 180, borderGlow: 40, shadowDepth: 18, highlight: true, noise: true } }],
    ['tamanho próprio', { width: 320, height: 96 }],
    ['largura sem teto (0) + altura automática (0)', { width: 0, height: 0 }],
    ['somente texto', { displayStyle: 'text-only' }],
    ['ícone por imagem', { icon: 'pix', iconImg: 'https://cdn.axium.test/ico.png', iconAlign: 'center' }],
    ['ícone alinhado à direita', { icon: 'whatsapp', iconAlign: 'right' }],
    ['card destaque', { cardStyle: 'highlight' }],
    ['card depoimento', { cardStyle: 'testimonial' }],
    ['botão-imagem', { btnDesign: 'imagem', customButtonImage: 'https://cdn.axium.test/btn.png', customHeight: 96 }],
    ['espaçamento próprio', { spacing: 37 }],
    ['tipografia própria', { font: 'mono', fontSize: 21, fontWeight: 800, letterSpacing: 2, lineHeight: 1.8 }]
  ];

  for (const [label, style] of CASES) {
    const cfg = PIX_CFG(style);
    const A = adminRender(JSON.parse(JSON.stringify(cfg)));
    const P = publicRender(JSON.parse(JSON.stringify(cfg)));
    const sa = signature(A.card);
    const sp = signature(P.card);
    const bad = diffKeys(sa, sp);
    check('preview = público: ' + label, bad.length === 0, bad.map((k) => `${k} (admin=${JSON.stringify(sa && sa[k])} vs publico=${JSON.stringify(sp && sp[k])})`).join(' | '));
  }

  console.log('\n━━━ PARIDADE PIX: valores padrão e 0 (ausente ≠ 0) ━━━');
  {
    const A = adminRender(PIX_CFG({ variant: 'solid' }));
    const P = publicRender(PIX_CFG({ variant: 'solid' }));
    const sa = signature(A.card), sp = signature(P.card);
    check('ausente de height → 72px nos dois', sa.minHeight === '72px' && sp.minHeight === '72px', `admin=${sa.minHeight} publico=${sp.minHeight}`);
    check('ausente de width → teto 560px nos dois', sa.maxWidth.includes('560px') && sp.maxWidth.includes('560px'), `admin=${sa.maxWidth} publico=${sp.maxWidth}`);

    const A0 = adminRender(PIX_CFG({ variant: 'solid', height: 0, width: 0 }));
    const P0 = publicRender(PIX_CFG({ variant: 'solid', height: 0, width: 0 }));
    check('height 0 → altura automática nos dois', signature(A0.card).minHeight === '' && signature(P0.card).minHeight === '');
  }

  console.log('\n━━━ PARIDADE PIX: espaçamento na lista (global e próprio) ━━━');
  {
    const c = PIX_CFG({ variant: 'solid', spacing: 40 });
    c.style.blockGap = 15;
    const A = adminRender(JSON.parse(JSON.stringify(c)));
    const P = publicRender(JSON.parse(JSON.stringify(c)));
    const aKids = [...A.d.querySelectorAll('#previewLinksList > *')];
    const pKids = [...P.d.querySelectorAll('.pg-links-list > *')];
    check('PIX respeita o próprio espaçamento (admin)', aKids.some((el) => el.getAttribute('data-pix') === '1' && el.style.marginTop === '40px'), aKids.map((el) => el.style.marginTop).join('|'));
    check('PIX respeita o próprio espaçamento (público)', pKids.some((el) => el.getAttribute('data-pix') === '1' && el.style.marginTop === '40px'), pKids.map((el) => el.style.marginTop).join('|'));
  }

  console.log('\n━━━ PARIDADE PIX: trocar cardStyle/btnDesign re-renderiza (in-place) ━━━');
  {
    const c = PIX_CFG({ variant: 'solid' });
    const { d, w } = adminRender(c);
    const before = d.querySelector('#previewLinksList [data-pix="1"]');
    const sel = d.getElementById('pixStCardStyle');
    sel.value = 'highlight';
    sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    const after = d.querySelector('#previewLinksList [data-pix="1"]');
    check('admin: cardStyle muda o card sem recarregar a página', after !== before && after.classList.contains('featured__card--highlight'), after.className);

    const { d: dP, w: wP } = publicRender(PIX_CFG({ variant: 'solid' }));
    const cardP = dP.querySelector('.pg-links-list [data-pix="1"]');
    wP.__alaPublica.aplicar(PIX_CFG({ variant: 'solid', cardStyle: 'testimonial' }));
    const afterP = dP.querySelector('.pg-links-list [data-pix="1"]');
    check('público: cardStyle troca a classe do card', afterP !== cardP && afterP.classList.contains('featured__card--testimonial'), afterP.className);
  }

  /* ============== C) PÚBLICO = RENDER-CORE ============== */

  console.log('\n━━━ PARIDADE PIX: página pública = render-core.js ━━━');

  const CORE_KEYS_CLS = ['variant:glass', 'variant:solid', 'cardStyle:highlight', 'cardStyle:testimonial', 'btnDesign:imagem', 'iconImg:sem-imagem', 'iconImg:com-imagem', 'padrão'];

  for (const key of CORE_KEYS_CLS) {
    let style = null;
    if (key === 'variant:glass') style = { variant: 'glass', glass: { enabled: true, blur: 20, opacity: 16 } };
    if (key === 'variant:solid') style = { variant: 'solid', colors: { background: '#16a34a', text: '#ffffff' } };
    if (key === 'cardStyle:highlight') style = { variant: 'solid', cardStyle: 'highlight' };
    if (key === 'cardStyle:testimonial') style = { variant: 'solid', cardStyle: 'testimonial' };
    if (key === 'btnDesign:imagem') style = { variant: 'solid', btnDesign: 'imagem', customButtonImage: 'https://cdn.axium.test/btn.png', customHeight: 96 };
    if (key === 'iconImg:sem-imagem') style = { variant: 'solid', icon: 'pix', iconImg: '' };
    if (key === 'iconImg:com-imagem') style = { variant: 'solid', icon: 'pix', iconImg: 'https://cdn.axium.test/ico.png' };

    const cfg = PIX_CFG(style);
    const P = publicRender(JSON.parse(JSON.stringify(cfg)));
    const R = coreRender(JSON.parse(JSON.stringify(cfg)));
    const clsP = P.card ? P.card.className.split(/\s+/).sort().join(' ') : '(sem card)';
    const clsR = R.card ? R.card.className.split(/\s+/).sort().join(' ') : '(sem card)';
    check('público = render-core: ' + key, clsP === clsR, `publico="${clsP}" vs core="${clsR}"`);

    const imgP = P.card ? P.card.querySelector('img') : null;
    const imgR = R.card ? R.card.querySelector('img') : null;
    check('público = render-core: imagem/src ' + key, (imgP ? imgP.getAttribute('src') : '') === (imgR ? imgR.getAttribute('src') : ''));
  }

  /* Relatório final no formato usado pela suíte oficial. */
  console.log(`\n  PIX PARITY: ${pass} passed | ${fail} failed`);
  return fail;
}
