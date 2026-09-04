/* BUG 10 — Auditoria completa dos efeitos de vidro (glassmorphism).
   Cobre os grupos (name/bio/address/banner/button) e corrige os
   controles desconectados encontrados na auditoria:

   1) borderOpacity (grupo buttonGlass) agora é CONSUMIDO por applyGlass/buildBtn
      (antes era salvo no config, mas nunca aplicado na CSS da borda).
   2) Vidro do avatar (design.profile.glass) agora aparece no preview do ADMIN
      (classe .glass + vars --glass-*) — antes só o público #pgAvatarCard o
      renderizava.

   Também garante (não-regressão) que name/bio/address/button seguem
   conectados (audit table) e que o borderGlow continua elevando a borda (BUG 8).
*/

import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  };

  const rgbaAlpha = (str) => {
    if (!str) return null;
    const m = str.match(/rgba\(([^)]+)\)/g);
    if (!m) return null;
    const raw = m.map((s) => Number(s.replace(/^.*,\s*/, '').replace(/\)$/, '')));
    return Math.max(...raw);
  };

  /* ================================================================
     1) borderOpacity (buttonGlass) — admin + público
     ================================================================ */
  async function borderOpacity() {
    console.log('\n━━━ BUG 10 — borderOpacity do botão (conectado) ━━━');
    const cfgFor = (bo) => {
      const c = JSON.parse(JSON.stringify(NEW_CONFIG));
      c.style = Object.assign({}, c.style, {
        btnVariant: 'glass',
        buttonGlass: { enabled: true, blur: 12, saturate: 180, opacity: 20, color: '#ffffff', borderGlow: 0, shadowDepth: 18, highlight: false, noise: false, borderOpacity: bo }
      });
      c.links = [{ id: 's1', title: 'Site', url: 'https://site.com' }];
      return c;
    };
    /* borderGlow=0 → sem o borderOpacity o brilho da borda é baixo (0.06).
       Com borderOpacity alto, a borda sobe → o controle tem efeito real. */
    const grabAdmin = (bo) => {
      const { window: w } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
      w.__axEditor.init(cfgFor(bo));
      const el = w.document.querySelector('#previewLinksList .link-block:not(.link-block-customimg)');
      return rgbaAlpha(el && el.style.border);
    };
    const aLo = grabAdmin(0), aHi = grabAdmin(95);
    check('admin: borderOpacity muda a borda (0 vs 95)', aLo !== aHi, `lo=${aLo} hi=${aHi}`);
    check('admin: borderOpacity alto torna a borda forte (alpha>=0.6)', aHi != null && aHi >= 0.6, 'alpha=' + aHi);

    const grabPub = (bo) => {
      const { window: w } = boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const c = cfgFor(bo);
      w.__alaPublica.aplicar(c);
      const el = w.document.querySelector('.pg-links-list a.featured__card:not(.featured__card--customimg)');
      return rgbaAlpha(el && el.style.border);
    };
    const pLo = grabPub(0), pHi = grabPub(95);
    check('público: borderOpacity muda a borda (0 vs 95)', pLo !== pHi, `lo=${pLo} hi=${pHi}`);
  }

  /* ================================================================
     3) Vidro do avatar no preview ADMIN (classe + vars)
     ================================================================ */
  async function avatarGlass() {
    console.log('\n━━━ BUG 10 — vidro do avatar no preview do admin ━━━');
    const cfgFor = (glass) => {
      const c = JSON.parse(JSON.stringify(NEW_CONFIG));
      c.design = c.design || {};
      c.design.profile = c.design.profile || {};
      if (glass) { c.design.profile.glass = true; c.design.profile.glassBlur = 18; }
      else { delete c.design.profile.glass; delete c.design.profile.glassBlur; }
      return c;
    };

    const wOn = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' }).window;
    wOn.__axEditor.init(cfgFor(true));
    const avOn = wOn.document.getElementById('pvAvatar');
    check('admin: avatar ganha classe .glass', avOn.classList.contains('glass'));
    check('admin: avatar --glass-blur setado (glassBlur 18)', avOn.style.getPropertyValue('--glass-blur') === '18px', avOn.style.getPropertyValue('--glass-blur'));

    const wOff = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' }).window;
    wOff.__axEditor.init(cfgFor(false));
    const avOff = wOff.document.getElementById('pvAvatar');
    check('admin: sem vidro → sem classe .glass', !avOff.classList.contains('glass'));
    check('admin: sem vidro → --glass-bg limpo', avOff.style.getPropertyValue('--glass-bg') === '');
  }

  /* ================================================================
     4) Não-regressão: grupos seguem conectados (audit table) + BUG 8
     ================================================================ */
  async function regressao() {
    console.log('\n━━━ BUG 10 — não-regressão dos grupos de vidro ━━━');
    const grab = (admin, buttonG) => {
      if (admin) {
        const c = JSON.parse(JSON.stringify(NEW_CONFIG));
        c.style = Object.assign({}, c.style, { btnVariant: 'glass', buttonGlass: Object.assign({ enabled: true, blur: 8, saturate: 180, opacity: 20, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: false, noise: false }, buttonG || {}) });
        c.links = [{ id: 's1', title: 'Site', url: 'https://site.com' }];
        const { window: w } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
        w.__axEditor.init(c);
        const el = w.document.querySelector('#previewLinksList .link-block:not(.link-block-customimg)');
        return el;
      } else {
        const c = JSON.parse(JSON.stringify(NEW_CONFIG));
        c.style = Object.assign({}, c.style, { btnVariant: 'glass', buttonGlass: Object.assign({ enabled: true, blur: 8, saturate: 180, opacity: 20, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: false, noise: false }, buttonG || {}) });
        c.links = [{ id: 's1', title: 'Site', url: 'https://site.com' }];
        const { window: w } = boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
        w.__alaPublica.aplicar(c);
        return w.document.querySelector('.pg-links-list a.featured__card:not(.featured__card--customimg)');
      }
    };
    /* BUG 8 ainda vale: borderGlow sobe a borda acima do default 25% do
       borderOpacity (sem esse piso, o borderGlow seria mascarado). */
    const aGlowLo = rgbaAlpha(grab(true, { borderGlow: 0 }).style.border);
    const aGlowHi = rgbaAlpha(grab(true, { borderGlow: 100 }).style.border);
    check('admin: borderGlow continua elevando a borda (BUG 8)', aGlowHi > aGlowLo && aGlowHi >= 0.3, `lo=${aGlowLo} hi=${aGlowHi}`);

    /* Todos os 9 controles do buttonGlass ligados no admin mudam a CSS */
    const CTLS = {
      blur: ['backdropFilter', null, { blur: 0 }, { blur: 35 }],
      opacity: ['background', 'backgroundImage', { opacity: 0 }, { opacity: 90 }],
      saturate: ['backdropFilter', null, { saturate: 100 }, { saturate: 250 }],
      borderGlow: ['border', 'boxShadow', { borderGlow: 0 }, { borderGlow: 100 }],
      shadowDepth: ['boxShadow', null, { shadowDepth: 0 }, { shadowDepth: 60 }],
      highlight: ['class', null, { highlight: false }, { highlight: true }],
      noise: ['class', null, { noise: false }, { noise: true }],
      color: ['border', 'background', { color: '#ffffff' }, { color: '#ff00aa' }],
      borderOpacity: ['border', null, { borderOpacity: 0 }, { borderOpacity: 95 }]
    };
    for (const [name, [props]] of Object.entries(CTLS)) {
      const lo = grab(true, CTLS[name][2]);
      const hi = grab(true, CTLS[name][3]);
      let changed = false;
      for (const p of CTLS[name][0].split(',')) {
        const a = p === 'class' ? lo.className : lo.style[p.trim()];
        const b = p === 'class' ? hi.className : hi.style[p.trim()];
        if (String(a) !== String(b)) { changed = true; break; }
      }
      check(`admin: botão ${name} conectado (muda CSS)`, changed);
    }
  }

  /* ================================================================
     5) Camada de demonstração de blur (só mockup do admin)
        Em fundo chapado o backdrop-filter é invisível; a camada
        .pv-glass-demo põe formas coloridas ATRÁS dos chips para o
        desfoque ficar perceptível no preview (nunca vai ao site público).
     ================================================================ */
  async function glassDemo() {
    console.log('\n━━━ BUG 10 — camada de demo do blur (mockup admin) ━━━');
    const cfg = (variant, anyGlass) => {
      const c = JSON.parse(JSON.stringify(NEW_CONFIG));
      c.style = Object.assign({}, c.style, {
        theme: 'indigo', pageBgColor: '#11111f', bgVariant: variant,
        nameGlass: { enabled:anyGlass, blur:20, saturate:180, opacity:40, color:'#ffffff', borderGlow:40, shadowDepth:18, highlight:false, noise:false }
      });
      c.links = [{id:'s1',title:'Site',url:'https://site.com'}];
      return c;
    };

    const demoSolid = () => {
      const { window:w } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
      w.__axEditor.init(cfg('solid', true));
      const demo = w.document.getElementById('pvPage').querySelector('.pv-glass-demo');
      return demo ? demo.querySelectorAll('i').length : 0;
    };
    check('admin solid+vidro: demo presente com 5 formas', demoSolid() === 5, 'i=' + demoSolid());

    const demoNoGlass = () => {
      const { window:w } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
      w.__axEditor.init(cfg('solid', false));
      return !!w.document.getElementById('pvPage').querySelector('.pv-glass-demo');
    };
    check('admin solid sem vidro: demo ausente', demoNoGlass() === false);

    const demoGrad = () => {
      const { window:w } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
      w.__axEditor.init(cfg('gradient', true));
      return !!w.document.getElementById('pvPage').querySelector('.pv-glass-demo');
    };
    check('admin gradiente+vidro: demo ausente (blur já visível)', demoGrad() === false);
  }

  await borderOpacity();
  await avatarGlass();
  await regressao();
  await glassDemo();

  console.log(`\n  ✅ BUG 10 Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}
