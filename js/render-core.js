/**
 * render-core.js — Motor de renderização compartilhado (Admin + Público)
 * 
 * ÚNICA fonte de verdade para:
 * - Estrutura DOM do perfil (avatar, nome, bio, endereço, PIX)
 * - Estrutura DOM dos links (tabs + cards)
 * - Reordenação baseada em cfg.design.profile.elem.*.order
 * - Aplicação de estilos (delegada para módulos especializados)
 */

const RenderCore = (function () {
  'use strict';

  /* ================================================================
     ÍCONES CANÔNICOS (fonte única de verdade — preview admin == público)
     ================================================================ */
  const ICONS = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>',
    verified: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    pix: '<svg class="pg-pix__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
  };

  /* ================================================================
     ESTRUTURA DOM CANÔNICA
     ================================================================ */

  /**
   * Constrói a estrutura DOM completa do perfil + links
   * Retorna { profileFragment, linksFragment, elementsMap }
   * elementsMap = { avatar, name, bio, address, pix, tabs, linksWrap }
   */
  function buildDOM(cfg) {
    const profileFrag = document.createDocumentFragment();
    const linksFrag = document.createDocumentFragment();
    const elements = {};

    /* ---- PERFIL (header) ---- */
    const profileInfo = document.createElement('div');
    profileInfo.id = 'pageProfileInfo';
    profileInfo.className = 'profile__info';

    /* Avatar */
    const avatarCard = document.createElement('div');
    avatarCard.id = 'pgAvatarCard';
    avatarCard.className = 'avatar-glass-card';
    const avatar = document.createElement('div');
    avatar.className = 'profile__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    const avatarLetter = document.createElement('span');
    avatarLetter.id = 'pgAvatarLetter';
    const avatarImg = document.createElement('img');
    avatarImg.id = 'pgAvatarImg';
    avatarImg.className = 'profile__avatar-img';
    avatarImg.alt = '';
    avatarImg.hidden = true;
    avatar.appendChild(avatarLetter);
    avatar.appendChild(avatarImg);
    avatarCard.appendChild(avatar);
    profileInfo.appendChild(avatarCard);
    elements.avatar = avatarCard;

    /* Nome + selo verificado */
    const nameRow = document.createElement('div');
    nameRow.className = 'profile__name-row';
    const nameWrap = document.createElement('div');
    nameWrap.className = 'profile__name-wrap';
    const title = document.createElement('h1');
    title.className = 'profile__title';
    title.id = 'pgTitle';
    title.setAttribute('data-bind', 'profileName');
    const verified = document.createElement('span');
    verified.className = 'profile__verified';
    verified.id = 'pgVerified';
    verified.title = 'Perfil verificado';
    verified.setAttribute('aria-label', 'Perfil verificado');
    verified.hidden = true;
    verified.innerHTML = ICONS.verified;
    nameWrap.appendChild(title);
    nameWrap.appendChild(verified);
    nameRow.appendChild(nameWrap);
    profileInfo.appendChild(nameRow);
    elements.name = nameRow;
    elements.nameWrap = nameWrap;
    elements.title = title;
    elements.verified = verified;

    /* Bio */
    const bio = document.createElement('p');
    bio.className = 'profile__subtitle';
    bio.id = 'pgSubtitle';
    bio.setAttribute('data-bind', 'profileBio');
    profileInfo.appendChild(bio);
    elements.bio = bio;

    /* Endereço */
    const address = document.createElement('a');
    address.className = 'profile__address';
    address.id = 'pgAddress';
    address.href = 'https://www.google.com/maps';
    address.target = '_blank';
    address.rel = 'noopener';
    address.innerHTML = ICONS.pin + '<span data-bind="profileAddress"></span>';
    profileInfo.appendChild(address);
    elements.address = address;

    profileFrag.appendChild(profileInfo);

    /* PIX (fora do profileInfo, mas no header) */
    const pixWrap = document.createElement('div');
    pixWrap.id = 'pgPixWrap';
    pixWrap.className = 'pg-pix';
    pixWrap.hidden = true;
    pixWrap.innerHTML = `<button class="pg-pix__btn" type="button" data-dialog-open aria-haspopup="dialog">` + ICONS.pix + `<span>Pagar com PIX</span></button>`;
    profileFrag.appendChild(pixWrap);
    elements.pix = pixWrap;

    /* ---- LINKS (tabs + cards) ---- */
    const linksContainer = document.createElement('div');
    linksContainer.id = 'pgLinks';
    linksContainer.className = 'pg-links';
    linksFrag.appendChild(linksContainer);
    elements.linksContainer = linksContainer;

    return { profileFrag, linksFrag, elements };
  }

  /**
   * Reordena elementos do perfil conforme cfg.design.profile.elem.*.order
   * Funciona tanto no admin (mockup) quanto no público
   */
  function reorderProfileElements(profileContainer, cfg, isAdmin = false) {
    const pf = (cfg.design && cfg.design.profile) || {};
    const elem = pf.elem || {};

    /* No público, os elementos de perfil estão dentro de #pageProfileInfo (.profile__info)
       No admin, estão diretamente no container */
    const profileInfo = isAdmin
      ? profileContainer
      : profileContainer.querySelector('#pageProfileInfo, .profile__info') || profileContainer;

    const selectors = isAdmin
      ? {
          avatar: '#pvAvatarWrap',
          name: '.pv-name-row',
          bio: '#pvBio',
          address: '#pvAddress',
          pix: '#pvPix'
        }
      : {
          avatar: '#pgAvatarCard',
          name: '.profile__name-row',
          bio: '#pgSubtitle',
          address: '#pgAddress',
          pix: '#pgPixWrap'
        };

    const elements = [
      { key: 'avatar', selector: selectors.avatar, getOrder: () => (elem.avatar && elem.avatar.order != null) ? elem.avatar.order : 0 },
      { key: 'name', selector: selectors.name, getOrder: () => (elem.name && elem.name.order != null) ? elem.name.order : 1 },
      { key: 'bio', selector: selectors.bio, getOrder: () => (elem.bio && elem.bio.order != null) ? elem.bio.order : 2 },
      { key: 'address', selector: selectors.address, getOrder: () => (elem.address && elem.address.order != null) ? elem.address.order : 3 },
      { key: 'pix', selector: selectors.pix, getOrder: () => 4 }
    ];

    elements.sort((a, b) => a.getOrder() - b.getOrder());

    elements.forEach(({ selector }) => {
      const el = profileInfo.querySelector(selector);
      if (el && el.parentElement === profileInfo) {
        profileInfo.appendChild(el);
      }
    });

    /* PIX pode estar fora do profileInfo no público */
    if (!isAdmin) {
      const pixEl = profileContainer.querySelector(selectors.pix);
      if (pixEl && pixEl.parentElement === profileContainer) {
        profileContainer.appendChild(pixEl);
      }
    }
  }

  /* ================================================================
     SISTEMA DE ESTILO DE BOTÕES UNIFICADO (portado do admin.html)
     ================================================================ */

  /* Mapeamento de shapes para CSS */
  const BUTTON_SHAPES = {
    square:    { borderRadius: '0px' },
    soft:      { borderRadius: '6px' },
    rounded:   { borderRadius: '16px' },
    pill:      { borderRadius: '9999px' },
    organic:   { borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' },
    bubble:    { borderRadius: '50% 20% 50% 20% / 20% 50% 20% 50%' },
    diagonal:  { borderRadius: '20px 0px 20px 0px' },
    double:    { borderRadius: '8px', border: '4px double currentColor' },
    brutalist: { borderRadius: '0px', border: '3px solid #000', boxShadow: '5px 5px 0px #000' },
    custom:    { borderRadius: 'var(--btn-radius, 14px)' }
  };

  const ANIM_CLASSES = ['anim-pulse', 'anim-float', 'anim-shine', 'pv-anim-pulse', 'pv-anim-float', 'pv-anim-shine'];

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  function mixHex(hex1, hex2, weight) {
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    const r = Math.round(r1 * (1 - weight) + r2 * weight);
    const g = Math.round(g1 * (1 - weight) + g2 * weight);
    const b = Math.round(b1 * (1 - weight) + b2 * weight);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function rgbaCss(hex, alpha) {
    if (hex === 'transparent') return 'transparent';
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function isInvisColor(hex) {
    return hex === 'transparent' || hex === '';
  }

  /**
   * Converte estilo individual (schema premium do admin) para formato flat
   * compatível com buildButtonCSS
   */
  function linkStyleToFlat(linkStyle, globalStyle) {
    if (!linkStyle) return {};
    const base = {
      variant: 'solid',
      format: 'rounded',
      animation: 'none',
      shadow: { type: 'soft', intensity: 30 },
      radius: 14,
      glow: '#22d3ee',
      gradient: { start: '#6366f1', end: '#ec4899', angle: 135 },
      glass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 25 },
      colors: { background: '', text: '' },
      displayStyle: 'box'
    };
    const s = Object.assign({}, base, linkStyle);
    const sh = Object.assign({ type: 'soft', intensity: 30 }, base.shadow, linkStyle.shadow || {});
    const gr = Object.assign({ start: '#6366f1', end: '#ec4899', angle: 135 }, base.gradient, linkStyle.gradient || {});
    const gl = Object.assign({}, base.glass, linkStyle.glass || {});
    const co = Object.assign({ background: '', text: '' }, base.colors, linkStyle.colors || {});
    const pick = (v, fb) => (v === '' || v == null) ? fb : v;
    return {
      btnVariant: s.variant,
      btnShape: s.format,
      btnAnimation: s.animation,
      btnShadowStyle: sh.type,
      btnShadow: sh.intensity,
      btnRadius: s.radius,
      btnGlowColor: s.glow,
      btnGradientStart: gr.start,
      btnGradientEnd: gr.end,
      btnGradientAngle: gr.angle,
      btnGlassOpacity: gl.opacity,
      btnGlassBlur: gl.blur,
      btnGlassBorderOpacity: gl.borderOpacity,
      btnBgColor: pick(co.background, ''),
      btnTextColor: pick(co.text, ''),
      btnGlassEnabled: gl.enabled,
      btnGlassSaturate: gl.saturate,
      btnGlassColor: gl.color,
      btnGlassBorderGlow: gl.borderGlow,
      btnGlassShadowDepth: gl.shadowDepth,
      btnGlassHighlight: gl.highlight,
      btnGlassNoise: gl.noise,
      displayStyle: s.displayStyle || 'box'
    };
  }

  /**
   * Gera CSS do botão baseado na variante (merge global + individual)
   * st = estilo mesclado (global + individual), t = cores do tema
   */
  function buildButtonCSS(st, t) {
    const shape = BUTTON_SHAPES[st.btnShape] || BUTTON_SHAPES.rounded;

    /* Sombra */
    const sStyle = st.btnShadowStyle || 'soft';
    const alpha = (st.btnShadow ?? 30) / 100;
    let shadow;
    if (sStyle === 'none') shadow = 'none';
    else if (sStyle === 'neumorph') shadow = '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.8)';
    else if (sStyle === 'glow') shadow = '0 0 15px currentColor';
    else shadow = alpha > 0
      ? `0 ${Math.round(alpha * 10)}px ${Math.round(alpha * 26)}px rgba(0,0,0,${(alpha * .35).toFixed(2)})`
      : 'none';

    const base = Object.assign({
      boxShadow: shadow,
      transition: 'all 0.2s ease'
    }, shape);

    switch (st.btnVariant) {
      case 'glass': {
        const blur = (st.btnGlassBlur ?? 12) + 'px';
        const opacity = (st.btnGlassOpacity ?? 15) / 100;
        return {
          ...base,
          background: `rgba(255,255,255,${opacity})`,
          color: t.ink,
          backdropFilter: `blur(${blur})`,
          WebkitBackdropFilter: `blur(${blur})`,
          border: '1px solid rgba(255,255,255,0.25)',
          ...shape
        };
      }
      case 'neon': {
        const glow = st.btnGlowColor || '#22d3ee';
        return {
          ...base,
          background: 'transparent',
          color: glow,
          border: `2px solid ${glow}`,
          ...shape
        };
      }
      case 'neumorphic': {
        const isDark = t.bg.includes('dark') || t.bg.includes('#0b') || t.bg.includes('#0a') || t.bg.includes('#11');
        const bgColor = isDark ? '#1f2937' : '#e0e5ec';
        return {
          ...base,
          background: bgColor,
          color: t.ink,
          border: 'none',
          ...shape
        };
      }
      case 'ghost': {
        return {
          ...base,
          background: 'transparent',
          color: t.btnbg,
          border: `2px solid ${t.btnbg}`,
          ...shape
        };
      }
      case 'gradient-soft': {
        const gBase = (st.btnBgColor && !isInvisColor(st.btnBgColor)) ? st.btnBgColor : t.btnbg;
        return {
          ...base,
          background: `linear-gradient(140deg, ${mixHex(gBase, '#ffffff', 0.22)}, ${mixHex(gBase, '#000000', 0.16)})`,
          color: '#ffffff',
          border: '1px solid rgba(255,255,255,0.15)',
          ...shape
        };
      }
      case 'gradient': {
        return {
          ...base,
          background: `linear-gradient(${st.btnGradientAngle || 135}deg, ${st.btnGradientStart || '#6366f1'}, ${st.btnGradientEnd || '#ec4899'})`,
          color: '#ffffff',
          border: 'none',
          ...shape
        };
      }
      default: /* solid */
        return {
          ...base,
          background: st.btnBgColor || t.btnbg,
          color: st.btnTextColor || t.btnink,
          border: 'none',
          ...shape
        };
    }
  }

  /**
   * Aplica estilos de botão (merge global + individual) ao elemento
   */
  function applyButtonStyles(btn, linkStyle, globalStyle, themeColors) {
    if (!btn) return;

    /* Remove classes de animação anteriores */
    btn.classList.remove(...ANIM_CLASSES);

    const isCustomImg = btn.classList.contains('featured__card--customimg');
    const isHighlight = btn.classList.contains('featured__card--highlight');
    const isTestimonial = btn.classList.contains('featured__card--testimonial');

    /* Botões especiais (customimg, highlight, testimonial) não recebem estilo global de botão */
    if (isCustomImg) {
      btn.classList.remove('ax-text-only');
      Object.assign(btn.style, {
        border: 'none',
        boxShadow: 'none',
        background: 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        textShadow: 'none'
      });
      return;
    }

    if (isHighlight || isTestimonial) {
      /* Estes usam o estilo do card, mas podem ter animação individual */
      const merged = linkStyleToFlat(linkStyle, globalStyle);
      const bAnim = merged.btnAnimation || 'none';
      if (bAnim === 'pulse') btn.classList.add('anim-pulse');
      else if (bAnim === 'float') btn.classList.add('anim-float');
      else if (bAnim === 'shine') btn.classList.add('anim-shine');
      return;
    }

    /* Botão padrão: estilo individual vence; global é fallback apenas
       para links LEGADO (sem style próprio). Mockup e público usam a
       MESMA lógica — fonte única. */
    const flat = linkStyleToFlat(linkStyle, globalStyle);
    const merged = linkStyle ? flat : Object.assign({}, globalStyle, flat);
    const isTextOnly = (merged.displayStyle || 'box') === 'text-only';

    if (isTextOnly) {
      btn.classList.remove('ghost', 'neumorphic');
      btn.classList.add('ax-text-only');
      Object.assign(btn.style, {
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: '0',
        borderRadius: '0',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        textShadow: 'none',
        display: 'inline',
        width: 'auto',
        maxWidth: 'none',
        flex: 'none',
        textDecoration: 'underline',
        cursor: 'pointer'
      });
      return;
    }

    /* Aplica CSS da variante */
    const bCSS = buildButtonCSS(merged, themeColors);
    const bVariant = merged.btnVariant || 'solid';
    const bAnim = merged.btnAnimation || 'none';

    Object.assign(btn.style, bCSS);
    btn.classList.remove('ax-text-only');
    btn.classList.remove('ghost', 'neumorphic');
    if (bVariant === 'ghost' || bVariant === 'neumorphic') btn.classList.add(bVariant);
    if (bAnim === 'pulse') btn.classList.add('anim-pulse');
    else if (bAnim === 'float') btn.classList.add('anim-float');
    else if (bAnim === 'shine') btn.classList.add('anim-shine');
  }

  /**
   * Extrai cores do tema do cfg para passar ao buildButtonCSS
   */
  function extractThemeColors(cfg) {
    const st = cfg.style || {};
    const THEMES = {
      indigo:  { bg:'#f9fafb', ink:'#111827', btnbg:'#111827', btnink:'#ffffff' },
      light:   { bg:'#ffffff', ink:'#1f2937', btnbg:'#2563eb', btnink:'#ffffff' },
      dark:    { bg:'#0b1220', ink:'#e5e7eb', btnbg:'#1f2937', btnink:'#f9fafb' },
      sunset:  { bg:'linear-gradient(180deg,#fff7ed,#ffedd5)', ink:'#7c2d12', btnbg:'#ea580c', btnink:'#ffffff' },
      ocean:   { bg:'linear-gradient(180deg,#ecfeff,#cffafe)', ink:'#164e63', btnbg:'#0891b2', btnink:'#ffffff' },
      forest:  { bg:'linear-gradient(180deg,#f0fdf4,#dcfce7)', ink:'#14532d', btnbg:'#16a34a', btnink:'#ffffff' },
      rose:    { bg:'linear-gradient(180deg,#fff1f2,#ffe4e6)', ink:'#881337', btnbg:'#e11d48', btnink:'#ffffff' }
    };
    const th = THEMES[st.theme] || THEMES.indigo;
    return {
      bg: st.pageBgColor || th.bg,
      ink: st.pageTextColor || th.ink,
      btnbg: st.btnBgColor || th.btnbg,
      btnink: st.btnTextColor || th.btnink
    };
  }

  /**
   * Renderiza tabs de categorias + lista de links
   * Retorna o wrapper das tabs (para insertBefore no linksContainer)
   */
  function renderLinksList(linksContainer, links, cfg, isAdmin = false) {
    const cardsMode = cfg.layout?.cardsMode || 'list';
    const isList = cardsMode === 'list';

    /* Estado da categoria ativa persiste no container (sobrevive a re-renders) */
    const activeCat = linksContainer.dataset.activeCategory || null;

    /* Limpa container */
    linksContainer.replaceChildren();
    if (isList) {
      linksContainer.classList.remove('pg-links--grid');
      linksContainer.classList.add('pg-links--list');
    } else {
      linksContainer.classList.remove('pg-links--list');
      linksContainer.classList.add('pg-links--grid');
    }

    /* ---- Categorias / Tabs ---- */
    const categories = [...new Set((links || []).map(l => l.category).filter(Boolean))];
    let tabsWrap = null;

    if (cfg.style?.showCategoryTabs && categories.length > 0) {
      tabsWrap = document.createElement('div');
      tabsWrap.className = 'pg-tabs';
      const allTab = document.createElement('button');
      allTab.className = 'pg-tab' + (activeCat === null ? ' pg-tab--active' : '');
      allTab.textContent = 'Todos';
      allTab.addEventListener('click', () => {
        linksContainer.dataset.activeCategory = '';
        renderLinksList(linksContainer, links, cfg, isAdmin);
      });
      tabsWrap.appendChild(allTab);

      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'pg-tab' + (activeCat === cat ? ' pg-tab--active' : '');
        btn.textContent = cat;
        btn.addEventListener('click', () => {
          linksContainer.dataset.activeCategory = cat;
          renderLinksList(linksContainer, links, cfg, isAdmin);
        });
        tabsWrap.appendChild(btn);
      });

      const globalGap = Number(cfg.style?.blockGap) >= 0 ? Number(cfg.style?.blockGap) : 10;
      tabsWrap.style.marginBottom = globalGap + 'px';
      linksContainer.appendChild(tabsWrap);
    }

    const activeCatForFilter = linksContainer.dataset.activeCategory || null;
    const filtered = activeCatForFilter ? links.filter(l => l.category === activeCatForFilter) : links;

    /* ---- Cards de links ---- */
    const wrap = document.createElement('div');
    wrap.className = isList ? 'pg-links-list' : 'pg-links';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = isList ? 'column' : 'row';
    if (!isList) {
      wrap.style.flexWrap = 'wrap';
      wrap.style.gap = '0.75rem';
      wrap.style.justifyContent = 'center';
    }

    filtered.forEach((link, li) => {
      const linkType = link.type || link.icon || '';
      const displayTitle = link.title || (linkType ? (linkType.charAt(0).toUpperCase() + linkType.slice(1)) : 'Link');
      const linkHref = link.url || '#';

      if (link.customButtonImage) {
        /* Imagem customizada = botão inteiro */
        const a = document.createElement('a');
        a.className = 'featured__card featured__card--customimg';
        a.dataset.linkIdx = String(li);
        a.href = linkHref;
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', displayTitle);
        a.title = linkHref || displayTitle;
        if (link.animation && link.animation !== 'none') a.classList.add('anim-' + link.animation);
        applyButtonWidth(a, link.width);
        const h = Number(link.customButtonHeight);
        a.style.setProperty('--customimg-h', (h > 40 ? h : 84) + 'px');
        const img = document.createElement('img');
        img.className = 'featured__customimg';
        img.src = link.customButtonImage;
        img.alt = displayTitle;
        img.loading = 'lazy';
        a.appendChild(img);
        /* Aplica estilo (limpa estilos de botão para customimg) */
        const themeColors = extractThemeColors(cfg);
        applyButtonStyles(a, link.style, cfg.style, themeColors);
        wrap.appendChild(a);
        return;
      }

      const a = document.createElement('a');
      a.className = 'featured__card';
      a.dataset.linkIdx = String(li);
      a.href = linkHref;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', displayTitle);
      a.title = linkHref || displayTitle;

      if (link.animation && link.animation !== 'none') a.classList.add('anim-' + link.animation);
      if (link.iconAlign === 'center') a.classList.add('ia-center');
      else if (link.iconAlign === 'right') a.classList.add('ia-right');
      applyButtonWidth(a, link.width);

      if (link.cardStyle === 'highlight') {
        a.classList.add('featured__card--highlight');
        const body = document.createElement('span');
        body.className = 'featured__body';
        const strong = document.createElement('strong');
        strong.textContent = displayTitle;
        body.appendChild(strong);
        if (link.sub) {
          const sub = document.createElement('span');
          sub.className = 'featured__sub';
          sub.textContent = link.sub;
          body.appendChild(sub);
        }
        a.appendChild(body);
        /* Aplica estilo (animação individual) */
        const themeColors = extractThemeColors(cfg);
        applyButtonStyles(a, link.style, cfg.style, themeColors);
        wrap.appendChild(a);
        return;
      }

      if (link.cardStyle === 'testimonial') {
        a.classList.add('featured__card--testimonial');
        const body = document.createElement('span');
        body.className = 'featured__body';
        const strong = document.createElement('strong');
        strong.textContent = displayTitle;
        body.appendChild(strong);
        if (link.sub) {
          const sub = document.createElement('span');
          sub.className = 'featured__sub';
          sub.textContent = '— ' + link.sub;
          body.appendChild(sub);
        }
        a.appendChild(body);
        /* Aplica estilo (animação individual) */
        const themeColors2 = extractThemeColors(cfg);
        applyButtonStyles(a, link.style, cfg.style, themeColors2);
        wrap.appendChild(a);
        return;
      }

      /* Botão padrão: ícone + texto + seta */
      const icon = document.createElement('div');
      icon.className = 'featured__icon';
      const iconType = link.iconImg ? 'img' : (linkType || '');
      if (link.iconImg) {
        const img = document.createElement('img');
        img.className = 'featured__icon-img';
        img.src = link.iconImg;
        img.alt = '';
        icon.appendChild(img);
      } else if (iconType) {
        const i = document.createElement('i');
        i.className = resolveIconClass(iconType);
        icon.appendChild(i);
      }
      a.appendChild(icon);

      const body = document.createElement('div');
      body.className = 'featured__body';
      const strong = document.createElement('strong');
      strong.textContent = displayTitle;
      body.appendChild(strong);
      if (link.sub) {
        const sub = document.createElement('span');
        sub.className = 'featured__sub';
        sub.textContent = link.sub;
        body.appendChild(sub);
      }
      a.appendChild(body);

      const arrow = document.createElement('div');
      arrow.className = 'featured__arrow';
      arrow.innerHTML = ICONS.arrow;
      a.appendChild(arrow);

      /* Aplica estilo de botão (merge global + individual do link.style) */
      const themeColors = extractThemeColors(cfg);
      applyButtonStyles(a, link.style, cfg.style, themeColors);

      wrap.appendChild(a);
    });

    linksContainer.appendChild(wrap);

    /* Espaçamento vertical (apenas modo lista) */
    if (isList) {
      applyLinkSpacing(wrap, filtered, cfg);
    }

    return tabsWrap;
  }

  function applyButtonWidth(btn, width) {
    btn.style.width = '';
    btn.style.maxWidth = '';
    btn.style.flex = '';
    btn.style.padding = '';
    btn.style.alignSelf = '';
    if (width === 'full') {
      btn.style.width = '100%';
      btn.style.maxWidth = '100%';
      btn.style.flex = '0 0 100%';
    } else if (width === 'half') {
      btn.style.width = 'calc(50% - 6px)';
      btn.style.flex = '0 0 calc(50% - 6px)';
      btn.style.alignSelf = 'center';
    } else if (width === 'compact') {
      btn.style.width = 'max-content';
      btn.style.flex = 'initial';
      btn.style.padding = '10px 20px';
      btn.style.alignSelf = 'center';
    }
  }

  function applyLinkSpacing(wrap, list, cfg) {
    const globalGap = Number(cfg.style?.blockGap) >= 0 ? Number(cfg.style?.blockGap) : 10;
    Array.from(wrap.children).forEach((child, i) => {
      if (child.classList && child.classList.contains('pg-tabs')) {
        child.style.marginTop = '0px';
        child.style.marginBottom = globalGap + 'px';
        return;
      }
      const link = list && list[i];
      const slot = (link && Number(link.spacing) > 0) ? Number(link.spacing) : globalGap;
      child.style.marginTop = (i === 0 ? 0 : slot) + 'px';
      child.style.marginBottom = '0px';
    });
  }

  /* Mapeamento de ícones (subset — expandir conforme necessário) */
  const ICON_MAP = {
    'whatsapp': 'fab fa-whatsapp',
    'instagram': 'fab fa-instagram',
    'tiktok': 'fab fa-tiktok',
    'youtube': 'fab fa-youtube',
    'twitter': 'fab fa-x-twitter',
    'x': 'fab fa-x-twitter',
    'linkedin': 'fab fa-linkedin-in',
    'facebook': 'fab fa-facebook',
    'telegram': 'fab fa-telegram',
    'email': 'fas fa-envelope',
    'mail': 'fas fa-envelope',
    'spotify': 'fab fa-spotify',
    'discord': 'fab fa-discord',
    'twitch': 'fab fa-twitch',
    'github': 'fab fa-github',
    'pinterest': 'fab fa-pinterest',
    'snapchat': 'fab fa-snapchat',
    'reddit': 'fab fa-reddit',
    'threads': 'fab fa-threads',
    'behance': 'fab fa-behance',
    'dribbble': 'fab fa-dribbble',
    'medium': 'fab fa-medium',
    'substack': 'fas fa-newspaper',
    'steam': 'fab fa-steam',
    'paypal': 'fab fa-paypal',
    'signal': 'fab fa-signal-messenger',
    'localizacao': 'fas fa-map-marker-alt',
    'site': 'fas fa-globe',
    'link': 'fas fa-link'
  };

  function resolveIconClass(type) {
    return ICON_MAP[type] || '';
  }

  /* API pública */
  return {
    buildDOM,
    reorderProfileElements,
    renderLinksList,
    applyButtonWidth,
    applyLinkSpacing,
    resolveIconClass,
    ICON_MAP,
    ICONS
  };
})();

/* Export para uso em browser (admin.html e index.html) */
if (typeof window !== 'undefined') {
  window.RenderCore = RenderCore;
}

/* Export para Node/testes */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RenderCore;
}