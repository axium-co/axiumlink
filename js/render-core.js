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
    verified.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
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
    address.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg><span data-bind="profileAddress"></span>`;
    profileInfo.appendChild(address);
    elements.address = address;

    profileFrag.appendChild(profileInfo);

    /* PIX (fora do profileInfo, mas no header) */
    const pixWrap = document.createElement('div');
    pixWrap.id = 'pgPixWrap';
    pixWrap.className = 'pg-pix';
    pixWrap.hidden = true;
    pixWrap.innerHTML = `<button class="pg-pix__btn" type="button" data-dialog-open aria-haspopup="dialog"><svg class="pg-pix__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg><span>Pagar com PIX</span></button>`;
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

    if (categories.length > 0) {
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
      arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
      a.appendChild(arrow);

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
    ICON_MAP
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