/**
 * Teste do sistema de estilo de botões unificado — valida que estilos INDIVIDUAIS
 * por link (diferentes do tema global) são aplicados corretamente no render-core.
 * 
 * Rodar: node test/validateButtonStyles.mjs
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

/* Config base com tema global */
const BASE_CFG = {
  profile: { name: 'Teste', bio: 'Bio', address: 'Endereço' },
  links: [
    { id: '1', title: 'Global', url: 'https://global.com', icon: 'site' },
    { id: '2', title: 'Individual', url: 'https://individual.com', icon: 'instagram' },
    { id: '3', title: 'Outro Global', url: 'https://outro.com', icon: 'github' }
  ],
  layout: { cardsMode: 'list' },
  style: {
    blockGap: 10,
    /* Tema global: botões azuis sólidos, arredondados */
    btnVariant: 'solid',
    btnShape: 'rounded',
    btnShadowStyle: 'soft',
    btnShadow: 30,
    btnRadius: 14,
    btnBgColor: '#2563eb',      // azul global
    btnTextColor: '#ffffff',
    btnGradientStart: '#6366f1',
    btnGradientEnd: '#ec4899',
    btnGradientAngle: 135,
    btnGlassOpacity: 16,
    btnGlassBlur: 20,
    btnGlassBorderOpacity: 25,
    btnGlowColor: '#22d3ee',
    btnAnimation: 'none',
    displayStyle: 'box'
  },
  design: { profile: { elem: {} } }
};

function assert(condition, msg) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

function getComputedStyleValue(element, prop) {
  // Simula getComputedStyle para JSDOM
  return element.style[prop] || '';
}

