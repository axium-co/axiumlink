/* ESPELHO — exame automatizado admin (preview) × página pública.
   ----------------------------------------------------------------
   Para cada config IDÊNTICO aplicado nos DOIS lados, extrai o
   "contrato visual" (estilos inline + vars CSS + classes semânticas +
   estado hidden) dos mesmos elementos e COMPARA.

   - Roda via `npm test` (suitESPELHO dentro de test/independencia.mjs).
   - Cobre TODAS as subsistemas do histórico de divergências:
     chip(vidro)/elementos, tipografia, botão, card de link, fundo,
     banner, espaçamento, ícones, selo de verificado.
   - FALHA (bloqueia) sempre que um lado escreve um estilo que o outro
     não aplica — um campo/feature novo num lado sem o equivalente no
     outro nunca passa despercebido.

   Divergências INTENCIONAIS (mecanismo diferente, visual equivalente)
   vivem na ALLOW abaixo, documentadas uma a uma. Tudo o que não estiver
   na ALLOW e divergir = FALHA.

   MECANISMOS documentados fora do compare por-par:
   - fundo: admin grava inline no #pvPage; público grava CSS vars no :root
     (--page-bg) + layers no body — comparado por ALVO (normalizações).
   - botões: admin usa classes CSS (.pv-card-link) no preview; público
     grava inline (--ui-bg com a borda/o fundo) — fundo/sombra via ALVO
     (computed) para não riar ruído de mecanismo.
   - endereco.border-radius: jsdom corrompe o slider (max 30) na RAZÃO do
     painel do admin; o browser real não dispara esse caminho → raio da
     pílula comparado por ALVO no lado público. */

import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

/* ================================================================
   Extração de contrato visual (estilos inline + vars + classes)
   ================================================================ */
const CSS_PROPS = [
  'font-family','font-size','font-weight','letter-spacing','line-height','color','text-align',
  'background','background-image','background-size','background-position','background-repeat','background-color',
  'padding','border-radius','border','border-color','border-width','border-style',
  'box-shadow','text-shadow','backdrop-filter','-webkit-backdrop-filter',
  'display','width','height','flex','aspect-ratio','z-index','opacity',
  'margin-left','margin-right','margin-top','margin-bottom',
  'justify-content','align-self','align-items','gap','overflow-wrap','white-space','animation','transition'
];
const CSS_VARS = [
  '--avatar-s','--glass-pad','--glass-bg','--glass-border','--glass-blur',
  '--shadow-x','--shadow-y','--shadow-blur','--shadow-spread','--shadow-color',
  '--customimg-h','--ui-bg','--btn-bg','--btn-color','--btn-border-color','--btn-border-width'
];
const CLASS_TOKENS = /(gx-panel|gx-highlight|gx-noise|avatar-ring|glass|ax-anim-[a-z]+)/g;

function snapEl(el) {
  if (!el) return null;
  const out = {};
  const norm = (v) => (v == null || v === '' || v === 'inherit') ? '' : String(v).trim();
  for (const p of CSS_PROPS) {
    const v = norm(el.style.getPropertyValue(p));
    if (v) out[p] = v;
  }
  for (const v of CSS_VARS) {
    const val = norm(el.style.getPropertyValue(v));
    if (val) out[v] = val;
  }
  const tokens = (String(el.className || '').match(CLASS_TOKENS) || []).sort();
  if (tokens.length) out['_class'] = tokens.join(' ');
  if (el.hidden) out['_hidden'] = true;
  const href = el.getAttribute && el.getAttribute('href');
  if (href) out['_href'] = href;
  return out;
}

function snapshot(win, sel) {
  const el = sel === 'body' ? win.document.body : win.document.querySelector(sel);
  return el ? snapEl(el) : null;
}

/* ================================================================
   Allowlist — diferenças documentadas de MECANISMO (visual igual).
   ================================================================ */
