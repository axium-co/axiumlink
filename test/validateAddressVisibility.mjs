import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

/* ================================================================
   VISIBILIDADE DO ENDEREÇO (toggles "Mostrar endereço na página" e
   "Mostrar ícone de localização") — as 4 combinações possíveis, nos
   DOIS lados (preview do admin e página pública), com um chip/vidro
   configurado no endereço (reprodução do bug: chipFor gravava
   display:block inline, que vencia o atributo hidden → endereço
   vazava no preview com os toggles desligados).
   Exporta run() retornando o nº de falhas (para a suíte oficial).
   ================================================================ */

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  };

  const combos = [
    ['ligado/ligado', true, true],
    ['ligado/desligado', true, false],
    ['desligado/ligado', false, true],
    ['desligado/desligado', false, false]
  ];

  const visible = (el) => !!el && !el.hidden && (el.style.display || '') !== 'none';
  /* Oculto de verdade: atributo hidden SOMADO a um display inline que não
     seja um "vence o hidden" (nem block nem quebra). Com o chipFor
     respeitando hidden + o none do mockup, o display pode virar '' (o
     [hidden] da UA/CSS volta a dominar) ou 'none' — ambos contam. */
  const hidden = (el) => !!el && el.hidden && ['', 'none'].includes(el.style.display || '');
  /* O ícone oculta por display:none (público) e/ou atributo hidden (admin) */
  const iconHidden = (el) => !!el && (el.hidden || (el.style.display || '') === 'none');

  for (const [label, show, icon] of combos) {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.profile.address = 'TESTE';
    c.design.profile.addrShow = show;
    /* O toggle "Mostrar ícone" vive em design.profile.address.showIcon
       (criado pelo admin ao ligar/desligar). Se ausente, default é on. */
    c.design.profile.address = { showIcon: icon };
    /* chip roxo — faz o chipFor aplicar display:block inline (reprodução) */
    c.design.profile.elem = c.design.profile.elem || {};
    c.design.profile.elem.address = Object.assign({}, c.design.profile.elem.address, { bg: '#8b5cf6' });

    const { window: wA } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    wA.__axEditor.init(c);
    const dA = wA.document;
    const aBox = dA.querySelector('#pvAddress');
    const aIco = dA.querySelector('#pvAddressIco');

    console.log(`\n━━━ ENDEREÇO preview admin (exibição: ${label}) ━━━`);
    check(`admin ${label}: bloco do endereço presente`, !!aBox);
    check(`admin ${label}: endereço VISÍVEL == toggle "mostrar na página"`, show ? !!visible(aBox) : !!hidden(aBox),
      'hidden=' + (aBox && aBox.hidden) + ' display=' + (aBox && (aBox.style.display || '(vazio)')) + ' esperado=' + (show ? 'visível' : 'oculto'));
    if (!show) {
      check(`admin ${label}: inline display não vence o hidden`, !!hidden(aBox) && (aBox.style.display || '') !== 'block',
        'display=' + (aBox && (aBox.style.display || '(vazio)')) + ' (não pode ser block)');
    } else {
      check(`admin ${label}: ícone visível == toggle "mostrar ícone"`, icon ? !!visible(aIco) : !!iconHidden(aIco),
        'hidden=' + (aIco && aIco.hidden) + ' display=' + (aIco && (aIco.style.display || '(vazio)')) + ' esperado=' + (icon ? 'visível' : 'oculto'));
    }

    const { window: wP } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
    const dP = wP.document;
    if (wP.__alaPublica?.aplicar) wP.__alaPublica.aplicar(c);
    const pBox = dP.querySelector('#pgAddress');
    const pIco = pBox && pBox.querySelector('svg');

    console.log(`\n━━━ ENDEREÇO página pública (exibição: ${label}) ━━━`);
    check(`público ${label}: bloco do endereço presente`, !!pBox);
    check(`público ${label}: endereço VISÍVEL == toggle "mostrar na página"`, show ? !!visible(pBox) : !!hidden(pBox),
      'hidden=' + (pBox && pBox.hidden) + ' display=' + (pBox && (pBox.style.display || '(vazio)')) + ' esperado=' + (show ? 'visível' : 'oculto'));
    if (!show) {
      check(`público ${label}: inline display não vence o hidden`, !!hidden(pBox) && (pBox.style.display || '') !== 'block',
        'display=' + (pBox && (pBox.style.display || '(vazio)')) + ' (não pode ser block)');
    } else {
      check(`público ${label}: ícone visível == toggle "mostrar ícone"`, icon ? !!visible(pIco) : !!iconHidden(pIco),
        'display=' + (pIco && (pIco.style.display || '(vazio)')) + ' esperado=' + (icon ? 'visível' : 'oculto'));
    }
    check(`paridade ${label}: preview == público (bloco + ícone)`,
      visible(aBox) === visible(pBox) && (show ? (visible(aIco) === visible(pIco)) : true),
      'preview=' + (visible(aBox) ? 'visível' : 'oculto') + ' público=' + (visible(pBox) ? 'visível' : 'oculto'));
  }

  console.log(`\n  ✅ ENDEREÇO (visibilidade) Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}