function runTests() {
  console.log('\n=== TESTES SISTEMA DE ESTILO DE BOTÕES UNIFICADO ===\n');

  const { window } = createWindow();
  const { RenderCore } = window;
  const { document } = window;

  /* ---- Teste 1: Botão sem estilo individual herda tema global ---- */
  console.log('Teste 1: Botão sem estilo individual herda tema global');
  const linksContainer1 = document.createElement('div');
  linksContainer1.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainer1, BASE_CFG.links, BASE_CFG, false);

  const card1 = linksContainer1.querySelectorAll('.featured__card')[0];
  // Tema global: btnBgColor = #2563eb
  assert(card1.style.background === '#2563eb' || card1.style.background.includes('2563eb') || card1.style.background.includes('37, 99, 235'),
    'Botão 1 (sem estilo individual) usa cor global #2563eb');

  /* ---- Teste 2: Botão COM estilo individual (schema premium do admin) sobrescreve global ---- */
  console.log('\nTeste 2: Botão com estilo individual (schema premium) sobrescreve global');
  const cfgIndividual = JSON.parse(JSON.stringify(BASE_CFG));
  
  // Link 2 tem estilo individual no schema PREMIUM (como o admin salva)
  cfgIndividual.links[1].style = {
    variant: 'gradient',
    format: 'pill',
    animation: 'none',
    shadow: { type: 'glow', intensity: 50 },
    radius: 9999,
    glow: '#f59e0b',
    gradient: { start: '#f59e0b', end: '#f97316', angle: 90 },
    glass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 25 },
    colors: { background: '', text: '' },
    displayStyle: 'box'
  };

  const linksContainer2 = document.createElement('div');
  linksContainer2.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainer2, cfgIndividual.links, cfgIndividual, false);

  const card2 = linksContainer2.querySelectorAll('.featured__card')[1]; // index 1 = "Individual"
  
  // Verifica que NÃO usa a cor global azul (#2563eb), mas sim o gradiente individual
  const bg = card2.style.background || '';
  assert(bg.includes('gradient') && (bg.includes('f59e0b') || bg.includes('245, 158, 11') || bg.includes('f97316') || bg.includes('249, 115, 22')),
    'Botão 2 usa gradiente individual (laranja) NÃO cor global azul');

  // Verifica radius pill (9999px)
  const radius = card2.style.borderRadius || '';
  assert(radius === '9999px' || radius.includes('9999'),
    'Botão 2 usa radius pill (9999px) NÃO radius global (14px)');

  /* ---- Teste 3: Botão com variant glass individual ---- */
  console.log('\nTeste 3: Botão com variant glass individual');
  const cfgGlass = JSON.parse(JSON.stringify(BASE_CFG));
  cfgGlass.links[1].style = {
    variant: 'glass',
    format: 'rounded',
    animation: 'none',
    shadow: { type: 'soft', intensity: 30 },
    radius: 14,
    glow: '#22d3ee',
    gradient: { start: '#6366f1', end: '#ec4899', angle: 135 },
    glass: { enabled: true, blur: 20, saturate: 180, opacity: 20, color: '#ffffff', borderGlow: 50, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 30 },
    colors: { background: '', text: '' },
    displayStyle: 'box'
  };

  const linksContainer3 = document.createElement('div');
  linksContainer3.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainer3, cfgGlass.links, cfgGlass, false);

  const card3 = linksContainer3.querySelectorAll('.featured__card')[1];
  const bg3 = card3.style.background || '';
  const backdrop = card3.style.backdropFilter || card3.style.webkitBackdropFilter || '';
  
  assert(bg3.includes('rgba') && bg3.includes('255'),
    'Botão glass individual usa fundo rgba(255,255,255,...)');
  assert(backdrop.includes('blur'),
    'Botão glass individual tem backdrop-filter blur');

  /* ---- Teste 4: Botão com variant neon individual ---- */
  console.log('\nTeste 4: Botão com variant neon individual');
  const cfgNeon = JSON.parse(JSON.stringify(BASE_CFG));
  cfgNeon.links[1].style = {
    variant: 'neon',
    format: 'rounded',
    animation: 'pulse',
    shadow: { type: 'glow', intensity: 80 },
    radius: 14,
    glow: '#22d3ee',
    gradient: { start: '#6366f1', end: '#ec4899', angle: 135 },
    glass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 25 },
    colors: { background: '', text: '' },
    displayStyle: 'box'
  };

  const linksContainer4 = document.createElement('div');
  linksContainer4.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainer4, cfgNeon.links, cfgNeon, false);

  const card4 = linksContainer4.querySelectorAll('.featured__card')[1];
  const border4 = card4.style.border || card4.style.borderColor || '';
  const color4 = card4.style.color || '';
  
  assert(border4.includes('22d3ee') || border4.includes('34, 211, 238') || color4.includes('22d3ee') || color4.includes('34, 211, 238'),
    'Botão neon individual usa cor glow #22d3ee na borda/texto');
  assert(card4.classList.contains('anim-pulse') || card4.style.animation?.includes('pulse'),
    'Botão neon individual tem animação pulse');

  /* ---- Teste 5: Botão com displayStyle text-only individual ---- */
  console.log('\nTeste 5: Botão com displayStyle text-only individual');
  const cfgTextOnly = JSON.parse(JSON.stringify(BASE_CFG));
  cfgTextOnly.links[1].style = {
    variant: 'solid',
    format: 'rounded',
    animation: 'none',
    shadow: { type: 'soft', intensity: 30 },
    radius: 14,
    glow: '#22d3ee',
    gradient: { start: '#6366f1', end: '#ec4899', angle: 135 },
    glass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 25 },
    colors: { background: '', text: '' },
    displayStyle: 'text-only'
  };

  const linksContainer5 = document.createElement('div');
  linksContainer5.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainer5, cfgTextOnly.links, cfgTextOnly, false);

  const card5 = linksContainer5.querySelectorAll('.featured__card')[1];
  const bg5 = card5.style.background || '';
  const border5 = card5.style.border || '';
  const textDecor = card5.style.textDecoration || '';
  
  assert(bg5 === 'transparent' || bg5 === '',
    'Botão text-only tem fundo transparente');
  assert(border5 === 'none' || border5 === '',
    'Botão text-only sem borda');
  assert(textDecor === 'underline',
    'Botão text-only tem text-decoration underline');

  /* ---- Teste 6: Múltiplos botões com estilos individuais diferentes ---- */
  console.log('\nTeste 6: Múltiplos botões com estilos individuais diferentes');
  const cfgMulti = JSON.parse(JSON.stringify(BASE_CFG));
  cfgMulti.links = [
    { id: '1', title: 'Global 1', url: 'https://g1.com', icon: 'site' }, // sem estilo = global
    { id: '2', title: 'Gradiente', url: 'https://g2.com', icon: 'instagram', style: {
      variant: 'gradient', format: 'rounded', animation: 'none',
      shadow: { type: 'soft', intensity: 30 }, radius: 14,
      glow: '#22d3ee', gradient: { start: '#ec4899', end: '#f59e0b', angle: 45 },
      glass: { enabled: false }, colors: { background: '', text: '' }, displayStyle: 'box'
    }},
    { id: '3', title: 'Glass', url: 'https://g3.com', icon: 'github', style: {
      variant: 'glass', format: 'pill', animation: 'float',
      shadow: { type: 'soft', intensity: 20 }, radius: 9999,
      glow: '#a855f7', gradient: { start: '#6366f1', end: '#ec4899', angle: 135 },
      glass: { enabled: true, blur: 30, opacity: 25, color: '#ffffff', borderGlow: 60, shadowDepth: 24, highlight: true, noise: false, borderOpacity: 40 },
      colors: { background: '', text: '' }, displayStyle: 'box'
    }},
    { id: '4', title: 'Global 2', url: 'https://g4.com', icon: 'twitter' } // sem estilo = global
  ];

  const linksContainer6 = document.createElement('div');
  linksContainer6.id = 'pgLinks';
  RenderCore.renderLinksList(linksContainer6, cfgMulti.links, cfgMulti, false);

  const cards = linksContainer6.querySelectorAll('.featured__card');
  assert(cards.length === 4, '4 cards renderizados');

  // Card 1: global (azul sólido)
  const bg1 = cards[0].style.background || '';
  assert(bg1.includes('2563eb') || bg1.includes('37, 99, 235') || bg1 === '#2563eb',
    'Card 1 (sem estilo) usa cor global');

  // Card 2: gradiente individual
  const bg2 = cards[1].style.background || '';
  assert(bg2.includes('gradient') && (bg2.includes('ec4899') || bg2.includes('236, 72, 153') || bg2.includes('f59e0b')),
    'Card 2 (gradiente) usa gradiente individual');

  // Card 3: glass + pill
  const bg3b = cards[2].style.background || '';
  const radius3 = cards[2].style.borderRadius || '';
  assert(bg3b.includes('rgba') && radius3.includes('9999'),
    'Card 3 (glass) usa vidro + radius pill');

  // Card 4: global (azul sólido)
  const bg4b = cards[3].style.background || '';
  assert(bg4b.includes('2563eb') || bg4b.includes('37, 99, 235') || bg4b === '#2563eb',
    'Card 4 (sem estilo) usa cor global');

  console.log('\n=== TODOS OS TESTES DE ESTILO INDIVIDUAL PASSARAM ===\n');
}

try {
  runTests();
  process.exit(0);
} catch (err) {
  console.error('\n❌ ERRO:', err.message);
  console.error(err.stack);
  process.exit(1);
}