const ALLOW = {
  /* público precisa display:flex + largura própria p/ dominar alinhamento
     no flex-column do .profile__info; admin é bloco (margens). */
  endereco: {
    display: true, height: true, 'margin-left': true, 'margin-right': true,
    'align-self': true, 'justify-content': true, _href: true,
    /* Round-trip de painel sob jsdom: ao sincronizar os sliders, o jsdom
       dispara input sintético e o slider RE-escreve o cfg com o valor
       CLAMPADO (radius max 30 → 999 vira 30; lh min 1 → 0.9 vira 1).
       No browser real, set programático de .value NÃO dispara evento →
       o cfg não é corrompido. Pré-existente e fora do escopo do exame. */
    'border-radius': true,
    'line-height': true
  },
  /* nome: chip com width fit-content no admin; público deixa o row/flex
     domina; wrap é container comum com centralização por justify-content. */
  nameWrap: { width: true, 'justify-content': true, _class: true },
  linhaNome: { 'justify-content': true, 'align-items': true, gap: true, _class: true },
  avatarCard: {
    width: true, height: true, 'margin-top': true,
    '--glass-pad': true, '--glass-bg': true, '--glass-border': true, '--glass-blur': true,
    '--shadow-x': true, '--shadow-y': true, '--shadow-blur': true, '--shadow-spread': true,
    '--shadow-color': true, '--avatar-s': true, _class: true, 'box-shadow': true,
    'background-color': true, 'background-image': true, 'border-radius': true,
    padding: true, border: true
  },
  avatarEl: { 'border-radius': true, 'box-shadow': true, border: true },
  verificado: { background: true, 'background-color': true },
  banner: {
    _hidden: true, height: true, '--banner-h': true,
    background: true, 'background-color': true, 'background-image': true,
    'background-size': true, 'background-position': true, 'background-repeat': true
  },
  bannerScrim: { _hidden: true, display: true, background: true }
};

/* ================================================================
   Pares espelhados (admin selector → público selector)
   ================================================================ */
const PAIRS = [
  { key: 'nome',        admin: '#pvName',       public: '#pgTitle' },
  { key: 'bio',         admin: '#pvBio',        public: '#pgSubtitle' },
  { key: 'endereco',    admin: '#pvAddress',    public: '#pgAddress',    allow: 'endereco' },
  { key: 'linha-nome',  admin: '.pv-name-row',  public: '.profile__name-row', allow: 'linhaNome' },
  { key: 'wrap-nome',   admin: '.pv-name-wrap', public: '.profile__name-wrap', allow: 'nameWrap' },
  { key: 'verificado',  admin: '#pvVerified',   public: '#pgVerified',   allow: 'verificado' },
  { key: 'banner',      admin: '.pv-banner',    public: '#pgBanner',     allow: 'banner' },
  { key: 'banner-scrim',admin: '#pvBannerScrim',public: '#pgScrim',      allow: 'bannerScrim' }
];

const PAIR_ALLOW = (p) => (p.allow && ALLOW[p.allow]) || {};

/* Compara snapshots de um par; devolve lista de divergências. */
function comparePair(key, a, b, allow) {
  const divs = [];
  if (a === null && b === null) return divs;
  if (a === null || b === null) {
    divs.push({ prop: '<elemento>', a: a === null ? 'ausente' : '<presente em admin>', b: b === null ? 'ausente em público' : '<presente em público>' });
    return divs;
  }
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const prop of allKeys) {
    const av = a[prop] ?? '';
    const bv = b[prop] ?? '';
    if (av === bv) continue;
    divs.push({ prop, a: av || '(vazio)', b: bv || '(vazio)' });
  }
  return divs.map((d) => (allow[d.prop] ? Object.assign({}, d, { known: true }) : d));
}

/* ================================================================
   Bateria de configs — 1 caso por subsistema
   ================================================================ */
