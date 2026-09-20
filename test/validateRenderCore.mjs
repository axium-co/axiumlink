/**
 * Teste do render-core.js — valida estrutura DOM + reorder
 * 
 * Rodar: node test/validateRenderCore.mjs
 */

import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Carrega render-core.js no JSDOM */
const renderCoreCode = readFileSync(join(root, 'js/render-core.js'), 'utf8');

function createWindow() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://axiumlink.test/'
  });
  const { window } = dom;
  window.eval(renderCoreCode);
  return { window, dom };
}

/* Config de teste */
const TEST_CFG = {
  profile: {
    name: 'Teste Cliente',
    bio: 'Bio de teste',
    address: 'Rua Teste, 123',
    verified: true
  },
  links: [
    { id: '1', title: 'WhatsApp', url: 'https://wa.me/123', icon: 'whatsapp', category: 'CONTATO' },
    { id: '2', title: 'Instagram', url: 'https://instagram.com/test', icon: 'instagram', category: 'REDES' },
    { id: '3', title: 'Site', url: 'https://site.com', icon: 'site', category: 'CONTATO' }
  ],
  layout: { cardsMode: 'list' },
  style: { blockGap: 12 },
  design: {
    profile: {
      elem: {
        avatar: { order: 0 },
        name: { order: 1 },
        bio: { order: 2 },
        address: { order: 3 }
      }
    }
  }
};

function assert(condition, msg) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

