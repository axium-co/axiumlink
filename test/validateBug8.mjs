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

  function cfgFor(theme, glass) {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.style = Object.assign({}, c.style || {}, {
      theme,
      btnVariant: 'glass',
      buttonGlass: Object.assign({ enabled: true, blur: 8, saturate: 180, opacity: 20, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: false, noise: false }, glass || {})
    });
    c.links = [{ id: 's1', title: 'Site', url: 'https://site.com' }];
    return c;
  }

  const CONTROLS = {
    borderGlow: { prop: 'border', probe: (el) => rgbaAlpha(el.style.border), label: 'BorderGlow (borda)' },
    shadowDepth: { prop: 'boxShadow', probe: (el) => rgbaAlpha(el.style.boxShadow), label: 'Shadow (sombra)' },
    saturate: { prop: 'backdropFilter', probe: (el) => el.style.backdropFilter || '', label: 'Saturate' },
    color: { prop: 'background', probe: (el) => el.style.background || '', label: 'Color (tint)' },
    highlight: { prop: 'highlight', probe: (el) => el.classList.contains('gx-highlight'), label: 'Highlight (reflexo)' },
    noise: { prop: 'noise', probe: (el) => el.classList.contains('gx-noise'), label: 'Noise (ruído)' }
  };

  /* ---- ADMIN: botão (applyGlass via applyGlassToElements) ---- */
  async function adminButton(theme) {
    console.log(`\n━━━ BUG 8 admin botão (fundo: ${theme}) ━━━`);
    const grab = (glass) => {
      const { window: w } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
      w.__axEditor.init(cfgFor(theme, glass));
      const el = w.document.querySelector('#previewLinksList .link-block:not(.link-block-customimg)');
      const s = {};
      for (const key of Object.keys(CONTROLS)) s[key] = CONTROLS[key].probe(el);
      return s;
    };
    testControlStream('admin-button', theme, grab);
  }

  /* ---- PÚBLICO: botão (buildBtn glass) ---- */
  async function publicButton(theme) {
    console.log(`\n━━━ BUG 8 público botão (fundo: ${theme}) ━━━`);
    const grab = (glass) => {
      const { window: w } = boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
      const c = cfgFor(theme, glass);
      w.__alaPublica.aplicar(c);
      const el = w.document.querySelector('.pg-links-list a.featured__card:not(.featured__card--customimg)');
      const s = {};
      for (const key of Object.keys(CONTROLS)) s[key] = CONTROLS[key].probe(el);
      return s;
    };
    testControlStream('public-button', theme, grab);
  }

  function testControlStream(tag, theme, grab) {
    // valor baixo
    const lo = grab({ borderGlow: 0, shadowDepth: 0, saturate: 100, color: '#ffffff', highlight: false, noise: false });
    // valor alto
    const hi = grab({ borderGlow: 100, shadowDepth: 60, saturate: 250, color: '#ff8800', highlight: true, noise: true });

    for (const key of Object.keys(CONTROLS)) {
      const c = CONTROLS[key];
      let changed = false;
      if (key === 'highlight' || key === 'noise') changed = lo[key] !== hi[key];
      else changed = String(lo[key]) !== String(hi[key]);
      check(`${tag} [${theme}] ${c.label} conectado (muda CSS)`, changed, `lo=${JSON.stringify(lo[key])} hi=${JSON.stringify(hi[key])}`);

      if (key === 'shadowDepth') {
        check(`${tag} [${theme}] efeito shadow perceptível (alpha>=0.2 no alto)`, hi.shadowDepth != null && hi.shadowDepth >= 0.2, 'alpha=' + hi.shadowDepth);
      }
      if (key === 'borderGlow') {
        check(`${tag} [${theme}] efeito borda perceptível (alpha>=0.3 no alto)`, hi.borderGlow != null && hi.borderGlow >= 0.3, 'alpha=' + hi.borderGlow);
      }
    }
  }

  for (const theme of ['dark', 'light']) {
    await adminButton(theme);
    await publicButton(theme);
  }

  console.log(`  ✅ BUG 8 Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}
