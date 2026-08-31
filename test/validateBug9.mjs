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
    const m = String(str).match(/rgba\(([^)]+)\)/g);
    if (!m) return null;
    const raw = m.map((s) => Number(s.replace(/^.*,\s*/, '').replace(/\)$/, '')));
    return Math.max(...raw);
  };
  const rgbaHasColor = (str, frag) => (String(str || '').indexOf(frag) >= 0);

  function cfgFor(glasses) {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.style = Object.assign({}, c.style || {}, glasses);
    return c;
  }

  const CHIPS = [
    { id: 'name',    adminId: 'pvName',    glass: 'nameGlass',    tint: '#ff8800', frag: 'rgba(255,136,0' },
    { id: 'bio',     adminId: 'pvBio',     glass: 'bioGlass',     tint: '#22cc88', frag: 'rgba(34,204,136' },
    { id: 'address', adminId: 'pvAddress', glass: 'addressGlass', tint: '#4488ff', frag: 'rgba(68,136,255' }
  ];
  const GLASSES = {};
  for (const ch of CHIPS) GLASSES[ch.glass] = { enabled: true, blur: 30, saturate: 180, opacity: 70, color: ch.tint, borderGlow: 40, shadowDepth: 18, highlight: true, noise: false };

  /* ---- ADMIN mockup (pvName/pvBio/pvAddress) ---- */
  console.log('\n━━━ BUG 9 admin mockup: vidro perceptível em fundo chapado ━━━');
  {
    const c = cfgFor(GLASSES);
    const { window: w } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    w.__axEditor.init(c);
    for (const ch of CHIPS) {
      const el = w.document.getElementById(ch.adminId);
      check(`admin ${ch.id}: backdrop blur presente`, /blur\(\d+px\)/.test(el.style.backdropFilter || ''), String(el.style.backdropFilter));
      check(`admin ${ch.id}: preenchimento translúcido mantido (cor ${ch.glass})`, rgbaHasColor(el.style.backgroundImage || el.style.background, ch.frag), (el.style.backgroundImage || '').slice(0, 46));
      const a = rgbaAlpha(el.style.backgroundImage || el.style.background);
      check(`admin ${ch.id}: preenchimento perceptível (alpha>=0.4)`, a != null && a >= 0.4, 'alpha=' + a);
    }
    /* Mesh sutil atrás do vidro (fundo chapado): dá textura ao blur */
    const pv = w.document.getElementById('pvPage');
    const pvMesh = String(pv.style.backgroundImage || '').indexOf('radial-gradient') >= 0;
    const pvSolidKept = /rgb\(17, 17, 31\)/.test(String(pv.style.backgroundColor));
    check('admin pvPage: mesh atrás do vidro (blur tem textura)', pvMesh, String(pv.style.backgroundImage).slice(0, 50));
    check('admin pvPage: cor sólida escolhida mantida', pvSolidKept, String(pv.style.backgroundColor));
  }

  /* ---- PÚBLICO: pgTitle/pgSubtitle/pgAddress ---- */
  console.log('\n━━━ BUG 9 público: vidro perceptível em fundo chapado ━━━');
  {
    const c = cfgFor(GLASSES);
    const row = { config: NEW_CONFIG, slug: 'teste' };
    const { window: w } = boot(INDEX_PATH, { supabase: supabaseStub(row), url: 'https://axiumlink.test/?s=teste' });
    w.__alaPublica.aplicar(c);
    const pubId = { name: 'pgTitle', bio: 'pgSubtitle', address: 'pgAddress' };
    for (const ch of CHIPS) {
      const el = w.document.getElementById(pubId[ch.id]);
      if (!el) { check(`público ${ch.id}: chip presente`, false, 'elemento não encontrado'); continue; }
      const style = el.style;
      check(`público ${ch.id}: backdrop blur presente`, /blur\(\d+px\)/.test(style.backdropFilter || style.webkitBackdropFilter || ''), String(style.backdropFilter || ''));
      const bg = style.backgroundImage || style.background || '';
      check(`público ${ch.id}: preenchimento translúcido mantido (cor ${ch.glass})`, rgbaHasColor(bg, ch.frag), bg.slice(0, 46));
      const a = rgbaAlpha(bg);
      check(`público ${ch.id}: preenchimento perceptível (alpha>=0.4)`, a != null && a >= 0.4, 'alpha=' + a);
    }
    /* Mesh atrás do vidro no body (fundo chapado) */
    const bodyMesh = String(w.document.body.style.backgroundImage || '').indexOf('radial-gradient') >= 0;
    check('público body: mesh atrás do vidro (blur tem textura)', bodyMesh, String(w.document.body.style.backgroundImage).slice(0, 50));
  }

  /* ---- Sem vidro: baseline limpo (não inventa cor) ---- */
  console.log('\n━━━ BUG 9 baseline: sem vidro, chip limpo ━━━');
  {
    const row = { config: NEW_CONFIG, slug: 'teste' };
    const { window: w } = boot(INDEX_PATH, { supabase: supabaseStub(row), url: 'https://axiumlink.test/?s=teste' });
    w.__alaPublica.aplicar(NEW_CONFIG);
    const el = w.document.getElementById('pgTitle');
    const bg = (el && (el.style.backgroundImage || el.style.background)) || '';
    check('público pgTitle sem vidro: sem background inventado', !bg, bg.slice(0, 30));
    const bodyMesh = String(w.document.body.style.backgroundImage || '').indexOf('radial-gradient') >= 0;
    check('público body sem vidro: sem mesh atrás (fundo limpo)', !bodyMesh, String(w.document.body.style.backgroundImage).slice(0, 40));
  }

  console.log(`  ✅ BUG 9 Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}
