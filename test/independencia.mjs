/* Validação headless da separação completa de personalização por elemento.

   1) ADMIN: para cada elemento (nome/bio/endereco/avatar) muta a config DELE
      e prova que (a) aplica no preview, (b) os OUTROS 3 (config + DOM) ficam
      intactos.
   2) PÚBLICO: mesma prova na página pública via payloads variantes.
   3) MIGRAÇÃO: com um config 100% legado (global), prova que cada um dos 4
      elementos herdou os valores globais como ponto de partida.

   Uso: node test/independencia.mjs [--admin|--public|--migracao]
*/

import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import {
  LEGACY_CONFIG, NEW_CONFIG, ELEM_KEYS, TEST_VALUES, GLASS_OF, TEST_GLASS
} from './fixtures.mjs';
import { run as runBug6 } from './validateBug6.mjs';
import { run as runBug7 } from './validateBug7.mjs';

let failures = 0;
const only = process.argv[2] || '';
const log = (...a) => console.log(...a);

function ok(cond, msg) {
  log(cond ? '   ✅ ' + msg : '   ❌ ' + msg);
  if (!cond) failures++;
}

/* ================================================================
   ADMIN
   ================================================================ */
async function adminElemento(key) {
  log('\n━━━ [ADMIN] Independência do elemento: ' + key.toUpperCase() + ' ━━━');
  const { window, errors } = await boot(ADMIN_PATH, {
    supabase: supabaseStub(null),
    url: 'https://axiumlink.test/admin.html'
  });
  if (errors.length) {
    failures++;
    log('   ❌ Erros de boot:', errors.map((e) => String(e && e.message || e)).join(' | '));
    return;
  }
  window.__axEditor.init(NEW_CONFIG);
  const r = window.__espelhoIndependencia(key);
  r.checks.forEach((c) => ok(c.ok, c.label));
}

/* ================================================================
   PÚBLICO
   ================================================================ */
async function publicoElemento(key) {
  log('\n━━━ [PÚBLICO] Independência do elemento: ' + key.toUpperCase() + ' ━━━');
  const row = { config: NEW_CONFIG, slug: 'teste' };
  const { window, errors } = await boot(INDEX_PATH, {
    supabase: supabaseStub(row),
    url: 'https://axiumlink.test/?s=teste'
  });
  if (errors.length) {
    failures++;
    log('   ❌ Erros de boot:', errors.map((e) => String(e && e.message || e)).join(' | '));
    return;
  }
  const r = window.__alaPublica.espelho(NEW_CONFIG, key);
  ok(r.targetApplied, 'config do ' + key.toUpperCase() + ' aparece na página pública' + (r.deltaKeys && r.deltaKeys.length ? ' (delta: ' + r.deltaKeys.join(', ') + ')' : ''));
  r.others.forEach((o) => ok(o.ok, o.label));
}

/* ================================================================
   MIGRAÇÃO (legado global → por elemento)
   ================================================================ */
const EXPECTED_MIGRATION = {
  name: { font: 'Syne', size: 26, weight: 800, ls: 1, lh: 1.3, color: '#dc2626', align: 'right', bg: '', radius: 10, padding: [4, 14] },
  bio: { font: 'Lora', size: 15, weight: 500, ls: 0, lh: 1.6, color: '#334155', align: 'left', bg: '', radius: 10, padding: [4, 14] },
  address: { font: 'Montserrat', size: 13, weight: 700, ls: 0, lh: 1.4, color: '#ffffff', align: 'center', bg: '#0c0e16', radius: 20, padding: [8, 16] },
  avatar: {
    size: 112, shape: 'rounded', radius: 26,
    borderStyle: 'solid', borderWidth: 5, borderColor: '#ffcc00',
    shadowOn: true, shadowX: 0, shadowY: 10, shadowBlur: 28, shadowSpread: -6, shadowColor: '#000000', shadowAlpha: 45,
    glowOn: false, glowColor: '', glowIntensity: 35
  }
};

