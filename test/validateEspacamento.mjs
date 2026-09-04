/* Controle de espaçamento entre blocos e por link.

   1) BLOCOS DA PÁGINA (avatar/nome/bio/endereço): margin-bottom = valor do
      campo INDIVIDUAL `elem.<x>.spacing` (>0 — sobrescreve o global) senão
      o espaçamento GLOBAL "Espaçamento entre blocos" (style.blockGap, hoje
      também aplicado aos botões). blockGap=0 cola os blocos. Banner segue
      o campo próprio `design.banner.spacing`.
   2) LINKS: cada botão tem `spacing` próprio (>0 sobrescreve o blockGap
      global do primeiro item acima dele; 0 usa o global). Tabs de
      categoria recebem margin-bottom = blockGap. O primeiro item da
      lista nunca ganha margin-top extra.
   3) Garante PREVIEW (admin) e PÚBLICO com o MESMO resultado (mesma
      lógica espelhada) — o histórico de divergências admin×público é o
      motivo de o teste comparar os dois explicitamente.
*/

import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  };

  const baseCfg = (over) => {
    const c = JSON.parse(JSON.stringify(NEW_CONFIG));
    c.links = [
      { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' },
      { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', type: 'whatsapp' },
      { id: 'l3', title: 'Vídeo', url: 'https://youtube.com', type: 'video' }
    ];
    if (over) over(c);
    return c;
  };

  const admin = {};
  admin.init = (c) => {
    const { window } = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
    window.__axEditor.init(c);
    return window;
  };
  const box = (el) => el && { mt: el.style.marginTop, mb: el.style.marginBottom };
  const boxes = (els) => Array.from(els).map(box);

  /* ================================================================
     1) Espaçamento por elemento — admin (preview) e público
     ================================================================ */
  async function elementos() {
    console.log('\n━━━ ESPAÇAMENTO — por elemento (nome/bio/endereço/avatar/banner) ━━━');
    const spaced = baseCfg((c) => {
      c.design.profile.elem.name.spacing = 24;
      c.design.profile.elem.bio.spacing = 16;
      c.design.profile.elem.address.spacing = 20;
      c.design.profile.elem.avatar.spacing = 26;
      c.design.banner.spacing = 32;
    });

    /* ADMIN */
    const wA = admin.init(spaced);
    const dA = wA.document;
    check('admin: nome → margin-bottom 24px', box(dA.querySelector('.pv-name-row')).mb === '24px', box(dA.querySelector('.pv-name-row')).mb);
    check('admin: bio → margin-bottom 16px', box(dA.querySelector('#pvBio')).mb === '16px', box(dA.querySelector('#pvBio')).mb);
    check('admin: endereço → margin-bottom 20px', box(dA.querySelector('#pvAddress')).mb === '20px', box(dA.querySelector('#pvAddress')).mb);
    check('admin: avatar → margin-bottom 26px', box(dA.querySelector('#pvAvatarWrap')).mb === '26px', box(dA.querySelector('#pvAvatarWrap')).mb);
    check('admin: banner → margin-bottom 32px', box(dA.querySelector('.pv-banner')).mb === '32px', box(dA.querySelector('.pv-banner')).mb);

    /* PÚBLICO */
    const wP0 = boot(INDEX_PATH, { supabase: supabaseStub({ config: spaced, slug: 'teste' }), url: 'https://axiumlink.test/?s=teste' }).window;
    wP0.__alaPublica.aplicar(spaced);
    const dP = wP0.document;
    const mbOf = (sel) => box(dP.querySelector(sel)).mb;
    check('público: .profile__name-row → margin-bottom 24px', mbOf('.profile__name-row') === '24px', mbOf('.profile__name-row'));
    check('público: #pgSubtitle → margin-bottom 16px', mbOf('#pgSubtitle') === '16px', mbOf('#pgSubtitle'));
    check('público: #pgAddress → margin-bottom 20px', mbOf('#pgAddress') === '20px', mbOf('#pgAddress'));
    check('público: #pgAvatarCard → margin-bottom 26px', mbOf('#pgAvatarCard') === '26px', mbOf('#pgAvatarCard'));
    check('público: #pgBanner → margin-bottom 32px', mbOf('#pgBanner') === '32px', mbOf('#pgBanner'));

    /* Consistência admin × público (mesmo config) */
    const pair = [
      ['nome', '.pv-name-row', '.profile__name-row'],
      ['bio', '#pvBio', '#pgSubtitle'],
      ['endereço', '#pvAddress', '#pgAddress'],
      ['avatar', '#pvAvatarWrap', '#pgAvatarCard'],
      ['banner', '.pv-banner', '#pgBanner']
    ];
    pair.forEach(([nome, aSel, pSel]) => {
      const a = box(dA.querySelector(aSel)).mb;
      const p = mbOf(pSel);
      check(`consistência ${nome}: admin==público (${a})`, a === p, 'a=' + a + ' p=' + p);
    });

    /* DEFAULT (sem campo spacing individual): todos os blocos da página
       usam o espaçamento GLOBAL "Espaçamento entre blocos" (blockGap=12). */
    const wAD = admin.init(baseCfg());
    const dAD = wAD.document;
    const wPD = boot(INDEX_PATH, { supabase: supabaseStub({ config: baseCfg(), slug: 'teste' }), url: 'https://axiumlink.test/?s=teste' }).window;
    wPD.__alaPublica.aplicar(baseCfg());
    check('default admin: .pv-name-row usa blockGap 12px', box(dAD.querySelector('.pv-name-row')).mb === '12px', box(dAD.querySelector('.pv-name-row')).mb);
    check('default admin: #pvBio usa blockGap 12px', box(dAD.querySelector('#pvBio')).mb === '12px', box(dAD.querySelector('#pvBio')).mb);
    check('default público: .profile__name-row usa blockGap 12px', box(wPD.document.querySelector('.profile__name-row')).mb === '12px', box(wPD.document.querySelector('.profile__name-row')).mb);
    check('default público: #pgSubtitle usa blockGap 12px', box(wPD.document.querySelector('#pgSubtitle')).mb === '12px', box(wPD.document.querySelector('#pgSubtitle')).mb);

    /* Isolamento: mudar UM elemento só altera ELE; os demais caem no GLOBAL
       (não ficam colados nem ganham o valor do elemento alterado). */
    const onlyBio = baseCfg((c) => { c.design.profile.elem.bio.spacing = 40; });
    const wAI = admin.init(onlyBio);
    const dAI = wAI.document;
    check('isolamento: só a bio muda (bio=40, nome=', box(dAI.querySelector('#pvBio')).mb === '40px', 'e nome=' + box(dAI.querySelector('.pv-name-row')).mb + ')');
    check('isolamento: nome usa o global 12px', box(dAI.querySelector('.pv-name-row')).mb === '12px', box(dAI.querySelector('.pv-name-row')).mb);
    check('isolamento: banner usa o global 12px', box(dAI.querySelector('.pv-banner')).mb === '12px', box(dAI.querySelector('.pv-banner')).mb);
  }

  /* ================================================================
     2) Espaçamento por link (spacing individual + blockGap global)
     ================================================================ */
  async function links() {
    console.log('\n━━━ ESPAÇAMENTO — por link (individual + global blockGap) ━━━');

    const grabAdmin = (c) => {
      const w = admin.init(c);
      return boxes(w.document.getElementById('previewLinksList').children);
    };
    const grabPublic = (c) => {
      const { window } = boot(INDEX_PATH, { supabase: supabaseStub({ config: c, slug: 'teste' }), url: 'https://axiumlink.test/?s=teste' });
      window.__alaPublica.aplicar(c);
      return boxes(window.document.querySelector('.pg-links-list').children);
    };

    /* (a) Só global: blockGap=12 → 2º/3º itens margin-top 12px; 1º = 0. */
    const a0 = grabAdmin(baseCfg());
    const p0 = grabPublic(baseCfg());
    check('admin global 12: 1º item sem margin-top', a0[0].mt === '0px', a0[0].mt);
    check('admin global 12: 2º item margin-top 12px', a0[1].mt === '12px', a0[1].mt);
    check('admin global 12: 3º item margin-top 12px', a0[2].mt === '12px', a0[2].mt);
    check('público global 12: 1º item sem margin-top', p0[0].mt === '0px', p0[0].mt);
    check('público global 12: 2º item margin-top 12px', p0[1].mt === '12px', p0[1].mt);
    check('público global 12: margens = preview do admin', JSON.stringify(p0) === JSON.stringify(a0));

    /* (b) Global 18 + link individual 40 no 3º item. */
    const cB = baseCfg((c) => {
      c.style.blockGap = 18;
      c.links[2].spacing = 40;
    });
    const aB = grabAdmin(cB);
    const pB = grabPublic(cB);
    check('admin individual: 1º = 0 (global 18)', aB[0].mt === '0px', aB[0].mt);
    check('admin individual: 2º = 18 (usa global)', aB[1].mt === '18px', aB[1].mt);
    check('admin individual: 3º = 40 (override do item)', aB[2].mt === '40px', aB[2].mt);
    check('público individual = preview (18/18/40)', pB[0].mt === '0px' && pB[1].mt === '18px' && pB[2].mt === '40px', JSON.stringify(pB.map(x => x.mt)));
    check('consistência links: admin == público', JSON.stringify(aB) === JSON.stringify(pB));

    /* (c) 1º item com spacing individual ganha override MAS continua sem
           margin-top (não há nada acima dele). */
    const cC = baseCfg((c) => { c.links[0].spacing = 40; });
    const aC = grabAdmin(cC);
    check('admin: 1º item com spacing=40 não ganha margin-top', aC[0].mt === '0px', aC[0].mt);

    /* (d) Tabs de categoria: margin-bottom = global; itens seguem. */
    const cD = baseCfg((c) => {
      c.style.blockGap = 10;
      c.links = [
        { id: 'l1', title: 'Instagram', url: 'https://ig.com', type: 'instagram', category: 'social' },
        { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', type: 'whatsapp', category: 'social' },
        { id: 'l3', title: 'Site', url: 'https://site.com', type: 'site', category: 'web', spacing: 33 }
      ];
    });
    const aD = grabAdmin(cD);
    check('admin tabs: tabs presente', aD.length === 4, 'children=' + aD.length);
    check('admin tabs: tab margin-bottom=10 (global)', aD[0].mb === '10px', aD[0].mb);
    check('admin tabs: 1º link margin-top=0 (após tabs)', aD[1].mt === '0px', aD[1].mt);
    check('admin tabs: 2º link usa global 10', aD[2].mt === '10px', aD[2].mt);
    check('admin tabs: link individual 33 vence global', aD[3].mt === '33px', aD[3].mt);
    const pD = grabPublic(cD);
    const pDm = pD.map(x => x.mt);
    check('público com tabs: margens dos botões iguais (0,10,33)', pDm.join(',') === '0px,10px,33px', pDm.join(','));
    const tabsP = boot(INDEX_PATH, { supabase: supabaseStub({ config: cD, slug: 'teste' }), url: 'https://axiumlink.test/?s=teste' }).window;
    tabsP.__alaPublica.aplicar(cD);
    const tabsWrap = tabsP.document.querySelector('.pg-tabs');
    check('público: tabs margin-bottom=10 (global)', tabsWrap && tabsWrap.style.marginBottom === '10px', tabsWrap && tabsWrap.style.marginBottom);
  }

  await elementos();
  await links();

  console.log(`\n  ✅ ESPAÇAMENTO Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}