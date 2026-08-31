import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

// Comprehensive control-to-CSS audit for the 6 glass groups.
// Sets per-group prerequisites so elements actually render.

const GROUPS = [
  { key: 'nameGlass', adminSel: () => 'pvName', pubSel: () => 'pgTitle', hasBorderOpacity: false, prep: null },
  { key: 'bioGlass', adminSel: () => 'pvBio', pubSel: () => 'pgSubtitle', hasBorderOpacity: false, prep: null },
  { key: 'addressGlass', adminSel: () => 'pvAddress', pubSel: () => 'pgAddress', hasBorderOpacity: false, prep: null },
  { key: 'bannerGlass', adminSel: () => '.pv-banner-overlay', pubSel: () => '#pgBannerOverlay', hasBorderOpacity: false,
    prep: (c) => { c.style.bannerOverlayTitle = 'T'; c.style.bannerOverlayCta = 'C'; c.style.bannerOverlayCtaUrl = 'https://x.com'; } },
  { key: 'buttonGlass', adminSel: () => '#previewLinksList .link-block:not(.link-block-customimg)', pubSel: () => '.pg-links-list a.featured__card:not(.featured__card--customimg)', hasBorderOpacity: true,
    prep: (c) => { c.style.btnVariant = 'glass'; } },
  { key: 'iconGlass', adminSel: () => '.quick-item .quick-thumb', pubSel: () => '.quick-grid .featured__card', hasBorderOpacity: false,
    prep: (c) => { c.quick = [{ label: 'Instagram', url: 'https://ig.com', icon: 'instagram' }]; c.quickLinksStyle = Object.assign({}, c.quickLinksStyle, { background: 'glass' }); } },
];

function buildConfig(key, values, prep) {
  const c = JSON.parse(JSON.stringify(NEW_CONFIG));
  c.style = Object.assign({}, c.style || {});
  c.style[key] = Object.assign({ enabled: true, blur: 20, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 25 }, values);
  c.links = [{ id: 's1', title: 'Site', url: 'https://site.com' }];
  if (prep) prep(c);
  return c;
}

const LO = { blur: 0, opacity: 0, saturate: 100, borderGlow: 0, shadowDepth: 0, highlight: 0, noise: 0, color: '#ffffff', borderOpacity: 0 };
const HI = { blur: 35, opacity: 90, saturate: 260, borderGlow: 100, shadowDepth: 60, highlight: 1, noise: 1, color: '#ff00aa', borderOpacity: 95 };
const CSS_PROPS = {
  blur: ['backdropFilter', 'webkitBackdropFilter'],
  opacity: ['background', 'backgroundImage'],
  saturate: ['backdropFilter', 'webkitBackdropFilter'],
  borderGlow: ['border', 'boxShadow'],
  shadowDepth: ['boxShadow'],
  highlight: ['class'],
  noise: ['class'],
  color: ['background', 'backgroundImage', 'border'],
  borderOpacity: ['border'],
};

function grabEl(w, sel) {
  if (typeof sel === 'string') return w.document.getElementById(sel) || w.document.querySelector(sel);
  return null;
}
function snap(el, prop) {
  if (!el) return '(no el)';
  if (prop === 'class') return el.className;
  let v = el.style[prop];
  if (prop === 'border' && !v) v = el.style.borderColor || el.style.borderTopColor;
  if (prop === 'webkitBackdropFilter' && !v) v = el.style['-webkit-backdrop-filter'];
  return v == null ? '' : String(v);
}

function changed(elLo, elHi, props) {
  if (!elLo || !elHi) return { changed: true, detail: '(no el)' };
  for (const p of props) {
    const a = snap(elLo, p), b = snap(elHi, p);
    if (a !== b) return { changed: true, detail: p + ' ' + JSON.stringify(a) + ' -> ' + JSON.stringify(b) };
  }
  return { changed: false, detail: '' };
}

async function audit(which, group) {
  const out = {};
  for (const cname of Object.keys(LO)) {
    if (cname === 'borderOpacity' && !group.hasBorderOpacity) continue;
    const loCfg = buildConfig(group.key, { [cname]: LO[cname] }, group.prep);
    const hiCfg = buildConfig(group.key, { [cname]: HI[cname] }, group.prep);
    if (which === 'admin') {
      const wLo = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' }).window; wLo.__axEditor.init(loCfg);
      const wHi = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' }).window; wHi.__axEditor.init(hiCfg);
      out[cname] = changed(grabEl(wLo, group.adminSel()), grabEl(wHi, group.adminSel()), CSS_PROPS[cname]);
    } else {
      const wLo = boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' }).window; wLo.__alaPublica.aplicar(loCfg);
      const wHi = boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' }).window; wHi.__alaPublica.aplicar(hiCfg);
      out[cname] = changed(grabEl(wLo, group.pubSel()), grabEl(wHi, group.pubSel()), CSS_PROPS[cname]);
    }
  }
  return out;
}

const rows = [];
for (const g of GROUPS) {
  const adm = await audit('admin', g);
  const pub = await audit('public', g);
  for (const cname of Object.keys(LO)) {
    if (cname === 'borderOpacity' && !g.hasBorderOpacity) continue;
    const awiring = adm[cname].changed, pwiring = pub[cname].changed;
    rows.push({ group: g.key, ctl: cname, admin: awiring, pub: pwiring, detail: (!awiring?'A-DISC':'')+(awiring?('(A)'+adm[cname].detail):'') + ' ' + (!pwiring?'P-DISC':'')+(pwiring?('(P)'+pub[cname].detail):'') });
  }
}

process.stderr.write('\n========== GLASS AUDIT RESULT ==========\n');
process.stderr.write('GROUP|CTL|ADMIN_WIRED|PUBLIC_WIRED|DETAIL\n');
for (const r of rows) {
  const flag = (!r.admin || !r.pub) ? '  <-- DISCONNECT' : '';
  process.stderr.write(`${r.group}|${r.ctl}|${r.admin}|${r.pub}|${r.detail}${flag}\n`);
}
process.exit(0);