async function migracaoAdmin() {
  log('\n━━━ [ADMIN] Migração: config global legado → elementos separados ━━━');
  const { window, errors } = await boot(ADMIN_PATH, {
    supabase: supabaseStub(null),
    url: 'https://axiumlink.test/admin.html'
  });
  if (errors.length) { failures++; log('   ❌ Erros de boot:', errors.join(' | ')); return; }
  window.__axEditor.init(LEGACY_CONFIG);
  const got = window.__migracaoAdmin();
  ELEM_KEYS.forEach((k) => {
    log('   ▪ ' + k.toUpperCase() + ':');
    const exp = EXPECTED_MIGRATION[k];
    Object.keys(exp).forEach((prop) => {
      const a = JSON.stringify(got[k] && got[k][prop]);
      const b = JSON.stringify(exp[prop]);
      ok(a === b, k + '.' + prop + ' = ' + a + ' (esperado ' + b + ')');
    });
  });
}

const EXPECTED_PUBLIC_TITLE = {
  'font-family': '"Syne", system-ui, sans-serif',
  'font-size': '26px',
  'font-weight': '800',
  'letter-spacing': '1px',
  'line-height': '1.3',
  color: 'rgb(220, 38, 38)',
  'text-align': 'right'
};

async function migracaoPublica() {
  log('\n━━━ [PÚBLICO] Migração: Nome herdado do legado aplicado na página ━━━');
  const row = { config: LEGACY_CONFIG, slug: 'teste' };
  const { window, errors } = await boot(INDEX_PATH, {
    supabase: supabaseStub(row),
    url: 'https://axiumlink.test/?s=teste'
  });
  if (errors.length) { failures++; log('   ❌ Erros de boot:', errors.join(' | ')); return; }
  if (window.__alaPublica.ready) await window.__alaPublica.ready;
  const dom = window.__alaPublica.dom('#pgTitle');
  Object.keys(EXPECTED_PUBLIC_TITLE).forEach((prop) => {
    const got = dom && dom[prop];
    ok(got === EXPECTED_PUBLIC_TITLE[prop], 'pgTitle.' + prop + ' = ' + JSON.stringify(got) + ' (esperado ' + JSON.stringify(EXPECTED_PUBLIC_TITLE[prop]) + ')');
  });
}