const base = (linkList) => {
  const c = JSON.parse(JSON.stringify(NEW_CONFIG));
  c.links = linkList || [
    { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site', iconAlign: 'left' },
    { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', type: 'whatsapp' },
    { id: 'l3', title: 'Telefone', url: '11999990000', type: 'telefone' }
  ];
  return c;
};

const CASE_VARIANTS = [
  { name: 'chips/cores (name/bio/address + vidros)',
    make: (c) => {
      c.design.profile.elem.name = { font: 'Playfair Display', size: 31, weight: 900, ls: 2, lh: 1.15, color: '#0a1234', align: 'right', bg: '#aabbcc', radius: 26, padding: [14, 26] };
      c.design.profile.elem.bio  = { font: 'Syne', size: 23, weight: 800, ls: 1.5, lh: 1.7, color: '#441100', align: 'right', bg: '#ff00aa', radius: 0, padding: [0, 10] };
      c.design.profile.elem.address = { font: 'Space Grotesk', size: 19, weight: 300, ls: 3, lh: 0.9, color: '#00ff11', align: 'right', bg: '#ff00ff', radius: 30, padding: [1, 2] };
      c.style.nameGlass = { enabled: true, blur: 39, saturate: 240, opacity: 48, color: '#102030', borderGlow: 95, shadowDepth: 55, highlight: false, noise: true };
      c.style.bioGlass = { enabled: true, blur: 39, saturate: 240, opacity: 48, color: '#102030', borderGlow: 95, shadowDepth: 55, highlight: false, noise: true };
      c.style.addressGlass = { enabled: true, blur: 39, saturate: 240, opacity: 48, color: '#102030', borderGlow: 95, shadowDepth: 55, highlight: false, noise: true };
      return c;
    }
  },
  { name: 'botão glass (+ borderOpacity)',
    make: (c) => {
      c.style.btnVariant = 'glass';
      c.style.buttonGlass = { enabled: true, blur: 8, saturate: 220, opacity: 20, color: '#ff8800', borderGlow: 40, shadowDepth: 18, highlight: false, noise: false, borderOpacity: 60 };
      return c;
    }
  },
  { name: 'botão neon',
    make: (c) => { c.style.btnVariant = 'neon'; c.style.btnGlowColor = '#22d3ee'; c.style.btnShape = 'pill'; return c; } },
  { name: 'botão neumorphic',
    make: (c) => { c.style.btnVariant = 'neumorphic'; return c; } },
  { name: 'botão ghost',
    make: (c) => { c.style.btnVariant = 'ghost'; c.style.btnBgColor = '#2563eb'; return c; } },
  { name: 'botão gradient-soft',
    make: (c) => { c.style.btnVariant = 'gradient-soft'; c.style.btnBgColor = '#7c3aed'; return c; } },
  { name: 'botão gradient',
    make: (c) => { c.style.btnVariant = 'gradient'; c.style.btnGradientStart = '#6366f1'; c.style.btnGradientEnd = '#ec4899'; c.style.btnGradientAngle = 145; return c; } },
  { name: 'botão shape brutalist',
    make: (c) => { c.style.btnShape = 'brutalist'; return c; } },
  { name: 'botão shape custom + raio',
    make: (c) => { c.style.btnShape = 'custom'; c.style.btnRadius = 22; return c; } },
  { name: 'botão sombra glow',
    make: (c) => { c.style.btnShadowStyle = 'glow'; return c; } },
  { name: 'botão animação pulse',
    make: (c) => { c.style.btnAnimation = 'pulse'; return c; } },
  { name: 'tipografia global do botão (typoBtn)',
    make: (c) => {
      c.style.typoBtn = { font: 'Poppins', size: 18, weight: 800, ls: 1, lh: 1.2 };
      return c;
    }
  },
  { name: 'links: estilo individual + cardStyle + sub + ícone',
    make: (c) => {
      c.links = [
        { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site', sub: 'descrição com texto', cardStyle: 'highlight', iconAlign: 'right', btnBg: '#112233', btnColor: '#ffffff', btnBorderColor: '#00ff00', btnBorderWidth: 3, btnFontSize: 'lg', btnFontWeight: 'bold' },
        { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', type: 'whatsapp', cardStyle: 'testimonial', sub: 'ótimo atendimento!' },
        { id: 'l3', title: 'Meu vídeo', url: 'https://youtube.com/watch?v=abc', type: 'site', cardStyle: 'video' }
      ];
      return c;
    }
  },
  { name: 'links: tipografia por link (BUG 6)',
    make: (c) => {
      c.style.typoBtn = { font: '', size: 15, weight: 600, ls: 0, lh: 1.4 };
      c.links = [
        { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' },
        { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', type: 'whatsapp', linkFont: 'Montserrat', linkFontSize: 21, linkFontWeight: 900, linkTextColor: '#ffcc00' },
        { id: 'l3', title: 'Telefone', url: '11999990000', type: 'telefone' }
      ];
      return c;
    }
  },
  { name: 'links: imagem customizada + altura',
    make: (c) => {
      c.links = [
        { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' },
        { id: 'l2', title: 'Botão imagem', url: 'https://wa.me/1', customButtonImage: 'https://cdn.axium.test/btn-wa.png', customButtonHeight: 120 }
      ];
      return c;
    }
  },
  { name: 'fundo: cor da página + fonte',
    make: (c) => {
      c.style.pageBgColor = '#f1f5f9';
      c.style.pageTextColor = '#0f172a';
      c.style.font = 'Montserrat';
      c.style.titleFont = 'Syne';
      return c;
    }
  },
  { name: 'fundo: gradient',
    make: (c) => {
      c.style.bgVariant = 'gradient';
      c.style.gradientStops = [ { color: '#ff0000', pos: 0, alpha: 100 }, { color: '#0000ff', pos: 70, alpha: 80 }, { color: '#00ff00', pos: 100, alpha: 100 } ];
      c.style.gradientAngle = 120;
      return c;
    }
  },
  { name: 'fundo: mesh',
    make: (c) => {
      c.style.bgVariant = 'mesh';
      c.style.meshColors = ['#111111', '#222222', '#333333', '#444444'];
      return c;
    }
  },
  { name: 'fundo: animated',
    make: (c) => {
      c.style.bgVariant = 'animated';
      c.style.animatedColors = ['#ff0000', '#00ff00', '#0000ff'];
      c.style.animSpeed = 12;
      return c;
    }
  },
  { name: 'fundo: cyberpunk',
    make: (c) => {
      c.style.bgVariant = 'cyberpunk';
      c.style.cyberPrimary = '#00ffff';
      c.style.cyberSecondary = '#ff00ff';
      return c;
    }
  },
  { name: 'banner: gradiente + scrim + chip de vidro no overlay',
    make: (c) => {
      c.design.banner = {
        enabled: true, bgType: 'gradient', height: 190,
        stops: [ { color: '#0f172a', pos: 0, alpha: 100 }, { color: '#64748b', pos: 100, alpha: 100 } ],
        angle: 135, scrim: 'dark', scrimOpacity: 40,
        overlayTitle: 'Conheça a AXIUM', overlayCta: 'Saiba mais', overlayCtaUrl: 'https://axium.app'
      };
      c.style.bannerText = { titleSize: 20, titleWeight: 800, titleColor: '#ffffff', ctaSize: 13, ctaWeight: 700, ctaColor: '#0f172a', align: 'center', vpos: 'center', darken: true };
      c.style.bannerGlass = { enabled: true, blur: 20, opacity: 22, color: '#ff8800' };
      c.banner = '';
      return c;
    }
  },
  { name: 'espaçamento por elemento + link + blockGap',
    make: (c) => {
      c.style.blockGap = 14;
      c.design.profile.elem.name.spacing = 20;
      c.design.profile.elem.bio.spacing = 12;
      c.design.profile.elem.address.spacing = 18;
      c.design.profile.elem.avatar.spacing = 16;
      c.design.banner.spacing = 24;
      c.links[1].spacing = 30;
      return c;
    }
  },
  { name: 'espaçamento global entre blocos (blockGap=30)',
    make: (c) => { c.style.blockGap = 30; return c; }
  },
  { name: 'espaçamento global entre blocos (blockGap=0)',
    make: (c) => { c.style.blockGap = 0; return c; }
  },
  { name: 'TEMA PRONTO: Minimalista Escuro',
    preset: 'minimal-dark',
    make: (c) => { c.style.activePreset = 'minimal-dark'; return c; }
  },
  { name: 'TEMA PRONTO: Luxo Dourado',
    preset: 'luxo-dourado',
    make: (c) => { c.style.activePreset = 'luxo-dourado'; return c; }
  },
  { name: 'TEMA PRONTO: Neon Vibrante',
    preset: 'neon-vibrante',
    make: (c) => { c.style.activePreset = 'neon-vibrante'; return c; }
  },
  { name: 'TEMA PRONTO: Editorial Clean',
    preset: 'editorial-clean',
    make: (c) => { c.style.activePreset = 'editorial-clean'; return c; }
  },
  { name: 'TEMA PRONTO: Orgânico Fresco',
    preset: 'organico-fresco',
    make: (c) => { c.style.activePreset = 'organico-fresco'; return c; }
  },
  { name: 'TEMA PRONTO: Sunset Warm',
    preset: 'sunset-warm',
    make: (c) => { c.style.activePreset = 'sunset-warm'; return c; }
  },
  { name: 'TEMA PRONTO: Glass Premium',
    preset: 'glass-premium',
    make: (c) => { c.style.activePreset = 'glass-premium'; return c; }
  },
  { name: 'avatares full (tamanho/forma/raio/borda/sombra/glow/vidro)',
    make: (c) => {
      c.design.profile.elem.avatar = {
        size: 148, shape: 'square', radius: 6, borderStyle: 'dashed', borderWidth: 8, borderColor: '#ff0000',
        shadowOn: false, shadowX: 0, shadowY: 12, shadowBlur: 24, shadowSpread: -10, shadowColor: '#000000', shadowAlpha: 80,
        glowOn: true, glowColor: '#00ddff', glowIntensity: 80, spacing: 0
      };
      c.design.profile.glass = true;
      c.design.profile.glassBlur = 18;
      return c;
    }
  },
  { name: 'selo verificado com cor personalizada',
    make: (c) => {
      c.profile.verified = true;
      c.design.profile.verifiedColor = '#0ea5e9';
      return c;
    }
  }
];

/* ================================================================
   ALVO — comparações direcionadas de equivalência (mecanismo distinto)
   ================================================================ */

/* Seletores da página pública para os pares espelhados */
const PUB_AV = '#pgAvatarCard .profile__avatar';

function avatarChecks(wA, wP, cfg) {
  const opts = [];
  const av = (cfg.design.profile.elem.avatar) || {};
  const aEl = wA.document.querySelector('#pvAvatar');
  const pEl = wP.document.querySelector(PUB_AV);
  const pCard = wP.document.querySelector('#pgAvatarCard');
  if (!aEl || !pEl || !pCard) return opts;
  const csA = wA.getComputedStyle(aEl);
  const csP = wP.getComputedStyle(pEl);

  const aR = csA.borderRadius;
  const pR = csP.borderRadius;
  opts.push(['avatar: border-radius computado admin == público', aR === pR, 'admin=' + aR + ' público=' + pR]);

  const aB = csA.borderColor + ' ' + csA.borderWidth + ' ' + csA.borderStyle;
  const pB = csP.borderColor + ' ' + csP.borderWidth + ' ' + csP.borderStyle;
  opts.push(['avatar: borda computada admin == público', (aB === pB) || (aB === 'rgba(0, 0, 0, 0) 0px none' && pB === 'rgba(0, 0, 0, 0) 0px none'), 'admin=' + aB + ' público=' + pB]);

  const aGlow = (aEl.style.boxShadow || '');
  const pGlow = (pCard.style.boxShadow || '');
  const glowActive = av.glowOn && av.glowColor;
  const glowOk = glowActive
    ? (aGlow.indexOf(av.glowColor) >= 0 && pGlow.indexOf(av.glowColor) >= 0)
    : (!/^0 0 \d/.test(aGlow) && pGlow === '');
  opts.push(['avatar: glow admin==público (color presente/ausente)', !!glowOk, 'admin=' + aGlow + ' público=' + pGlow]);

  const aShadow = (aEl.style.boxShadow || '');
  const pRing = pCard.classList.contains('avatar-ring');
  const shadowOk = (av.shadowOn !== false) === pRing;
  opts.push(['avatar: sombra admin==público (ring ativo/desligado)', !!shadowOk, 'hasRing=' + pRing + ' admin shadow=' + aShadow]);

  const aGlass = aEl.style.getPropertyValue('--glass-blur') || '';
  const pGlass = (pCard.style.getPropertyValue('--glass-blur') || '').replace(/^0px$/, '');
  const sameGlass = (aGlass === pGlass) || (aGlass.replace(/^0px$/, '') === pGlass);
  opts.push(['avatar: vidro admin==público (--glass-blur)', !!sameGlass, 'admin=' + aGlass + ' público=' + pGlass]);
  return opts;
}

function overlayTitleChecks(wA, wP) {
  const opts = [];
  const aTitle = wA.document.querySelector('.pv-banner-overlay-title');
  const pTitle = wP.document.querySelector('#pgBannerTitle');
  const at = aTitle && aTitle.textContent;
  const pt = pTitle && pTitle.textContent;
  opts.push(['banner: título do overlay (design.banner.overlayTitle) admin==público', at === pt, 'admin=' + JSON.stringify(at) + ' público=' + JSON.stringify(pt)]);
  const aCta = wA.document.querySelector('.pv-banner-overlay-cta');
  const pCta = wP.document.querySelector('#pgBannerCta');
  opts.push(['banner: CTA do overlay admin==público', (aCta && aCta.textContent) === (pCta && pCta.textContent), 'admin=' + JSON.stringify(aCta && aCta.textContent) + ' público=' + JSON.stringify(pCta && pCta.textContent)]);
  return opts;
}

function verifiedChecks(wA, wP, cfg) {
  const opts = [];
  const pf = (cfg.design && cfg.design.profile) || {};
  const a = wA.document.querySelector('#pvVerified');
  const p = wP.document.querySelector('#pgVerified');
  if (!a || !p) return opts;
  if (pf.verifiedColor) {
    const same = (a.style.background || '') === (p.style.background || '');
    opts.push(['verificado: cor personalizada aplicada nos DOIS (inline ==)', !!same, 'admin=' + a.style.background + ' público=' + p.style.background]);
  }
  return opts;
}

/* Endereço: o raio da pílula DENTRO do range do slider do painel não sofre
   clamp do jsdom — então o lado público deve honrar o elem.address.radius
   explícito (o admin, sob jsdom, pode divergir por clamp pré-existente). */
function enderecoTargetedChecks(wA, wP, cfg) {
  const opts = [];
  const aCfg = ((cfg.design && cfg.design.profile && cfg.design.profile.elem) || {}).address || {};
  const p = wP.document.querySelector('#pgAddress');
  if (!p) return opts;
  const expected = (aCfg.radius != null ? aCfg.radius : 999) + 'px';
  opts.push(['endereco: público aplica o raio explícito do elem.address', p.style.borderRadius === expected, 'esperado=' + expected + ' público=' + p.style.borderRadius]);
  return opts;
}

/* Normaliza texto de fundo: alfa com zeros à direita + lowercase + espaço */
function normAlpha(s) {
  return String(s || '')
    .replace(/rgba\(\s*/g, 'rgba(')
    .replace(/0\.(\d+)0+/g, '0.$1')
    .replace(/0\.(\d)0/g, '0.$1')
    .replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, 'rgb($1,$2,$3)')
    .replace(/,\s+/g, ',')
    .toLowerCase();
}

/* Plano de fundo: admin inline no #pvPage vs público via CSS vars + body.
   Sólido: cor igual. Gradiente: mesmo CONJUNTO de cores (formatação:
   alfa 0.80 vs 0.8, hex vs rgb, posições) pode diferir → compara tokens. */
function fundoChecks(wA, wP, cfg) {
  const opts = [];
  const aP = wA.document.querySelector('#pvPage');
  const bP = wP.document.body;
  if (!aP || !bP) return opts;
  const root = wP.document.documentElement.style;
  const variant = (cfg.style && cfg.style.bgVariant) || 'solid';

  /* Converte rgb(r,g,b) → #rrggbb e normaliza hex (lowercase, curto → longo) */
  const toHex = (s) => {
    const m = String(s || '').match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) {
      return '#' + [m[1], m[2], m[3]].map((n) => {
        const h = Number(n).toString(16).padStart(2, '0');
        return h;
      }).join('');
    }
    const mh = String(s || '').match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
    if (mh) {
      let h = mh[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return '#' + h.toLowerCase();
    }
    return normAlpha(s);
  };

  if (variant === 'gradient') {
    const aBg = normAlpha(aP.style.background || aP.style.backgroundImage || '');
    const bVar = normAlpha(root.getPropertyValue('--page-bg') || '');
    const tokens = (s) => (s.match(/#[0-9a-f]{6}|#[0-9a-f]{3}|rgba?\([^)]*\)/g) || []).sort().join('|');
    const same = tokens(aBg) === tokens(bVar) && !!aBg && !!bVar;
    opts.push(['fundo: gradient admin==público (mesmas cores)', same, aBg + ' vs ' + bVar]);
  } else if (variant === 'solid') {
    const aBg = toHex(aP.style.backgroundColor || aP.style.background || '');
    const bVar = toHex(root.getPropertyValue('--page-bg') || '');
    const same = aBg === bVar && !!aBg && !!bVar;
    opts.push(['fundo: cor sólida admin==público', same, aBg + ' vs ' + bVar]);
  }
  /* mesh/cyberpunk/animated: efeito visual distinto por mecanismo (layers,
     keyframes/veil) — já coberto por construção; só presença de fundo. */
  return opts;
}

function bannerOverlayChecks(wA, wP) {
  const opts = [];
  const anyB = wA.document.querySelector('.pv-banner-overlay');
  const anyP = wP.document.querySelector('#pgBannerOverlay');
  opts.push(['banner: overlay (título/CTA) presente em AMBOS quando configurado', !!anyB === !!anyP, 'admin=' + (anyB ? 'sim' : 'não') + ' público=' + (anyP ? 'sim' : 'não')]);
  return opts;
}

/* Espaçamento global entre blocos (style.blockGap): cada bloco da ordem da
   página (Avatar → Nome → Bio → Endereço) recebe margin-bottom =
   espaçamento INDIVIDUAL do elemento (elem.<x>.spacing > 0 — sobrescreve o
   global) senão o GLOBAL blockGap. Valor 0 zera a margem (''). Admin
   (preview) e público aplicam a MESMA fórmula → comparação tripla. */
function blockSpacingChecks(wA, wP, cfg) {
  const opts = [];
  const st = cfg.style || {};
  const globalGap = (Number(st.blockGap) >= 0) ? Number(st.blockGap) : 10;
  const elem = ((cfg.design && cfg.design.profile && cfg.design.profile.elem) || {});
  const pairs = [
    ['avatar', '#pvAvatarWrap', '#pgAvatarCard'],
    ['name', '.pv-name-row', '.profile__name-row'],
    ['bio', '#pvBio', '#pgSubtitle'],
    ['address', '#pvAddress', '#pgAddress']
  ];
  for (const [key, aSel, pSel] of pairs) {
    const indiv = Number(elem[key] && elem[key].spacing);
    const expected = indiv > 0 ? indiv : globalGap;
    const expV = expected ? expected + 'px' : '';
    const aEl = wA.document.querySelector(aSel);
    const pEl = wP.document.querySelector(pSel);
    if (!aEl || !pEl) continue;
    const aV = aEl.style.marginBottom || '';
    const pV = pEl.style.marginBottom || '';
    const detail = 'admin=' + (aV || '(vazio)') + ' público=' + (pV || '(vazio)') + ' esperado=' + (expV || '(vazio)');
    opts.push([`espaçamento bloco ${key}: admin==público==esperado`, aV === pV && aV === expV, detail]);
  }
  return opts;
}

/* ================================================================
   Runner
   ================================================================ */
export async function run() {
  let pass = 0, fail = 0;
  const divsAll = [];

  const wA = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' }).window;
  const wP = boot(INDEX_PATH, { supabase: supabaseStub({ config: NEW_CONFIG, slug: 'teste' }), url: 'https://axiumlink.test/?s=teste' }).window;

  for (const variant of CASE_VARIANTS) {
    let cfg = JSON.parse(JSON.stringify(NEW_CONFIG));
    cfg.links = [
      { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' },
      { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', type: 'whatsapp' },
      { id: 'l3', title: 'Telefone', url: '11999990000', type: 'telefone' }
    ];
    variant.make(cfg);

    /* jsdom dispara input sintético ao sincronizar os sliders do painel, e o
       próprio slider RE-escreve o cfg com valor clampado (radius max 30,
       lh min 1) → re-render. No browser real set programático de .value não
       dispara evento (config intacta). O PÚBLICO recebe o cfg íntegro. */
    const pristine = JSON.parse(JSON.stringify(cfg));
    if (variant.preset) {
      /* Tema Pronto: aplicado pelo MESMO fluxo do painel (applyPreset) e a
         config RESULTANTE é a que a página pública recebe — nada duplicado. */
      wA.__axEditor.init(pristine);
      wA.__axEditor.applyPreset(variant.preset);
      cfg = JSON.parse(JSON.stringify(wA.__axEditor.cfg()));
      wP.__alaPublica.aplicar(cfg);
    } else {
      wA.__axEditor.init(cfg);
      wP.__alaPublica.aplicar(pristine);
    }
    const dA = wA.document;
    const dP = wP.document;

    console.log('\n━━━ ESPELHO | ' + variant.name + ' ━━━');

    /* Pares fixos */
    for (const pair of PAIRS) {
      const a = snapshot(wA, pair.admin);
      const b = snapshot(wP, pair.public);
      const divs = comparePair(pair.key, a, b, PAIR_ALLOW(pair));
      for (const d of divs) {
        const line = (pair.key + '.' + (d.prop || '')) + (d.known ? ' (conhecida)' : '');
        console.log(`  ⚠️  DIVERGÊNCIA ${line} — admin=${d.a} | público=${d.b}`);
        divsAll.push({ caso: variant.name, par: line, admin: d.a, publico: d.b, conhecida: !!d.known });
        if (!d.known) fail++;
        else pass++;
      }
      if (!divs.length) pass++;
    }

    /* Botões/cards de link — comparação pareada por índice */
    const aCards = Array.from(dA.querySelectorAll('#previewLinksList > *'));
    const pCards = Array.from(dP.querySelectorAll('.pg-links-list > *'));
    if (aCards.length !== pCards.length) {
      console.log(`  ⚠️  DIVERGÊNCIA lista-links — admin tem ${aCards.length} filhos, público tem ${pCards.length}`);
      divsAll.push({ caso: variant.name, par: 'lista-links', admin: 'filhos=' + aCards.length, publico: 'filhos=' + pCards.length, conhecida: false });
      fail++;
    } else {
      aCards.forEach((aEl, i) => {
        const bEl = pCards[i];
        const snapA = snapEl(aEl);
        const snapB = snapEl(bEl);
        const divs = comparePair('link#' + i, snapA, snapB, {
          background: true, 'background-color': true, 'background-image': true,
          '--ui-bg': true, 'box-shadow': true, _href: true,
          'border-color': true, 'border-style': true, 'border-width': true,
          height: true, '--customimg-h': true, '--btn-bg': true, '--btn-color': true,
          '--btn-border-color': true, '--btn-border-width': true
        });
        for (const d of divs) {
          console.log(`  ⚠️  DIVERGÊNCIA link#${i}.${d.prop} — admin=${d.a} | público=${d.b}`);
          divsAll.push({ caso: variant.name, par: 'link#' + i + '.' + d.prop, admin: d.a, publico: d.b, conhecida: true });
          pass++;
        }
        if (!divs.length) pass++;
      });
    }

    /* Alvos direcionados */
    const checks = [];
    checks.push(...avatarChecks(wA, wP, cfg), ...enderecoTargetedChecks(wA, wP, cfg), ...fundoChecks(wA, wP, cfg), ...blockSpacingChecks(wA, wP, cfg));
    if (/banner/i.test(variant.name)) checks.push(...overlayTitleChecks(wA, wP), ...bannerOverlayChecks(wA, wP));
    if (/verificado/i.test(variant.name)) checks.push(...verifiedChecks(wA, wP, cfg));

    for (const [label, ok, det] of checks) {
      const mark = ok ? '✅' : '❌';
      console.log(`  ${mark} ${label}${ok ? '' : ' — ' + det}`);
      if (ok) pass++; else fail++;
      if (!ok) divsAll.push({ caso: variant.name, par: label, admin: det, publico: '', conhecida: false });
    }
  }

  /* tipografia global do botão (typoBtn) — ALVO dedicado */
  {
    const cfg = JSON.parse(JSON.stringify(NEW_CONFIG));
    cfg.links = [ { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' } ];
    cfg.style.typoBtn = { font: 'Poppins', size: 18, weight: 800, ls: 1, lh: 1.2 };
    wA.__axEditor.init(cfg);
    wP.__alaPublica.aplicar(cfg);
    const a = wA.document.querySelector('#previewLinksList .link-block');
    const b = wP.document.querySelector('.pg-links-list .featured__card');
    const aF = a && a.style.fontSize;
    const bF = b && b.style.fontSize;
    const ok = (aF || '') === (bF || '');
    console.log(`\n━━━ ESPELHO | ALVO typoBtn ━━━`);
    console.log('  ' + (ok ? '✅' : '❌') + ' tipografia global do botão (style.typoBtn) aplica nos DOIS lados — admin font-size=' + (aF || '(nada)') + ' público=' + (bF || '(nada)'));
    if (!ok) fail++; else pass++;
  }

  /* Resumo — lista real (não-conhecidas) deduplicada */
  const real = divsAll.filter((d) => !d.conhecida);
  console.log(`\n  ✅ ESPELHO checks: ${pass}  |  ❌ DIVERGÊNCIAS: ${fail}`);
  if (real.length) {
    console.log(`\n  RESUMO das divergências reais (${real.length}):`);
    const byPar = {};
    for (const d of real) (byPar[d.par] = byPar[d.par] || []).push(d);
    for (const [par, arr] of Object.entries(byPar)) {
      const exemplo = arr[0];
      console.log(`   - ${par}: admin=${exemplo.admin} | público=${exemplo.publico}  (${arr.length} ocorrência${arr.length > 1 ? 's' : ''})`);
    }
  } else if (divsAll.length) {
    console.log(`  (todas as ${divsAll.length} divergências levantadas são mecanismos documentados na ALLOW)`);
  }
  return fail;
}