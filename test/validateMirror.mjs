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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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
        { id: 'l3', title: 'GitHub', url: 'https://github.com', type: 'github' }
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
  { name: 'SOMENTE TEXTO: Bio/Nome/Endereço + Botão (box anulado por classe)',
    make: (c) => {
      c.design.profile.elem.name.displayStyle = 'text-only';
      c.design.profile.elem.bio.displayStyle = 'text-only';
      c.design.profile.elem.address.displayStyle = 'text-only';
      c.links = [
        { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' },
        { id: 'l2', title: 'Contato', url: 'https://contato.com', type: 'site', style: { displayStyle: 'text-only' } }
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
  { name: 'links: descrição longa sem espaço (BUG B wrap)',
    make: (c) => {
      c.links = [
        { id: 'l1', title: 'Instagram', url: 'https://instagram.com/x', type: 'instagram', sub: 'descrição textodescrição textodescrição textodescrição texta' },
        { id: 'l2', title: 'Destaque', url: 'https://site.com', type: 'site', cardStyle: 'highlight', sub: 'destaquegrandedescriçãolongasemespacospraestourarolayoutdocard' },
        { id: 'l3', title: 'Depoimento', url: 'https://site.com', type: 'site', cardStyle: 'testimonial', sub: 'atendimentoimpecávelrapideznoatendimentoqualidadeexcelente' }
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
  { name: 'fundo: textura',
    make: (c) => {
      c.style.bgVariant = 'solid';
      c.style.bgTexture = 'diagonal';
      c.style.bgTextureOpacity = 40;
      return c;
    }
  },
  { name: 'banner: gradiente + scrim',
    make: (c) => {
      c.design.banner = {
        enabled: true, bgType: 'gradient', height: 190,
        stops: [ { color: '#0f172a', pos: 0, alpha: 100 }, { color: '#64748b', pos: 100, alpha: 100 } ],
        angle: 135, scrim: 'dark', scrimOpacity: 40
      };
      c.banner = '';
      return c;
    }
  },
  { name: 'banner: texto sobre o banner desativado (legado ignorado)',
    make: (c) => {
      c.design.banner = {
        enabled: true, bgType: 'gradient', height: 190,
        stops: [ { color: '#0f172a', pos: 0, alpha: 100 }, { color: '#64748b', pos: 100, alpha: 100 } ],
        angle: 135, scrim: 'none',
        overlayTitle: 'Legado NÃO deve renderizar', overlayCta: 'CTA legado', overlayCtaUrl: 'https://x.com'
      };
      c.style = Object.assign({}, c.style, {
        bannerOverlayTitle: 'Legado style não renderiza',
        bannerOverlayCta: 'CTA legado',
        bannerOverlayCtaUrl: 'https://x.com',
        bannerText: { titleSize: 20, titleWeight: 800, titleColor: '#ffffff', ctaSize: 13, ctaWeight: 700, ctaColor: '#0f172a', align: 'center', vpos: 'center', darken: true },
        bannerGlass: { enabled: true, blur: 20, opacity: 22, color: '#ff8800' }
      });
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

function bannerOverlayAbsentChecks(wA, wP) {
  const opts = [];
  const aEl = wA.document.querySelector('.pv-banner-overlay');
  opts.push(['banner: overlay de texto NÃO é renderizado no admin (função removida)', !aEl, 'admin=' + (aEl ? 'presente' : 'ausente')]);
  const pEl = wP.document.querySelector('#pgBannerOverlay');
  opts.push(['banner: overlay de texto NÃO existe no público (função removida)', !pEl, 'público=' + (pEl ? 'presente' : 'ausente')]);
  const pTitle = wP.document.querySelector('#pgBannerTitle');
  const pCta = wP.document.querySelector('#pgBannerCta');
  opts.push(['banner: título/CTA do overlay ausentes no público', !pTitle && !pCta, 'título=' + (pTitle ? 'presente' : 'ausente') + ' CTA=' + (pCta ? 'presente' : 'ausente')]);
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

/* ================================================================
   ÍCONE DE LOCALIZAÇÃO DO ENDEREÇO (BUG do emoji 📍 hardcoded).
   Checagem específica do pin: MESMO desenho (svg + path + circle +
   atributos idênticos) entre preview admin e página pública, MESMO
   tamanho (regra CSS) e consistência com a fonte única render-core.
   ================================================================ */

/* Desenho canônico de um <svg> real no DOM (atributos na ordem,
   filhos path/circle na ordem do autor). */
function svgDrawing(el) {
  if (!el || el.tagName.toLowerCase() !== 'svg') return null;
  const attr = (n) => el.getAttribute(n) || '';
  const parts = [
    'viewBox=' + attr('viewBox'),
    'fill=' + attr('fill'),
    'stroke=' + attr('stroke'),
    'stroke-width=' + attr('stroke-width'),
    'stroke-linecap=' + attr('stroke-linecap'),
    'stroke-linejoin=' + attr('stroke-linejoin'),
    'aria-hidden=' + attr('aria-hidden')
  ];
  for (const kid of el.children) {
    if (kid.tagName.toLowerCase() === 'path') parts.push('path:' + (kid.getAttribute('d') || ''));
    else if (kid.tagName.toLowerCase() === 'circle') parts.push('circle:' + ((kid.getAttribute('cx') || '') + ',' + (kid.getAttribute('cy') || '') + ',' + (kid.getAttribute('r') || '')));
    else parts.push(kid.tagName.toLowerCase() + ':' + (kid.textContent || '').trim());
  }
  return parts.join(' ');
}

/* Mesmo desenho extraído de um FRAGMENTO HTML (string) — usado para
   comparar a constante render-core.ICONS.pin sem carregar JS extra. */
function drawFromHtmlFragment(frag) {
  if (!frag) return '';
  const v = (re) => { const m = frag.match(re); return m ? m[1] : ''; };
  return [
    'viewBox=' + v(/viewBox="([^"]*)"/),
    'fill=' + v(/fill="([^"]*)"/),
    'stroke=' + v(/stroke="([^"]*)"/),
    'stroke-width=' + v(/stroke-width="([^"]*)"/),
    'stroke-linecap=' + v(/stroke-linecap="([^"]*)"/),
    'stroke-linejoin=' + v(/stroke-linejoin="([^"]*)"/),
    'aria-hidden=' + v(/aria-hidden="([^"]*)"/),
    'path:' + v(/<path[^>]*d="([^"]*)"/),
    'circle:' + v(/cx="([^"]*)"/) + ',' + v(/cy="([^"]*)"/) + ',' + v(/r="([^"]*)"/)
  ].join(' ');
}

function svgSizeRule(rs, sel) {
  const r = findRule(rs, sel);
  return r
    ? (r.style.getPropertyValue('width') + '||' + r.style.getPropertyValue('height') + '||' + r.style.getPropertyValue('flex-shrink'))
    : '(sem regra)';
}

function addressIconChecks(wA, wP) {
  const opts = [];
  const a = wA.document.querySelector('#pvAddressIco svg');
  const p = wP.document.querySelector('#pgAddress svg');
  const isSvgEl = (el) => !!el && el.tagName.toLowerCase() === 'svg';
  opts.push(['ícone endereço: preview e público usam SVG de pin (sem emoji)', isSvgEl(a) && isSvgEl(p),
    'admin=' + (a ? a.tagName : '(ausente)') + ' público=' + (p ? p.tagName : '(ausente)')]);

  const aDraw = svgDrawing(a);
  const pDraw = svgDrawing(p);
  opts.push(['ícone endereço: desenho presente nos DOIS', !!(aDraw && pDraw),
    'admin=' + (aDraw || '(vazio)') + ' público=' + (pDraw || '(vazio)')]);
  if (aDraw && pDraw) {
    opts.push(['ícone endereço: MESMO desenho (viewBox/fill/stroke/path/circle) admin==público',
      aDraw === pDraw, aDraw]);
  }

  const aRule = svgSizeRule(allRules(wA), '.pv-address svg');
  const pRule = svgSizeRule(allRules(wP), '.profile__address svg');
  const sizeOk = (st) => /^14px\|\|14px\|\|0/.test(st);
  opts.push(['ícone endereço: tamanho 14px no admin (.pv-address svg)', sizeOk(aRule), aRule]);
  opts.push(['ícone endereço: tamanho 14px no público (.profile__address svg)', sizeOk(pRule), pRule]);
  opts.push(['ícone endereço: regra de TAMANHO admin==público', aRule === pRule, 'admin=' + aRule + ' público=' + pRule]);

  const rc = readFileSync(join(REPO_ROOT, 'js', 'render-core.js'), 'utf8');
  const m = rc.match(/pin:\s*'([^']*)'/);
  const rcDraw = m ? drawFromHtmlFragment(m[1]) : '';
  const rcOk = !!rcDraw && aDraw === rcDraw && pDraw === rcDraw;
  opts.push(['ícone endereço: fonte única — render-core.ICONS.pin == preview == público',
    rcOk, 'render-core=' + (rcDraw || '(não encontrado)')]);
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
    /* As camadas do gradiente estão em background-image; a cor de "Fundo"
       (pageBgColor) é o tapete em background-color. O atalho `background`
       do admin carrega as duas — comparar o atalho punia a cor-base. */
    const aImg = normAlpha(aP.style.backgroundImage || '');
    const bVar = normAlpha(root.getPropertyValue('--page-bg') || '');
    const tokens = (s) => (s.match(/#[0-9a-f]{6}|#[0-9a-f]{3}|rgba?\([^)]*\)/g) || []).sort().join('|');
    const same = tokens(aImg) === tokens(bVar) && !!aImg && !!bVar;
    opts.push(['fundo: gradient admin==público (mesmas cores)', same, aImg + ' vs ' + bVar]);
    const aBase = toHex(aP.style.backgroundColor || '');
    const pBase = toHex(wP.document.body.style.backgroundColor || '');
    opts.push(['fundo: cor de "Fundo" (tapete) admin==público', aBase === pBase && !!aBase, aBase + ' vs ' + pBase]);
  } else if (variant === 'solid') {
    const aBg = toHex(aP.style.backgroundColor || aP.style.background || '');
    const bVar = toHex(root.getPropertyValue('--page-bg') || '');
    const same = aBg === bVar && !!aBg && !!bVar;
    opts.push(['fundo: cor sólida admin==público', same, aBg + ' vs ' + bVar]);
  }
  /* mesh/cyberpunk/animated: efeito visual distinto por mecanismo (layers,
     keyframes/veil) — já coberto por construção; só presença de fundo. */

  /* Textura sobreposta — o ESPÍRITO do BUG 3: o público não tinha NENHUMA
     textura e o admin usava #808080 (cinza médio) com soft-light, que é
     identidade (invisível). Agora ambos injetam uma camada .pv-texture/
     .ax-texture com MESMO fundo (par claro+escuro) e MESMA opacidade. */
  if (cfg.style.bgTexture && cfg.style.bgTexture !== 'none') {
    const tA = aP.querySelector('.pv-texture');
    const tP = wP.document.querySelector('.ax-texture');
    const aHas = !!tA;
    const pHas = !!tP;
    opts.push(['textura: camada injetada no preview (admin)', aHas, aHas ? 'sim' : '(sem textura)']);
    opts.push(['textura: camada injetada no público', pHas, pHas ? 'sim' : '(sem textura)']);
    if (aHas && pHas) {
      const key = 'backgroundImage';
      const aBg = String(tA.style[key] || '');
      const pBg = String(tP.style[key] || '');
      const sameBg = aBg === pBg && !!aBg;
      const nonGray = aBg.indexOf('#808080') < 0 && pBg.indexOf('#808080') < 0;
      const detalhe = sameBg && nonGray ? 'ok' : 'admin=' + aBg.slice(0, 40) + ' público=' + pBg.slice(0, 40);
      opts.push(['textura: mesmo padrão claro+escuro nos DOIS (longe da #808080 invisível)', sameBg && nonGray, detalhe]);
      const expOp = String((cfg.style.bgTextureOpacity ?? 30) / 100);
      const aOp = tA.style.opacity;
      const pOp = tP.style.opacity;
      opts.push(['textura: opacidade admin==público==esperada', aOp === pOp && aOp === expOp, 'admin=' + aOp + ' público=' + pOp + ' esperado=' + expOp]);
      const zP2 = wP.getComputedStyle(tP).zIndex;
      opts.push(['textura: camada pública com z-index >= 0 (não some atrás do body)', zP2 !== '-1', 'público=' + zP2]);
    }
  }
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

/* Lê todas as cssRules de todos os <style> de uma página (o jsdom não
   resolve layout — o contrato de estilo é verificado nas regras direto). */
function allRules(win) {
  const out = [];
  for (const sheet of win.document.styleSheets || []) {
    let rules = [];
    try { rules = sheet.cssRules || []; } catch (_) { /* cross-origin: ignora */ }
    for (const r of rules) if (r && r.selectorText) out.push(r);
  }
  return out;
}

function findRule(rs, sel) {
  return rs.find((r) =>
    String(r.selectorText).split(',').map((s) => s.trim()).indexOf(sel) >= 0
  );
}

/* BUG 1 — alinhamento do ícone dos botões. Preview lê link.iconAlign e
   aplica .icon-center/.icon-right; o público precisa aplicar .ia-center/
   .ia-right na MESMA condição. Como o espelho por-par só compara estilos
   inline (essas classes não entram no _class), o contrato é verificado
   por classe aqui — para os links que tiverem iconAlign explícito. */
function iconAlignChecks(wA, wP, cfg) {
  const opts = [];
  const links = Array.isArray(cfg.links) ? cfg.links : [];
  const aCards = Array.from(wA.document.querySelectorAll('#previewLinksList > *'));
  const pCards = Array.from(wP.document.querySelectorAll('.pg-links-list > *'));
  links.forEach((l, i) => {
    if (!l.iconAlign || l.iconAlign === 'left') return;
    const aEl = aCards[i];
    const pEl = pCards[i];
    const aHas = !!(aEl && aEl.classList.contains('icon-' + l.iconAlign));
    const pHas = !!(pEl && pEl.classList.contains('ia-' + l.iconAlign));
    opts.push([
      `bug1: ícone '${l.iconAlign}' espelhado nos DOIS lados (admin .icon-* / público .ia-*)`,
      aHas && pHas,
      'admin=' + (aEl ? aEl.className : '(sem card)') + ' público=' + (pEl ? pEl.className : '(sem card)')
    ]);
  });
  return opts;
}

/* BUG B — descrição dos cards: o nodo de descrição precisa QUEBRAR além
   do título (white-space normal + overflow-wrap). Admin usa
   .link-block-sub (cards padrão) e .link-block .featured__sub
   (highlight/testimonial); público usa .featured__sub. O jsdom não
   aplica layout, então a verificação lê as cssRules dos <style> dos dois
   lados — qualquer regressão (white-space:nowrap ou remoção do wrap) é
   capturada aqui. */
function descWrapChecks(wA, wP) {
  const opts = [];
  const aR = allRules(wA);
  const pR = allRules(wP);
  const wrapState = (r) => r
    ? ((r.style.getPropertyValue('white-space') || '') + '|' + (r.style.getPropertyValue('overflow-wrap') || '') + '|' + (r.style.getPropertyValue('word-break') || ''))
    : '(sem regra)';
  const good = (st) => st && /^normal\|/.test(st) && /(anywhere|break-word)/.test(st);
  const aDefault = findRule(aR, '.link-block-sub');
  const aFeatured = findRule(aR, '.link-block .featured__sub');
  const pSub = findRule(pR, '.featured__sub');
  opts.push(['descB: admin .link-block-sub quebra além do título (white-space normal + overflow-wrap)', good(wrapState(aDefault)), wrapState(aDefault)]);
  opts.push(['descB: admin .link-block .featured__sub (highlight/testimonial) quebra igual ao público', good(wrapState(aFeatured)), wrapState(aFeatured)]);
  opts.push(['descB: público .featured__sub quebra além do título (white-space normal + overflow-wrap)', good(wrapState(pSub)), wrapState(pSub)]);
  return opts;
}

/* ================================================================
   Paridade ESTRUTURAL (árvore DOM), além dos estilos computados.
   Garante que preview e público montem o MESMO esqueleto de tags/peças.
   Diferenças de DESIGN são normalizadas aqui: prefixos de classe
   (pv- frente a profile__ / pg), wrappers de maquete (link-block__head,
   link-block-txt, featured__body), a seta só do público (featured__arrow),
   o <img> do banner (público usa background-image) e o <svg> do selo/
   endereço. O que SOBRAR como diferença de árvore é falha real. */
const CLASS_KEY = new Map([
  ['pv-name-row', 'row'], ['profile__name-row', 'row'],
  ['pv-name-wrap', 'wrap'], ['profile__name-wrap', 'wrap'],
  ['pv-name', 'name'], ['profile__title', 'name'],
  ['pv-verified', 'verified'], ['profile__verified', 'verified'],
  ['pv-bio', 'bio'], ['profile__subtitle', 'bio'],
  ['pv-address', 'address'], ['profile__address', 'address'],
  ['pv-address-ico', 'wrap'],
  ['pv-avatar', 'avatar'], ['profile__avatar', 'avatar'],
  ['pv-banner', 'banner'], ['profile__banner', 'banner'],
  ['pv-banner-scrim', 'scrim'], ['profile__banner-scrim', 'scrim'],
  ['link-block__head', 'wrap'], ['link-block-txt', 'wrap'], ['featured__body', 'wrap'],
  ['link-block-icon', 'icon'], ['featured__icon', 'icon'],
  ['link-block-title', 'title'],
  ['link-block-sub', 'sub'], ['featured__sub', 'sub'],
  ['link-block-customimg-img', 'customimg'], ['featured__customimg', 'customimg'],
  ['featured__arrow', 'arrow']
]);

function structKey(el) {
  if (el.nodeType !== 1) return null;
  /* getAttribute('class') (não classList): o jsdom precisa funcionar também
     para SVG em namespace (seta do card, selo, endereço). */
  for (const cls of (el.getAttribute('class') || '').split(/\s+/)) {
    const k = CLASS_KEY.get(cls);
    if (k) return k;
  }
  return null;
}

/* Assinatura estrutural canônica: preorder de peças, ordem de filhos
   ignorada (overflow: o CSS ordena), classes/ids de design removidas. */
function structSig(el, opts) {
  const optsN = opts || {};
  const kids = [];
  for (const ch of el.children) {
    const s = sigOne(ch, optsN);
    if (s !== null) kids.push(s);
  }
  kids.sort();
  return kids.join('|');
}

function sigOne(el, opts) {
  const key = structKey(el);
  if (key === 'wrap') return structSig(el, opts);          /* wrappers de maquete */
  if (key === 'arrow') return null;                        /* seta é só do público */
  if (key === 'icon' && !el.children.length && !(el.textContent || '').trim()) return null; /* ícone vazio (admin mantém display:none, público omite) */
  if (el.tagName.toLowerCase() === 'svg') return 'icon';   /* svg (selo/endereço) vira peça "icon" */
  if (el.tagName.toLowerCase() === 'img' && opts && opts.dropBannerImg) return null; /* banner: admin tem <img>, público usa background-image */
  let tag = key || el.tagName.toLowerCase();
  if (key === null && el.tagName === 'STRONG') tag = 'title';
  const inner = structSig(el, opts);
  return inner ? tag + '(' + inner + ')' : tag;
}

function structCompare(label, aEl, pEl, opts) {
  const a = aEl ? structSig(aEl, opts) : '(ausente)';
  const p = pEl ? structSig(pEl, opts) : '(ausente)';
  return [label, a === p, 'admin=' + a + ' público=' + p];
}

function structureChecks(wA, wP) {
  const dA = wA.document;
  const dP = wP.document;
  const opts = [];
  opts.push(structCompare('estrut.: bloco Nome (row/wrap/título/selo)', dA.querySelector('.pv-name-row'), dP.querySelector('.profile__name-row')));
  opts.push(structCompare('estrut.: Bio', dA.querySelector('#pvBio'), dP.querySelector('#pgSubtitle')));
  opts.push(structCompare('estrut.: Endereço', dA.querySelector('#pvAddress'), dP.querySelector('#pgAddress')));
  opts.push(structCompare('estrut.: Banner', dA.querySelector('#pvBanner'), dP.querySelector('#pgBanner'), { dropBannerImg: true }));
  opts.push(structCompare('estrut.: Avatar', dA.querySelector('#pvAvatarWrap'), dP.querySelector('#pgAvatarCard')));
  const aCards = Array.from(dA.querySelectorAll('#previewLinksList > *'));
  const pCards = Array.from(dP.querySelectorAll('.pg-links-list > *'));
  if (aCards.length !== pCards.length) {
    opts.push(['estrut.: nº de cards na lista de links', false, 'admin=' + aCards.length + ' público=' + pCards.length]);
  }
  for (let i = 0; i < Math.min(aCards.length, pCards.length); i++) {
    opts.push(structCompare('estrut.: card#' + i, aCards[i], pCards[i]));
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

    /* Botões/cards de link — comparação pareada por índice.
       Mecanismos equivalentes (fundo/borda/altura) ficam na allowlist;
       QUALQUER divergência de GEOMETRIA/ALINHAMENTO (largura, flex,
       alinhamento próprio, margens, padding, display, texto) é FALHA
       real — impedindo regressões visuais (ex.: largura por-link no
       público sem espelho no preview) de passarem despercebidas. */
    const aCards = Array.from(dA.querySelectorAll('#previewLinksList > *'));
    const pCards = Array.from(dP.querySelectorAll('.pg-links-list > *'));
    if (aCards.length !== pCards.length) {
      console.log(`  ⚠️  DIVERGÊNCIA lista-links — admin tem ${aCards.length} filhos, público tem ${pCards.length}`);
      divsAll.push({ caso: variant.name, par: 'lista-links', admin: 'filhos=' + aCards.length, publico: 'filhos=' + pCards.length, conhecida: false });
      fail++;
    } else {
      const LINK_ALLOW = {
        background: true, 'background-color': true, 'background-image': true,
        '--ui-bg': true, 'box-shadow': true, _href: true,
        'border-color': true, 'border-style': true, 'border-width': true,
        height: true, '--customimg-h': true, '--btn-bg': true, '--btn-color': true,
        '--btn-border-color': true, '--btn-border-width': true
      };
      const LINK_GEOMETRY = [
        'width', 'max-width', 'flex', 'align-self', 'justify-content', 'align-items',
        'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
        'padding', 'display', 'text-align', 'aspect-ratio'
      ];
      aCards.forEach((aEl, i) => {
        const bEl = pCards[i];
        const snapA = snapEl(aEl);
        const snapB = snapEl(bEl);
        const divs = comparePair('link#' + i, snapA, snapB, LINK_ALLOW);
        for (const d of divs) {
          /* mecanismo (allow) → conhecida; geometria/alinhamento → real */
          d.known = !!LINK_ALLOW[d.prop] || !LINK_GEOMETRY.includes(d.prop);
          console.log(`  ⚠️  DIVERGÊNCIA link#${i}.${d.prop} — admin=${d.a} | público=${d.b}` + (d.known ? ' (conhecida)' : ''));
          divsAll.push({ caso: variant.name, par: 'link#' + i + '.' + d.prop, admin: d.a, publico: d.b, conhecida: d.known });
          if (d.known) pass++; else fail++;
        }
        if (!divs.length) pass++;
      });
    }

    /* Alvos direcionados */
    const checks = [];
    checks.push(...avatarChecks(wA, wP, cfg), ...enderecoTargetedChecks(wA, wP, cfg), ...addressIconChecks(wA, wP), ...fundoChecks(wA, wP, cfg), ...blockSpacingChecks(wA, wP, cfg), ...descWrapChecks(wA, wP), ...iconAlignChecks(wA, wP, cfg), ...structureChecks(wA, wP));
    if (/banner/i.test(variant.name)) checks.push(...bannerOverlayAbsentChecks(wA, wP));
    if (/verificado/i.test(variant.name)) checks.push(...verifiedChecks(wA, wP, cfg));

    for (const [label, ok, det] of checks) {
      const mark = ok ? '✅' : '❌';
      console.log(`  ${mark} ${label}${ok ? '' : ' — ' + det}`);
      if (ok) pass++; else fail++;
      if (!ok) divsAll.push({ caso: variant.name, par: label, admin: det, publico: '', conhecida: false });
    }
  }

  /* tipografia global do botão (typoBtn) — ALVO dedicado.
     BUG 4: mesmo com style.typoBtn.font = 'Poppins' no painel, o público
     aplicava a regra CSS mas NUNCA carregava a fonte do botão no Google
     Fonts (só st.font era carregada). Sem o <link>, o navegador cai no
     fallback system-ui e a fonte escolhida NUNCA chega. */
  {
    const cfg = JSON.parse(JSON.stringify(NEW_CONFIG));
    cfg.links = [ { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' } ];
    cfg.style.font = 'Inter';
    cfg.style.typoBtn = { font: 'Poppins', size: 18, weight: 800, ls: 1, lh: 1.2 };
    wA.__axEditor.init(cfg);
    wP.__alaPublica.aplicar(cfg);
    const a = wA.document.querySelector('#previewLinksList .link-block');
    const b = wP.document.querySelector('.pg-links-list .featured__card');
    const aF = a && a.style.fontSize;
    const bF = b && b.style.fontSize;
    const ok = (aF || '') === (bF || '');
    console.log(`\n━━━ ESPELHO | ALVO typoBtn (BUG 4) ━━━`);
    console.log('  ' + (ok ? '✅' : '❌') + ' tipografia global do botão (style.typoBtn) aplica nos DOIS lados — admin font-size=' + (aF || '(nada)') + ' público=' + (bF || '(nada)'));
    if (!ok) fail++; else pass++;
    const fam = (b && b.style.fontFamily) || '';
    const fOk = fam.search(/Poppins/) >= 0;
    console.log('  ' + (fOk ? '✅' : '❌') + ' BUG 4: font-family do botão no público usa a fonte escolhida — ' + (fam || '(vazio)'));
    if (!fOk) fail++; else pass++;
    const linkOk = !!wP.document.querySelector('link[href*="family=Poppins"]');
    console.log('  ' + (linkOk ? '✅' : '❌') + ' BUG 4: Google Fonts carrega a fonte do botão (link family=Poppins no público) — href=' + (linkOk && wP.document.querySelector('link[href*="family=Poppins"]').href.split('family=')[1]));
    if (!linkOk) fail++; else pass++;
  }

  /* ALVO customimg — modo "Imagem no botão inteiro" (link.customButtonImage).
     O card de imagem nasce no MESMO container do botão padrão (usa a MESMA
     classe base) e depende de largura 100% + stretch para ficar centralizado
     igual ao preview. O jsdom não resolve layout, então o contrato de
     largura/alinhamento é verificado nas próprias regras CSS dos dois lados
     (além de geometria inline). Bloqueia: contração de width/align-self nesse
     modo, largura inline por-link, retorno da "linha residual" (Bug 7,
     ::after) e perda do espaçamento individual por elemento (slot). */
  {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.style.blockGap = 16;
    c.links = [
      { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site', spacing: 10 },
      { id: 'l2', title: 'Botão imagem', url: 'https://wa.me/1', type: 'whatsapp', customButtonImage: 'https://cdn.axium.test/btn-wa.png', customButtonHeight: 120, spacing: 24 }
    ];
    wA.__axEditor.init(c);
    wP.__alaPublica.aplicar(c);
    const dA = wA.document;
    const dP = wP.document;
    const aStd = dA.querySelector('#previewLinksList .link-block:not(.link-block-customimg)');
    const aImg = dA.querySelector('#previewLinksList .link-block-customimg');
    const pStd = dP.querySelector('.pg-links-list .featured__card:not(.featured__card--customimg)');
    const pImg = dP.querySelector('.pg-links-list .featured__card--customimg');
    const report = (label, ok, det = '') => {
      console.log(`  ${ok ? '✅' : '❌'} ${label}${ok ? '' : ' — ' + det}`);
      if (ok) pass++; else fail++;
    };
    const GEOM = ['width', 'max-width', 'flex', 'align-self', 'justify-content', 'align-items', 'margin-left', 'margin-right', 'margin-bottom', 'display', 'text-align', 'aspect-ratio'];
    const geomDiff = (a, b) => comparePair('alvo', snapEl(a), snapEl(b), {}).filter((d) => GEOM.includes(d.prop));
    const fmt = (ds) => ds.length ? ds.map((x) => x.prop + '=' + x.a + '→' + x.b).join('; ') : '(iguais)';
    const exists = (a, b) => !!(a && b);
    const mt = (el) => (el && el.style.marginTop) || '(vazio)';
    const ruleState = (r) => r
      ? ((r.style.getPropertyValue('width') || '(vazio)') + '|' + (r.style.getPropertyValue('align-self') || '(vazio)'))
      : '(sem regra)';
    const fullW = (st) => /100%/.test(st) && /stretch/.test(st);
    const afterState = (r) => r ? (r.style.getPropertyValue('display') || '(vazio)') : '(sem regra)';
    const ruleP = findRule(allRules(wP), '.featured__card.featured__card--customimg');
    const ruleA = findRule(allRules(wA), '.link-block.link-block-customimg');
    const afterP = findRule(allRules(wP), '.featured__card.featured__card--customimg::after');
    const afterA = findRule(allRules(wA), '.link-block.link-block-customimg::after');

    console.log('\n━━━ ESPELHO | ALVO customimg (imagem no botão inteiro) ━━━');
    report('customimg: presente nos DOIS lados', exists(aImg, pImg), 'admin=' + (aImg ? 'sim' : 'não') + ' público=' + (pImg ? 'sim' : 'não'));
    report('customimg: parte do MESMO container (.link-block base) admin', !!(aImg && aImg.classList.contains('link-block')), (aImg && aImg.className) || '(ausente)');
    report('customimg: parte do MESMO container (.featured__card base) público', !!(pImg && pImg.classList.contains('featured__card')), (pImg && pImg.className) || '(ausente)');
    report('customimg: width:100% + align-self:stretch por regra (admin)', fullW(ruleState(ruleA)), ruleState(ruleA));
    report('customimg: width:100% + align-self:stretch por regra (público)', fullW(ruleState(ruleP)), ruleState(ruleP));
    report('customimg: sem width/flex/align-self inline (admin)', exists(aImg, aImg) && !(aImg.style.width || aImg.style.flex || aImg.style.alignSelf), 'width=' + (aImg && aImg.style.width || '(vazio)'));
    report('customimg: sem width/flex/align-self inline (público)', exists(pImg, pImg) && !(pImg.style.width || pImg.style.flex || pImg.style.alignSelf), 'width=' + (pImg && pImg.style.width || '(vazio)'));
    report('customimg: mesma geometria/alinhamento do botão padrão (admin)', exists(aStd, aImg) && geomDiff(aStd, aImg).length === 0, fmt(geomDiff(aStd, aImg)));
    report('customimg: mesma geometria/alinhamento do botão padrão (público)', exists(pStd, pImg) && geomDiff(pStd, pImg).length === 0, fmt(geomDiff(pStd, pImg)));
    report('customimg: geometria/alinhamento preview == público', (exists(aImg, pImg) && exists(aStd, pStd)) && geomDiff(aImg, pImg).length === 0 && geomDiff(aStd, pStd).length === 0, fmt([...geomDiff(aImg, pImg), ...geomDiff(aStd, pStd)]));
    report('customimg: ::after suprimido / linha residual (Bug 7) admin', afterState(afterA) === 'none', afterState(afterA));
    report('customimg: ::after suprimido / linha residual (Bug 7) público', afterState(afterP) === 'none', afterState(afterP));
    report('customimg: slot de espaçamento por elemento (admin 1º=0 / 2º=24px)', exists(aStd, aImg) && mt(aStd) === '0px' && mt(aImg) === '24px', 'padrão=' + mt(aStd) + ' imagem=' + mt(aImg));
    report('customimg: slot de espaçamento por elemento (público 1º=0 / 2º=24px)', exists(pStd, pImg) && mt(pStd) === '0px' && mt(pImg) === '24px', 'padrão=' + mt(pStd) + ' imagem=' + mt(pImg));
  }

  /* ALVO BUG 1 — regra CSS que destrava o alinhamento do ícone no modo
     lista. O .ia-* genérico (3 classes) perdia para o bloqueio do modo
     lista (.pg-links--list ... .featured__icon fixa o ícone ABSOLUTO à
     esquerda, 4 classes) → ícone preso no canto no público. O jsdom não
     resolve a cascata, então o contrato aqui é: as regras .ia-* escopadas
     em .pg-links--list existem, declaram left/right/position corretos e
     têm ESPECIFICIDADE maior que o bloqueio. */
  {
    const LOCK = '.pg-links--list .featured__card:not(.featured__card--banner) .featured__icon';
    const RIGHT = '.pg-links--list .featured__card:not(.featured__card--banner).ia-right .featured__icon';
    const CENTER = '.pg-links--list .featured__card:not(.featured__card--banner).ia-center .featured__icon';
    const report = (label, ok, det = '') => {
      console.log(`  ${ok ? '✅' : '❌'} ${label}${ok ? '' : ' — ' + det}`);
      if (ok) pass++; else fail++;
    };
    const spec = (sel) => {
      const ids = (sel.match(/#[\w-]+/g) || []).length;
      const cls = (sel.match(/\.[\w-]+/g) || []).length;
      const el = (sel.match(/(?:^|\s|[>+~])([a-z][\w-]*)/g) || []).length;
      return ids * 1e6 + cls * 1e4 + el;
    };
    const rs = allRules(wP);
    const lock = findRule(rs, LOCK);
    const r = findRule(rs, RIGHT);
    const c = findRule(rs, CENTER);
    const lockSpec = spec(LOCK);
    const rightOk = !!(r && r.style.getPropertyValue('right') === '0.875rem' && r.style.getPropertyValue('left') === 'auto' && spec(RIGHT) > lockSpec);
    const centerOk = !!(c && c.style.getPropertyValue('position') === 'static' && spec(CENTER) > lockSpec);
    const aR = findRule(rs, '.pg-links--list .featured__card:not(.featured__card--banner).ia-right .featured__arrow');
    const aC = findRule(rs, '.pg-links--list .featured__card:not(.featured__card--banner).ia-center .featured__arrow');
    const arrowOk = !!(aR && aR.style.getPropertyValue('display') === 'none' && aC && aC.style.getPropertyValue('display') === 'none');

    console.log('\n━━━ ESPELHO | ALVO bug1 (ícone no modo lista) ━━━');
    report('bug1: regra .ia-right vence o bloqueio (espec. ' + spec(RIGHT) + ' > ' + lockSpec + ') com left:auto right:.875rem', rightOk, r ? ('left=' + (r.style.getPropertyValue('left') || '(vazio)') + ' right=' + (r.style.getPropertyValue('right') || '(vazio)')) : '(sem regra)');
    report('bug1: regra .ia-center coloca ícone estático (position:static)', centerOk, c ? ('position=' + (c.style.getPropertyValue('position') || '(vazio)')) : '(sem regra)');
    report('bug1: seta oculta nos modos center/right em modo lista', arrowOk, 'right=' + (aR && aR.style.getPropertyValue('display') || '(sem regra)') + ' center=' + (aC && aC.style.getPropertyValue('display') || '(sem regra)'));
  }

  /* ================================================================
     REGRESSÃO PERMANENTE — Nome + selo de verificado = um ÚNICO bloco
     centralizado (BUG A+B). Causa raiz: chipFor (vidro/fundo do Nome)
     aplica display:block + width:fit-content + margin-left/right:auto no
     #pvName; dentro do wrap flex essas margens:auto absorvem o espaço
     livre e expulsam o selo para a borda. O preview do admin re-aplica
     essas margens em VÁRIOS caminhos do painel que chamam applyThemeVars()
     SEM o render completo (sliders de tipografia/vidro/padding/raio do
     Nome). Este exame prova que, MESMO depois desses eventos ao vivo, o
     Nome continua SEM margens automáticas e o conjunto permanece
     centralizado nos DOIS lados — com selo ativo E inativo, nome curto
     E longo.
     ================================================================ */
  {
    const marginSnap = (win, sel) => {
      const cs = win.getComputedStyle(win.document.querySelector(sel));
      const ml = cs.marginLeft, mr = cs.marginRight;
      return { noAuto: (ml === '' || ml === '0px') && (mr === '' || mr === '0px'), ml, mr };
    };
    const wrapSnap = (win, wrapSel, nameSel, badgeSel) => {
      const wrap = win.document.querySelector(wrapSel);
      if (!wrap) return { ok: false, det: 'wrap ausente' };
      const name = win.document.querySelector(nameSel);
      const badge = win.document.querySelector(badgeSel);
      const cs = win.getComputedStyle(wrap);
      return {
        ok: !!name && !!badge && wrap.contains(name) && wrap.contains(badge) && cs.justifyContent === 'center',
        det: 'justify=' + cs.justifyContent + ' contémName=' + (!!name && wrap.contains(name)) + ' contémSelo=' + (!!badge && wrap.contains(badge))
      };
    };
    const report = (label, ok, det = '') => {
      console.log(`  ${ok ? '✅' : '❌'} ${label}${ok ? '' : ' — ' + det}`);
      if (ok) pass++; else fail++;
    };
    const badgeCases = [
      { nome: 'verificado + chip (fundo no Nome) + nome CURTO + central',
        make: (c) => {
          c.profile.verified = true;
          c.design.profile.elem.name.bg = '#ff0000';
          c.design.profile.elem.name.size = 20;
          c.design.profile.elem.name.align = 'center';
        } },
      { nome: 'verificado + chip + nome LONGO (aproxima a largura máxima) + central',
        make: (c) => {
          c.profile.verified = true;
          c.design.profile.elem.name.bg = '#ff0000';
          c.design.profile.elem.name.size = 20;
          c.design.profile.elem.name.align = 'center';
          c.profile.displayName = 'Um Nome Muito Longo Que Se Aproxima Da Largura Máxima Do Conteiner Com O Chip Ativo';
        } },
      { nome: 'SEM selo (off) + chip — centralização mantida sem selo',
        make: (c) => {
          c.profile.verified = false;
          c.design.profile.elem.name.bg = '#ff0000';
          c.design.profile.elem.name.align = 'center';
        } }
    ];
    console.log('\n━━━ ESPELHO | REGRESSÃO Nome+Selo (BUG A+B — permanente) ━━━');
    for (const c of badgeCases) {
      const reg = JSON.parse(JSON.stringify(NEW_CONFIG));
      reg.links = [{ id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' }];
      c.make(reg);
      wA.__axEditor.init(reg);
      wP.__alaPublica.aplicar(reg);
      const label = c.nome;

      const wrapA = wrapSnap(wA, '.pv-name-wrap', '#pvName', '#pvVerified');
      const wrapP = wrapSnap(wP, '.profile__name-wrap', '#pgTitle', '#pgVerified');
      report(`${label}: wrap contém Nome+Selo e centraliza a dupla (admin)`, wrapA.ok, wrapA.det);
      report(`${label}: wrap contém Nome+Selo e centraliza a dupla (público)`, wrapP.ok, wrapP.det);

      const mA = marginSnap(wA, '#pvName');
      const mP = marginSnap(wP, '#pgTitle');
      report(`${label}: #pvName sem margens auto após render completo (admin)`, mA.noAuto, 'ml=' + mA.ml + ' mr=' + mA.mr);
      report(`${label}: #pgTitle sem margens auto após aplicar (público)`, mP.noAuto, 'ml=' + mP.ml + ' mr=' + mP.mr);

      /* Caminho VIVO do painel (onde o bug voltou): sliders do Nome que
         chamam applyThemeVars() e NADA mais — o chipFor re-aplica as
         margens:auto e, sem o alinhamento no fim do applyThemeVars, o
         selo é expulso para a borda. */
      for (const sid of ['nameSize', 'nameWeight', 'nameLs', 'nameLh', 'nameRadius', 'namePadV', 'namePadH']) {
        const input = wA.document.getElementById(sid);
        if (!input) continue;
        input.value = '1';
        input.dispatchEvent(new wA.Event('input'));
      }
      const gblur = wA.document.getElementById('nameGlassBlur');
      if (gblur) { gblur.value = '1'; gblur.dispatchEvent(new wA.Event('input')); }
      const gop = wA.document.getElementById('nameGlassOpacity');
      if (gop) { gop.value = '1'; gop.dispatchEvent(new wA.Event('input')); }

      const mAfter = marginSnap(wA, '#pvName');
      const wrapAfter = wrapSnap(wA, '.pv-name-wrap', '#pvName', '#pvVerified');
      report(`${label}: #pvName AINDA sem margens auto após sliders do painel (tipografia/vidro/padding/raio)`, mAfter.noAuto, 'ml=' + mAfter.ml + ' mr=' + mAfter.mr);
      report(`${label}: wrap AINDA centraliza Nome+Selo após sliders do painel`, wrapAfter.ok, wrapAfter.det);
    }
  }

  /* ================================================================
     REGRESSÃO PERMANENTE — PIX + cor padrão do Nome/Bio.
     BUG A: o trigger #pgPixWrap vivia FORA de #pageProfileInfo (irmão do
     header, filho direto de #pageFlow, sem order → flex order 0 > perfil
     com order 1) → aparecia no TOPO no público. Agora vive DENTRO do
     bloco de informações, como irmão do endereço = espelho do admin
     (#pvPix após #pvAddress).
     BUG B: o público hardcoded --profile-name-color (vermelho/salmão) e
     --profile-bio-color (verde) que VENCIAM a tinta do tema (--text-title),
     enquanto o admin segue --p-ink (escuro). Agora ambos seguem a tinta.
     Testa também: sem PIX nada aparece (hidden em ambos), com PIX mesma
     posição relativa.
     ================================================================ */
  {
    const report = (label, ok, det = '') => {
      console.log(`  ${ok ? '✅' : '❌'} ${label}${ok ? '' : ' — ' + det}`);
      if (ok) pass++; else fail++;
    };
    const mk = (baseC, mutate) => {
      const c = JSON.parse(JSON.stringify(baseC));
      c.links = [{ id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' }];
      if (mutate) mutate(c);
      return c;
    };
    const prevPix = (win) => {
      const el = win.document.getElementById(win === wA ? 'pvPix' : 'pgPixWrap');
      return el ? { el, hidden: el.hidden, parent: el.parentElement } : null;
    };

    console.log('\n━━━ ESPELHO | REGRESSÃO PIX + cor Nome/Bio (BUG A+B — permanente) ━━━');

    /* ---- BUG A: PIX dentro do bloco de informações, espelho do admin ---- */
    const pixReg = mk(NEW_CONFIG, (c) => {
      c.profile.pix = { enabled: true, key: 'jose@ventura.com', qr: 'https://cdn.axium.test/pix-qr.png', link: 'https://pay.axium.test/123' };
    });
    wA.__axEditor.init(pixReg);
    wP.__alaPublica.aplicar(pixReg);
    const aPix = prevPix(wA);
    const pPix = prevPix(wP);
    const pParent = pPix && pPix.parent;
    report('PIX ligado: trigger visível nos DOIS lados', !!(aPix && pPix && !aPix.hidden && !pPix.hidden), 'admin=' + (aPix && aPix.hidden) + ' público=' + (pPix && pPix.hidden));
    report('PIX ligado: #pgPixWrap vive DENTRO de #pageProfileInfo (público)', !!(pParent && pParent.id === 'pageProfileInfo'), pParent ? ('pai=' + pParent.id + '/' + pParent.className) : '(sem pai)');
    report('PIX ligado: #pvPix vive no MESMO container do endereço (admin)', !!(aPix && aPix.parent && aPix.parent.contains(wA.document.getElementById('pvAddress'))), aPix && aPix.parent ? ('pai=' + aPix.parent.id + '/' + aPix.parent.className) : '(sem pai)');
    const docPixFollowsAddr = (doc, wrapId, addrId) => {
      const wrap = doc.getElementById(wrapId);
      const addr = doc.getElementById(addrId);
      const N = doc.defaultView.Node;
      return !!(wrap && addr && (addr.compareDocumentPosition(wrap) & N.DOCUMENT_POSITION_FOLLOWING));
    };
    report('PIX ligado: endereço vem ANTES do PIX nos DOIS lados (mesma ordem relativa)', docPixFollowsAddr(wA.document, 'pvPix', 'pvAddress') && docPixFollowsAddr(wP.document, 'pgPixWrap', 'pgAddress'));

    const pixOff = mk(NEW_CONFIG, (c) => {
      c.profile.pix = { enabled: true, key: '', qr: '', link: '' };
    });
    wA.__axEditor.init(pixOff);
    wP.__alaPublica.aplicar(pixOff);
    const aPoff = prevPix(wA);
    const pPoff = prevPix(wP);
    report('PIX sem conteúdo: oculto nos DOIS lados', !!(aPoff && pPoff && aPoff.hidden && pPoff.hidden), 'admin=' + (aPoff && aPoff.hidden) + ' público=' + (pPoff && pPoff.hidden));
    report('PIX disabled: oculto nos DOIS lados', !!(aPoff && aPoff.hidden) || (function () {
      const c = mk(NEW_CONFIG, (cfg) => { cfg.profile.pix = { enabled: false, key: 'x', qr: '', link: '' }; });
      wA.__axEditor.init(c);
      wP.__alaPublica.aplicar(c);
      const a = prevPix(wA), p = prevPix(wP);
      return a && p && a.hidden && p.hidden;
    })());

    /* ---- BUG B: cor padrão do Nome/Bio segue a TINTA (não hardcoded) ---- */
    const noColor = mk(NEW_CONFIG, (c) => {
      delete c.design.profile.elem.name.color;
      delete c.design.profile.elem.bio.color;
      c.design.profile.elem.name.bg = '';
      c.design.profile.elem.bio.bg = '';
    });
    wA.__axEditor.init(noColor);
    wP.__alaPublica.aplicar(noColor);
    const nameSnapA = snapshot(wA, '#pvName');
    const nameSnapP = snapshot(wP, '#pgTitle');
    const nameDiff = comparePair('nome-cor', nameSnapA, nameSnapP, PAIR_ALLOW({ admin: '#pvName', public: '#pgTitle' })).filter((d) => d.prop === 'color');
    const bioSnapA = snapshot(wA, '#pvBio');
    const bioSnapP = snapshot(wP, '#pgSubtitle');
    const bioDiff = comparePair('bio-cor', bioSnapA, bioSnapP, PAIR_ALLOW({ admin: '#pvBio', public: '#pgSubtitle' })).filter((d) => d.prop === 'color');
    report('Nome sem cor custom: sem cor inline EM INLINE nos dois (nada divergente)', nameDiff.length === 0, nameDiff.map((d) => d.prop + '=' + d.a + '→' + d.b).join('; '));
    report('Bio sem cor custom: sem cor inline EM INLINE nos dois (nada divergente)', bioDiff.length === 0, bioDiff.map((d) => d.prop + '=' + d.a + '→' + d.b).join('; '));

    const pRules = allRules(wP);
    const nameColorRule = findRule(pRules, '.profile');
    const nameVar = nameColorRule && nameColorRule.style.getPropertyValue('--profile-name-color');
    const bioVar = nameColorRule && nameColorRule.style.getPropertyValue('--profile-bio-color');
    const noHardcoded = (v) => !v || !/dc2626|f87171|16a34a|4ade80/i.test(v) && /var\(--text-(title|body)\)/i.test(v);
    report('Público: --profile-name-color segue a TINTA (--text-title), nunca vermelho/salmão', noHardcoded(nameVar), nameVar || '(vazio)');
    report('Público: --profile-bio-color segue a TINTA (--text-body), nunca verde', noHardcoded(bioVar), bioVar || '(vazio)');
    report('Admin: .pv-name/.pv-bio sem cor própria (herdam --p-ink da página)', !wA.document.querySelector('#pvName').style.color && !wA.document.querySelector('#pvBio').style.color, 'name=' + (wA.document.querySelector('#pvName').style.color || '(vazio)') + ' bio=' + (wA.document.querySelector('#pvBio').style.color || '(vazio)'));
  }

  /* ================================================================
     REGRESSÃO PERMANENTE — alinhamento do Endereço (fixo à esquerda).
     A pílula de endereço visível SEMPRE força display:flex de nível BLOCO +
     width:fit-content + margens conforme o align nos DOIS lados. Antes:
     sem fundo/vidro o chipFor voltava a display:inline-flex num pai BLOCO
     (admin pv-page) e margens 'auto' são inertes em elemento inline → o
     endereço ficava sempre colado à esquerda. alignSelf é redundância.
     ================================================================ */
  {
    const report = (label, ok, det = '') => {
      console.log(`  ${ok ? '✅' : '❌'} ${label}${ok ? '' : ' — ' + det}`);
      if (ok) pass++; else fail++;
    };
    const mk = (baseC, mutate) => {
      const c = JSON.parse(JSON.stringify(baseC));
      c.links = [{ id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' }];
      if (mutate) mutate(c);
      return c;
    };
    const mkAddr = (align, bg) => mk(NEW_CONFIG, (c) => {
      c.design.profile.elem.address = Object.assign({}, c.design.profile.elem.address, { align, bg });
    });
    const addrSnap = (win, id) => {
      const el = win.document.getElementById(id);
      const s = win.getComputedStyle(el);
      return {
        display: el.style.display || s.display,
        width: el.style.width || s.width,
        ml: el.style.marginLeft || s.marginLeft,
        mr: el.style.marginRight || s.marginRight,
        alignSelf: el.style.alignSelf || s.alignSelf,
      };
    };
    const readPair = () => ({ a: addrSnap(wA, 'pvAddress'), p: addrSnap(wP, 'pgAddress') });
    const flex = (x) => /^flex$/.test(String(x));
    const fit = (x) => /fit-content/.test(String(x));

    console.log('\n━━━ ESPELHO | REGRESSÃO Endereço — nunca preso à esquerda ━━━');

    const checkAlign = (align, label) => {
      const c = mkAddr(align, '');
      wA.__axEditor.init(c);
      wP.__alaPublica.aplicar(c);
      const { a, p } = readPair();
      const col = (v) => /^0(px)?$/.test(String(v));
      const ok = (m) => align === 'left' ? col(m[0]) && m[1] === 'auto' : align === 'right' ? m[0] === 'auto' && col(m[1]) : m[0] === 'auto' && m[1] === 'auto';
      const det = (x) => `admin[display=${x.display} width=${x.width} ml=${x.ml} mr=${x.mr}] público[display=${p.display} width=${p.width} ml=${p.ml} mr=${p.mr}]`;
      report(`${label}: pílula block-level flex + width fit-content nos DOIS lados`, flex(a.display) && fit(a.width) && flex(p.display) && fit(p.width), det(a));
      report(`${label}: margens ${align === 'left' ? 'colam à esquerda' : align === 'right' ? 'colam à direita' : 'centralizam'} nos DOIS lados`, ok([a.ml, a.mr]) && ok([p.ml, p.mr]), `admin ml=${a.ml}/mr=${a.mr} público ml=${p.ml}/mr=${p.mr}`);
      report(`${label}: alignSelf redundante e IGUAL nos DOIS lados`, /flex-start|flex-end|center/.test(a.alignSelf) && a.alignSelf === p.alignSelf, `admin=${a.alignSelf} público=${p.alignSelf}`);
    };

    checkAlign('center', 'Endereço sem chip');
    checkAlign('left', 'Endereço sem chip');
    checkAlign('right', 'Endereço sem chip');

    const c = mkAddr('center', 'rgba(12,14,22,.82)');
    wA.__axEditor.init(c);
    wP.__alaPublica.aplicar(c);
    const { a, p } = readPair();
    report('Endereço com chip de fundo: continua block-level flex + margens que centralizam', flex(a.display) && flex(p.display) && fit(a.width) && fit(p.width) && a.ml === 'auto' && a.mr === 'auto' && p.ml === 'auto' && p.mr === 'auto', `admin[${a.display}|${a.width}|${a.ml}|${a.mr}] público[${p.display}|${p.width}|${p.ml}|${p.mr}]`);
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