async function publicoVidros() {
  log('\n━━━ [PÚBLICO] Cores dos vidros (name/bio/address) chegam na página ━━━');
  const row = { config: NEW_CONFIG, slug: 'teste' };
  const { window, errors } = await boot(INDEX_PATH, {
    supabase: supabaseStub(row),
    url: 'https://axiumlink.test/?s=teste'
  });
  if (errors.length) { failures++; log('   ❌ Erros de boot:', errors.join(' | ')); return; }
  window.__alaPublica.aplicar(NEW_CONFIG);
  const before = window.__alaPublica.dom('#pgTitle');
  ok(before && !(before['background']), '#pgTitle sem vidro no baseline (adaptNewSchema não inventa cor)');

  const c = JSON.parse(JSON.stringify(NEW_CONFIG));
  c.style = c.style || {};
  c.style.nameGlass = { enabled: true, opacity: 30, color: '#00aa77' };
  c.style.bioGlass = { enabled: true, opacity: 30, color: '#aa3300' };
  c.style.addressGlass = { enabled: true, opacity: 30, color: '#4400ff' };
  c.design.profile.elem.name.align = 'right';
  c.design.profile.elem.bio.align = 'left';
  c.design.profile.elem.address.align = 'left';
  window.__alaPublica.aplicar(c);

  [
    ['#pgTitle', 'rgba(0,170,119', 'nameGlass #00aa77'],
    ['#pgSubtitle', 'rgba(170,51,0', 'bioGlass #aa3300'],
    ['#pgAddress', 'rgba(68,0,255', 'addressGlass #4400ff']
  ].forEach(([sel, frag, label]) => {
    const s = window.__alaPublica.dom(sel);
    const bg = (s && (s['background-image'] || s['background'])) || '';
    ok(bg.indexOf(frag) >= 0, sel + ' usa ' + label + ' (background contém ' + frag + '…) — ' + bg.slice(0, 40));
  });

  const norm = (v) => { if (v === 'auto') return 'auto'; if (!v) return ''; const nv = parseFloat(v); return (nv === 0 || v === '0') ? '0' : v; };
  const isLeftBlk = (s) => norm(s && s['margin-left']) === '0' && norm(s && s['margin-right']) === 'auto';
  const isRightBlk = (s) => norm(s && s['margin-left']) === 'auto' && norm(s && s['margin-right']) === '0';
  ok(isLeftBlk(window.__alaPublica.dom('#pgSubtitle')), '#pgSubtitle align=left -> bloco à esquerda (ml=0, mr=auto)');
  const nRow = window.__alaPublica.dom('.profile__name-row');
  ok(nRow && nRow['justify-content'] === 'flex-end', '#pgTitle align=right -> .profile__name-row justify-content flex-end');
  const nSt = window.__alaPublica.dom('#pgTitle');
  ok(nSt && norm(nSt['margin-left']) === '' && norm(nSt['margin-right']) === '', '#pgTitle sem margens auto (row move nome+selo juntos)');
  ok(isLeftBlk(window.__alaPublica.dom('#pgSubtitle')), '#pgSubtitle align=left -> bloco à esquerda (ml=0, mr=auto)');
  const addrAl = window.__alaPublica.dom('#pgAddress');
  ok(addrAl && addrAl['align-self'] === 'flex-start', '#pgAddress align=left -> align-self flex-start (flex-column .profile__info)');

  const c2 = JSON.parse(JSON.stringify(NEW_CONFIG));
  c2.style = c2.style || {};
  c2.design.profile.elem.bio.align = 'left';
  c2.design.profile.elem.name.align = 'right';
  c2.design.profile.elem.address.align = 'center';
  window.__alaPublica.aplicar(c2);
  const bio2 = window.__alaPublica.dom('#pgSubtitle');
  ok(bio2 && bio2['text-align'] === 'left', '#pgSubtitle text-align=left mesmo sem chip (sem vidro)');
  const n2 = window.__alaPublica.dom('#pgTitle');
  ok(n2 && n2['text-align'] === 'right', '#pgTitle text-align=right mesmo sem chip (sem vidro)');
  const addr2 = window.__alaPublica.dom('#pgAddress');
  ok(addr2 && addr2['align-self'] === 'center', '#pgAddress align=center sem chip -> align-self center');
}