function runTests() {
  console.log('\n=== TESTES RENDER-CORE ===\n');

  const { window } = createWindow();
  const { RenderCore } = window;
  const { document } = window;

  /* ---- Teste 1: buildDOM cria estrutura correta ---- */
  console.log('Teste 1: buildDOM cria estrutura canônica');
  const { profileFrag, linksFrag, elements } = RenderCore.buildDOM(TEST_CFG);

  assert(profileFrag instanceof window.DocumentFragment, 'profileFrag é DocumentFragment');
  assert(linksFrag instanceof window.DocumentFragment, 'linksFrag é DocumentFragment');

  /* Verifica elementos do perfil */
  assert(elements.avatar?.id === 'pgAvatarCard', 'Avatar card tem id pgAvatarCard');
  assert(elements.avatar?.className === 'avatar-glass-card', 'Avatar card tem classe avatar-glass-card');
  assert(elements.avatar?.querySelector('.profile__avatar'), 'Avatar card contém .profile__avatar');
  assert(elements.avatar?.querySelector('#pgAvatarLetter'), 'Avatar tem #pgAvatarLetter');
  assert(elements.avatar?.querySelector('#pgAvatarImg'), 'Avatar tem #pgAvatarImg');

  assert(elements.name?.className === 'profile__name-row', 'Name row tem classe profile__name-row');
  assert(elements.nameWrap?.className === 'profile__name-wrap', 'Name wrap tem classe profile__name-wrap');
  assert(elements.title?.id === 'pgTitle', 'Título tem id pgTitle');
  assert(elements.title?.className === 'profile__title', 'Título tem classe profile__title');
  assert(elements.verified?.id === 'pgVerified', 'Verificado tem id pgVerified');
  assert(elements.verified?.className === 'profile__verified', 'Verificado tem classe profile__verified');
  assert(elements.verified?.hidden === true, 'Verificado começa hidden');

  assert(elements.bio?.id === 'pgSubtitle', 'Bio tem id pgSubtitle');
  assert(elements.bio?.className === 'profile__subtitle', 'Bio tem classe profile__subtitle');

  assert(elements.address?.id === 'pgAddress', 'Endereço tem id pgAddress');
  assert(elements.address?.className === 'profile__address', 'Endereço tem classe profile__address');
  assert(elements.address?.href?.includes('google.com/maps'), 'Endereço tem href correto');

  assert(elements.pix?.id === 'pgPixWrap', 'PIX wrap tem id pgPixWrap');
  assert(elements.pix?.className === 'pg-pix', 'PIX wrap tem classe pg-pix');
  assert(elements.pix?.hidden === true, 'PIX wrap começa hidden');

  assert(elements.linksContainer?.id === 'pgLinks', 'Links container tem id pgLinks');
  assert(elements.linksContainer?.className === 'pg-links', 'Links container tem classe pg-links');

  /* ---- Teste 2: Reorder padrão (ordem 0,1,2,3) ---- */
  console.log('\nTeste 2: Reorder padrão (avatar→nome→bio→endereço→pix)');
  const profileOuter = document.createElement('div');
  profileOuter.appendChild(profileFrag.cloneNode(true));
  console.log('  Before reorder:', Array.from(profileOuter.children).map(el => el.id || el.className));
  console.log('  Inside pageProfileInfo:', Array.from(profileOuter.querySelector('#pageProfileInfo')?.children || []).map(el => el.id || el.className));
  RenderCore.reorderProfileElements(profileOuter, TEST_CFG, false);
  console.log('  After reorder:', Array.from(profileOuter.children).map(el => el.id || el.className));
  console.log('  Inside pageProfileInfo:', Array.from(profileOuter.querySelector('#pageProfileInfo')?.children || []).map(el => el.id || el.className));

  const profileInfo = profileOuter.querySelector('#pageProfileInfo');
  const order = Array.from(profileInfo.children).map(el => el.id || el.className);
  const pixPresent = profileOuter.querySelector('#pgPixWrap') !== null;
  assert(order[0] === 'pgAvatarCard', '1º = avatar');
  assert(order[1] === 'profile__name-row', '2º = nome');
  assert(order[2] === 'pgSubtitle', '3º = bio');
  assert(order[3] === 'pgAddress', '4º = endereço');
  assert(pixPresent, 'PIX presente no container externo');

  /* ---- Teste 3: Reorder customizado (nome primeiro, avatar último) ---- */
  console.log('\nTeste 3: Reorder customizado (nome→bio→endereço→pix→avatar)');
  const cfgCustom = JSON.parse(JSON.stringify(TEST_CFG));
  cfgCustom.design.profile.elem = {
    avatar: { order: 4 },
    name: { order: 0 },
    bio: { order: 1 },
    address: { order: 2 }
  };
  const profileOuter2 = document.createElement('div');
  profileOuter2.appendChild(profileFrag.cloneNode(true));
  RenderCore.reorderProfileElements(profileOuter2, cfgCustom, false);

  const profileInfo2 = profileOuter2.querySelector('#pageProfileInfo');
  const order2 = Array.from(profileInfo2.children).map(el => el.id || el.className);
  const pixOrder2 = profileOuter2.querySelector('#pgPixWrap') ? 'pgPixWrap' : 'missing';
  assert(order2[0] === 'profile__name-row', '1º = nome (order 0)');
  assert(order2[1] === 'pgSubtitle', '2º = bio (order 1)');
  assert(order2[2] === 'pgAddress', '3º = endereço (order 2)');
  assert(order2[3] === 'pgAvatarCard', '4º = avatar (order 4)');
  assert(pixOrder2 === 'pgPixWrap', 'PIX presente no container externo');

  /* ---- Teste 4: renderLinksList cria tabs + cards ---- */
  console.log('\nTeste 4: renderLinksList cria tabs + cards em modo lista');
  const linksContainer = document.createElement('div');
  linksContainer.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainer, TEST_CFG.links, TEST_CFG, false);

  const tabs = linksContainer.querySelector('.pg-tabs');
  assert(tabs, 'Tabs wrapper criado');
  assert(tabs.querySelectorAll('.pg-tab').length === 3, '3 tabs (Todos + 2 categorias)');
  assert(tabs.querySelector('.pg-tab--active')?.textContent === 'Todos', 'Tab "Todos" ativa por padrão');

  const listWrap = linksContainer.querySelector('.pg-links-list');
  assert(listWrap, 'Wrapper da lista criado');
  assert(listWrap.style.flexDirection === 'column', 'Lista em coluna');

  const cards = listWrap.querySelectorAll('.featured__card');
  assert(cards.length === 3, '3 cards renderizados (todos os links)');

  /* Verifica estrutura do card padrão */
  const card1 = cards[0];
  assert(card1.querySelector('.featured__icon'), 'Card tem ícone');
  assert(card1.querySelector('.featured__body'), 'Card tem body');
  assert(card1.querySelector('.featured__body strong')?.textContent === 'WhatsApp', 'Card 1 = WhatsApp');
  assert(card1.querySelector('.featured__arrow'), 'Card tem seta');
  assert(card1.dataset.linkIdx === '0', 'Card tem data-link-idx');

  /* ---- Teste 5: Filtro por categoria ---- */
  console.log('\nTeste 5: Filtro por categoria (clique na tab)');
  const tabContato = tabs.querySelectorAll('.pg-tab')[1]; // CONTATO
  assert(tabContato.textContent === 'CONTATO', 'Tab 2 = CONTATO');
  tabContato.click();

  // Re-query after re-render (click handler replaces the entire container content)
  const newListWrap = linksContainer.querySelector('.pg-links-list');
  const cardsAfterFilter = newListWrap.querySelectorAll('.featured__card');
  assert(cardsAfterFilter.length === 2, '2 cards após filtrar CONTATO');
  assert(cardsAfterFilter[0].querySelector('.featured__body strong')?.textContent === 'WhatsApp', '1º = WhatsApp');
  assert(cardsAfterFilter[1].querySelector('.featured__body strong')?.textContent === 'Site', '2º = Site');

  /* ---- Teste 6: Modo grid ---- */
  console.log('\nTeste 6: Modo grid (cardsMode=grid)');
  const cfgGrid = JSON.parse(JSON.stringify(TEST_CFG));
  cfgGrid.layout.cardsMode = 'grid';
  const linksContainerGrid = document.createElement('div');
  linksContainerGrid.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainerGrid, TEST_CFG.links, cfgGrid, false);

  const gridWrap = linksContainerGrid.querySelector('.pg-links');
  assert(gridWrap, 'Wrapper grid criado');
  assert(gridWrap.style.flexDirection === 'row', 'Grid em linha');
  assert(gridWrap.style.flexWrap === 'wrap', 'Grid com wrap');
  assert(gridWrap.style.justifyContent === 'center', 'Grid centralizado');

  /* ---- Teste 7: Custom image button ---- */
  console.log('\nTeste 7: Botão com imagem customizada');
  const cfgCustomImg = JSON.parse(JSON.stringify(TEST_CFG));
  cfgCustomImg.links = [
    { id: 'c1', title: 'Custom', url: 'https://custom.com', customButtonImage: 'https://img.com/btn.png', customButtonHeight: 100 }
  ];
  const linksContainerCustom = document.createElement('div');
  linksContainerCustom.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainerCustom, cfgCustomImg.links, cfgCustomImg, false);

  const customCard = linksContainerCustom.querySelector('.featured__card--customimg');
  assert(customCard, 'Card customimg criado');
  assert(customCard.style.getPropertyValue('--customimg-h') === '100px', 'Altura customizada aplicada');
  assert(customCard.querySelector('.featured__customimg')?.src === 'https://img.com/btn.png', 'Imagem customizada no card');

  /* ---- Teste 8: Highlight card ---- */
  console.log('\nTeste 8: Card highlight');
  const cfgHighlight = JSON.parse(JSON.stringify(TEST_CFG));
  cfgHighlight.links = [
    { id: 'h1', title: 'Destaque', url: 'https://destaque.com', cardStyle: 'highlight', sub: 'Subtítulo' }
  ];
  const linksContainerHighlight = document.createElement('div');
  linksContainerHighlight.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainerHighlight, cfgHighlight.links, cfgHighlight, false);

  const highlightCard = linksContainerHighlight.querySelector('.featured__card--highlight');
  assert(highlightCard, 'Card highlight criado');
  assert(highlightCard.querySelector('.featured__body strong')?.textContent === 'Destaque', 'Título correto');
  assert(highlightCard.querySelector('.featured__sub')?.textContent === 'Subtítulo', 'Subtítulo correto');
  assert(!highlightCard.querySelector('.featured__icon'), 'Sem ícone no highlight');
  assert(!highlightCard.querySelector('.featured__arrow'), 'Sem seta no highlight');

  /* ---- Teste 9: Testimonial card ---- */
  console.log('\nTeste 9: Card testimonial');
  const cfgTestimonial = JSON.parse(JSON.stringify(TEST_CFG));
  cfgTestimonial.links = [
    { id: 't1', title: 'Depoimento', url: 'https://depoimento.com', cardStyle: 'testimonial', sub: 'Autor' }
  ];
  const linksContainerTestimonial = document.createElement('div');
  linksContainerTestimonial.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainerTestimonial, cfgTestimonial.links, cfgTestimonial, false);

  const testimonialCard = linksContainerTestimonial.querySelector('.featured__card--testimonial');
  assert(testimonialCard, 'Card testimonial criado');
  assert(testimonialCard.querySelector('.featured__body strong')?.textContent === 'Depoimento', 'Título correto');
  assert(testimonialCard.querySelector('.featured__sub')?.textContent === '— Autor', 'Subtítulo com prefixo —');
  assert(!testimonialCard.querySelector('.featured__icon'), 'Sem ícone no testimonial');
  assert(!testimonialCard.querySelector('.featured__arrow'), 'Sem seta no testimonial');

  console.log('\n=== TODOS OS TESTES PASSARAM ===\n');
}

try {
  runTests();
  process.exit(0);
} catch (err) {
  console.error('\n❌ ERRO:', err.message);
  console.error(err.stack);
  process.exit(1);
}