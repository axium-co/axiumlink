/* Regressão do "Espaçamento entre blocos" (style.blockGap, seção Layout):
   o controle GLOBAL passa a dirigir a distância vertical entre os blocos da
   página — Avatar → Nome → Bio → Endereço → Botões — em AMBOS os lados
   (preview admin e página pública), com o espaçamento INDIVIDUAL por
   elemento (elem.<x>.spacing > 0) SOBRESCREVENDO o global.

   Contratos verificados:
     1) blockGap=30 (global) → os 4 blocos recebem margin-bottom 30px.
     2) Individual (name.spacing=5, address.spacing=48) vence o global;
        bloco sem individual cai no global.
     3) blockGap=0 → margens zeradas (blocos colados).
     4) Botões continuam respondendo ao blockGap (2º botão margin-top 30).
     5) Admin == público em todos os cenários.
*/

import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
  };

  const baseCfg = (over) => {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.links = [
      { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' },
      { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', type: 'whatsapp' }
    ];
    if (over) over(c);
    return c;
  };

  const withBoth = (cfg, fn) => {
    const wA = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' }).window;
    wA.__axEditor.init(JSON.parse(JSON.stringify(cfg)));
    const wP = boot(INDEX_PATH, { supabase: supabaseStub({ config: cfg, slug: 'teste' }), url: 'https://axiumlink.test/?s=teste' }).window;
    wP.__alaPublica.aplicar(JSON.parse(JSON.stringify(cfg)));
    fn(wA.document, wP.document);
  };

  const BLOCKS = [
    ['avatar', '#pvAvatarWrap', '#pgAvatarCard'],
    ['name', '.pv-name-row', '.profile__name-row'],
    ['bio', '#pvBio', '#pgSubtitle'],
    ['address', '#pvAddress', '#pgAddress']
  ];
  const expectMb = (dA, dP, gap) => {
    const e = gap ? gap + 'px' : '';
    BLOCKS.forEach(([key, aSel, pSel]) => {
      const a = (dA.querySelector(aSel) || {}).style?.marginBottom || '';
      const p = (dP.querySelector(pSel) || {}).style?.marginBottom || '';
      check(`bloco ${key}: admin==público==${e || 'colado'}`, a === e && p === e, 'a=' + (a || '∅') + ' p=' + (p || '∅'));
    });
  };

  console.log('\n━━━ ESPAÇAMENTO GLOBAL ENTRE BLOCOS (blockGap) ━━━');

  /* 1) Global 30 → todos os blocos 30px nos DOIS lados */
  withBoth(baseCfg((c) => { c.style.blockGap = 30; }), (dA, dP) => {
    expectMb(dA, dP, 30);
  });

  /* 2) Limite do slider (48) também aplica */
  withBoth(baseCfg((c) => { c.style.blockGap = 48; }), (dA, dP) => {
    check('blockGap=48: nome 48px nos dois lados',
      (dA.querySelector('.pv-name-row').style.marginBottom === '48px') &&
      (dP.querySelector('.profile__name-row').style.marginBottom === '48px'));
  });

  /* 3) Individual > 0 sobrescreve o global; sem individual → global */
  withBoth(baseCfg((c) => {
    c.style.blockGap = 30;
    c.design.profile.elem.name.spacing = 5;
    c.design.profile.elem.address.spacing = 48;
  }), (dA, dP) => {
    const mbA = (sel) => (dA.querySelector(sel).style.marginBottom || '∅');
    const mbP = (sel) => (dP.querySelector(sel).style.marginBottom || '∅');
    check('individual name=5 vence global 30 (admin)', mbA('.pv-name-row') === '5px', mbA('.pv-name-row'));
    check('individual name=5 vence global 30 (público)', mbP('.profile__name-row') === '5px', mbP('.profile__name-row'));
    check('individual address=48 vence global 30 (público)', mbP('#pgAddress') === '48px', mbP('#pgAddress'));
    check('sem individual: bio cai no global 30 (admin)', mbA('#pvBio') === '30px', mbA('#pvBio'));
    check('sem individual: avatar cai no global 30 (público)', mbP('#pgAvatarCard') === '30px', mbP('#pgAvatarCard'));
  });

  /* 4) blockGap=0 cola os blocos (margem vazia) */
  withBoth(baseCfg((c) => { c.style.blockGap = 0; }), (dA, dP) => {
    expectMb(dA, dP, 0);
  });

  /* 5) Botões continuam respondendo ao blockGap global */
  withBoth(baseCfg((c) => { c.style.blockGap = 30; }), (dA, dP) => {
    const itemsA = dA.querySelectorAll('#previewLinksList > *');
    const itemsP = dP.querySelectorAll('.pg-links-list > *');
    check('links admin: 1º item sem margin-top', itemsA[0] && itemsA[0].style.marginTop === '0px', itemsA[0] && itemsA[0].style.marginTop);
    check('links admin: 2º item margin-top 30px', itemsA[1] && itemsA[1].style.marginTop === '30px', itemsA[1] && itemsA[1].style.marginTop);
    check('links público: 2º item margin-top 30px', itemsP[1] && itemsP[1].style.marginTop === '30px', itemsP[1] && itemsP[1].style.marginTop);
    check('links público: margens iguais ao admin',
      itemsA[0].style.marginTop === itemsP[0].style.marginTop &&
      itemsA[1].style.marginTop === itemsP[1].style.marginTop);
  });

  console.log(`\n  ✅ ESPAÇAMENTO GLOBAL ENTRE BLOCOS Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}