async function publicoVidrosExtras() {
  log('\n━━━ [PÚBLICO] Vidros: botão/ícone/banner aplicam cor na página ━━━');
  const casos = [
    {
      nome: 'botão (buttonGlass #102030)',
      sel: '.featured__card, .quick__item',
      frag: 'rgba(16,32,48,0.16)',
      make: () => {
        const c = JSON.parse(JSON.stringify(NEW_CONFIG));
        c.style = Object.assign({}, c.style, { btnVariant: 'glass', buttonGlass: { enabled: true, opacity: 16, color: '#102030' } });
        c.links = [{ id: 'l1', title: 'Meu site', url: 'https://exemplo.com' }];
        return c;
      }
    },
    {
      nome: 'ícone (iconGlass #224466)',
      sel: '.featured__card, .quick__item',
      frag: 'rgba(34,68,102,0.15)',
      make: () => {
        const c = JSON.parse(JSON.stringify(NEW_CONFIG));
        c.style = Object.assign({}, c.style, { iconGlass: { enabled: true, blur: 12, opacity: 15, color: '#224466' } });
        c.quickLinksStyle = { format: 'circle', background: 'glass', shadow: 'soft', borderColor: '' };
        c.quick = [{ label: 'Instagram', url: 'https://ig.com' }];
        return c;
      }
    }
  ];
  const row = { config: NEW_CONFIG, slug: 'teste' };
  const { window, errors } = await boot(INDEX_PATH, {
    supabase: supabaseStub(row),
    url: 'https://axiumlink.test/?s=teste'
  });
  if (errors.length) { failures++; log('   ❌ Erros de boot:', errors.join(' | ')); return; }
  for (const cso of casos) {
    window.__alaPublica.aplicar(cso.make());
    const snap = window.__alaPublica.dom(cso.sel);
    const bg = (snap && (snap['background-image'] || snap['background'])) || '';
    ok(bg.indexOf(cso.frag) >= 0, cso.nome + ' chega à página — ' + bg.slice(0, 40));
  }

  /* BANNER COM IMAGEM + VIDRO ATIVO: a imagem precisa ficar VIVA no
     #pgBanner e o vidro virar CHIP no overlay (espelho do mockup admin).
     Antes, o vidro era aplicado no #pgBanner e apagava a imagem. */
  log('\n━━━ [PÚBLICO] Banner: imagem + vidro (chip no overlay) ━━━');
  const cB = JSON.parse(JSON.stringify(NEW_CONFIG));
  cB.banner = 'https://exemplo.com/banner.jpg';
  cB.design = { banner: { enabled: true, bgType: 'image', image: 'https://exemplo.com/banner.jpg', height: 190, overlayTitle: 'Conheça a AXIUM' } };
  cB.style = Object.assign({}, cB.style, { bannerGlass: { enabled: true, blur: 20, opacity: 22, color: '#ff8800' } });
  window.__alaPublica.aplicar(cB);
  const bSnap = window.__alaPublica.dom('#pgBanner') || {};
  const oSnap = window.__alaPublica.dom('#pgBannerOverlay') || {};
  ok(/^url\(/.test(bSnap['background-image'] || ''), 'banner com vidro: imagem segue como background do #pgBanner');
  ok(String(bSnap._class || '').indexOf('gx-panel') < 0, 'banner com vidro: #pgBanner SEM vidro no próprio elemento');
  ok((oSnap['background-image'] || oSnap['background'] || '').indexOf('rgba(255,136,0,0.22)') >= 0, 'banner com vidro: chip de vidro aplicado no #pgBannerOverlay (rgba #ff8800)');
  ok(oSnap['border-radius'] === '14px' && oSnap['padding'] === '12px 16px', 'banner com vidro: overlay com raio 14px e padding 12 16 (espelho do admin)');
}

/* ================================================================
   LINKS — IMAGEM CUSTOMIZADA COMO BOTÃO (link.customButtonImage)
   A imagem inteira vira o botão no preview admin e na página pública;
   botão sem imagem continua com o design da plataforma.
   ================================================================ */
async function linksImagemCustomizada() {
  log('\n━━━ [ADMIN] Links: imagem customizada como botão (preview) ━━━');
  const CFG_A = JSON.parse(JSON.stringify(NEW_CONFIG));
  CFG_A.links = [
    { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site', iconAlign: 'left' },
    { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', customButtonImage: 'https://cdn.axium.test/btn-wa.png', customButtonHeight: 96 }
  ];
  const { window: wA, errors: errA } = await boot(ADMIN_PATH, {
    supabase: supabaseStub(null),
    url: 'https://axiumlink.test/admin.html'
  });
  if (errA.length) { failures++; log('   ❌ Erros de boot admin:', errA.join(' | ')); return; }
  wA.__axEditor.init(CFG_A);
  const dA = wA.document;
  ok(dA.querySelectorAll('#previewLinksList .link-block-customimg').length === 1, 'admin mockup: 1 botão com imagem customizada');
  ok((dA.querySelector('#previewLinksList .link-block-customimg img') || {}).getAttribute?.('src') === 'https://cdn.axium.test/btn-wa.png', 'admin mockup: <img src> = URL do botão');
  ok(dA.querySelectorAll('#previewLinksList .link-block:not(.link-block-customimg)').length === 1, 'admin mockup: botão normal continua como plataforma');
  ok(dA.querySelector('#previewLinksList .link-block-customimg').getAttribute('href') === 'https://wa.me/1', 'admin mockup: âncora leva para a URL do link');
  const cA = dA.querySelector('#previewLinksList .link-block-customimg');
  ok(cA && cA.className.indexOf('link-block') >= 0 && cA.style.getPropertyValue('--customimg-h') === '96px', 'admin mockup: altura customizada 96px aplicada via var');
  ok(dA.defaultView.getComputedStyle(cA.querySelector('img')).objectFit === 'cover', 'admin mockup: <img> preenche o botão com object-fit cover');

  log('\n━━━ [PÚBLICO] Links: imagem customizada como botão ━━━');
  const CFG_P = JSON.parse(JSON.stringify(NEW_CONFIG));
  CFG_P.links = [
    { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site', iconAlign: 'left' },
    { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', customButtonImage: 'https://cdn.axium.test/btn-wa.png', customButtonHeight: 120 },
    { id: 'l3', title: 'Vídeo', url: 'https://youtube.com/watch?v=abc', cardStyle: 'video', customButtonImage: 'https://cdn.axium.test/btn-vid.png' }
  ];
  const { window: wP } = await boot(INDEX_PATH, {
    supabase: supabaseStub({ config: CFG_P, slug: 'teste' }),
    url: 'https://axiumlink.test/?s=teste'
  });
  wP.__alaPublica.aplicar(CFG_P);
  const dP = wP.document;
  ok(dP.querySelectorAll('#pgLinks .featured__card').length === 3, 'público: 3 botões listados');
  ok(dP.querySelectorAll('.pg-links-list .featured__card--customimg').length === 2, 'público: 2 botões são imagem customizada');
  const ca = dP.querySelector('.pg-links-list .featured__card--customimg');
  ok(ca && ca.getAttribute('href') === 'https://wa.me/1', 'público: âncora da imagem leva para a URL do link');
  ok(ca && (ca.querySelector('img') || {}).getAttribute?.('src') === 'https://cdn.axium.test/btn-wa.png', 'público: <img src> = URL do botão');
  ok(ca && (ca.querySelector('img') || {}).getAttribute('loading') === 'lazy', 'público: imagem carregada com lazy');
  ok(ca && ca.className.indexOf('featured__card') >= 0 && ca.style.getPropertyValue('--customimg-h') === '120px', 'público: layout do botão padrão mantido + altura customizada 120px via var');
  const caImg = ca.querySelector('img');
  ok(dP.defaultView.getComputedStyle(caImg).objectFit === 'cover', 'público: <img> preenche o botão com object-fit cover');
  const vids = dP.querySelectorAll('.pg-links-list .featured__card--customimg');
  ok(vids.length >= 2 && vids[1].getAttribute('href') === 'https://youtube.com/watch?v=abc', 'público: vídeo com imagem vira botão clicável (âncora)');
  ok((vids[1].style.getPropertyValue('--customimg-h')) === '84px', 'público: default de altura 84px quando não definida');
  const norm = dP.querySelector('.pg-links-list a.featured__card:not(.featured__card--customimg)');
  ok(norm && norm.querySelector('.featured__icon') && norm.querySelector('.featured__body'), 'público: botão normal mantém ícone + texto da plataforma');
}

/* ================================================================
   Main
   ================================================================ */
async function main() {
  if (only === '--migracao') {
    await migracaoAdmin();
    await migracaoPublica();
  } else if (only === '--admin') {
    for (const k of ELEM_KEYS) await adminElemento(k);
  } else if (only === '--public') {
    for (const k of ELEM_KEYS) await publicoElemento(k);
    await publicoVidros();
    await publicoVidrosExtras();
    await linksImagemCustomizada();
  } else {
    for (const k of ELEM_KEYS) await adminElemento(k);
    for (const k of ELEM_KEYS) await publicoElemento(k);
    await migracaoAdmin();
    await migracaoPublica();
    await publicoVidros();
    await publicoVidrosExtras();
    await linksImagemCustomizada();
    failures += await runBug6();
    failures += await runBug7();
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(failures === 0 ? '🎉 TODOS OS TESTES PASSARAM' : ('❌ FALHAS: ' + failures));
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(failures === 0 ? 0 : 1);
}

main();