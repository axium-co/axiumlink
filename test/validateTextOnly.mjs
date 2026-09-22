import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

/* ================================================================
   MODO "SOMENTE TEXTO" (displayStyle:'text-only') — anula TODO o container
   visual mesmo quando ele vem de regra de CLASSE, não só de inline.
   ----------------------------------------------------------------
   Regressão do bug: o chipFor só removia estilos INLINE; o box de
   .profile__subtitle (Bio), .profile__address (Endereço) e
   .featured__card (Botão) vem do CSS da classe — com padding, fundo,
   borda, raio, vidro e sombra SEMPRE ativos mesmo em text-only. A correção
   injeta a classe modificadora .ax-text-only (classes neutralizadoras no
   <style>) + limpa os VARS de container (--ui-*) no público e no preview.

   Verifica, via getComputedStyle (cascata REAL das <style>), que:
     - Bio/Nome/Endereço/Botão text-only ficam SEM box nos DOIS lados;
     - um Botão em modo "caixa" CONTINUA com box (sanity);
     - preview admin == página pública (paridade do mockup);
     - voltar de text-only → box remove a classe .ax-text-only.
   Exporta run() retornando o nº de falhas (para a suíte oficial).
   ================================================================ */

const TRANSPARENT = /^rgba\(0,\s*0,\s*0,\s*0\)$/;
/* jsdom resolves borda/vidro de `none` como ''/undefined em vez de '0px' —
   ambos contam como zero. */
const isZero = (v) => String(v).trim() === '' || /^0/.test(String(v));
const noBadge = (v) => (v == null || v.trim() === '' || v === 'none');

function neutral(win, el, label, check) {
  const cs = win.getComputedStyle(el);
  const props = {
    backgroundColor: cs.backgroundColor,
    backgroundImage: cs.backgroundImage,
    borderTopWidth: cs.borderTopWidth,
    borderBottomWidth: cs.borderBottomWidth,
    borderLeftWidth: cs.borderLeftWidth,
    borderRightWidth: cs.borderRightWidth,
    padding: cs.padding,
    borderRadius: cs.borderRadius,
    boxShadow: cs.boxShadow,
    backdropFilter: cs.backdropFilter
  };
  const bgi = props.backgroundImage || '';
  const boxless =
    TRANSPARENT.test(props.backgroundColor) &&
    (bgi === 'none' || bgi === '') &&
    isZero(props.borderTopWidth) && isZero(props.borderBottomWidth) &&
    isZero(props.borderLeftWidth) && isZero(props.borderRightWidth) &&
    isZero(props.padding) &&
    isZero(props.borderRadius) &&
    props.boxShadow === 'none' &&
    noBadge(props.backdropFilter);
  check(label + ' = SEM box (computed)', boxless,
    'bg=' + props.backgroundColor + ' pad=' + props.padding + ' brd=' + props.borderTopWidth +
    ' radius=' + props.borderRadius + ' shadow=' + props.boxShadow + ' blur=' + props.backdropFilter);
  return boxless;
}

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  };

  const c = JSON.parse(JSON.stringify(NEW_CONFIG));
  c.links = [
    { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' },
    { id: 'l2', title: 'Somente Texto', url: 'https://texto.com', type: 'site', style: { displayStyle: 'text-only' } }
  ];
  c.design.profile.elem.name.displayStyle = 'text-only';
  c.design.profile.elem.bio.displayStyle = 'text-only';
  c.design.profile.elem.address.displayStyle = 'text-only';

  /* ---- ADMIN (preview) ---- */
  console.log('\n━━━ SOMENTE TEXTO | preview admin ━━━');
  const { window: wA } = await boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' });
  wA.__axEditor.init(c);
  const dA = wA.document;
  neutral(wA, dA.querySelector('#pvName'), 'admin Nome (#pvName)', check);
  neutral(wA, dA.querySelector('#pvBio'), 'admin Bio (#pvBio)', check);
  neutral(wA, dA.querySelector('#pvAddress'), 'admin Endereço (#pvAddress)', check);
  const aLinks = dA.querySelectorAll('#previewLinksList .link-block');
  neutral(wA, aLinks[1], 'admin Botão text-only (link#1)', check);
  const aBox = wA.getComputedStyle(aLinks[0]);
  check('admin Botão caixa (link#0) CONTINUA com box', !TRANSPARENT.test(aBox.backgroundColor) || !isZero(aBox.padding),
    'bg=' + aBox.backgroundColor + ' pad=' + aBox.padding);
  check('admin Botão text-only tem classe .ax-text-only', aLinks[1].classList.contains('ax-text-only'), aLinks[1].className);
  check('admin Botão caixa NÃO tem classe .ax-text-only', !aLinks[0].classList.contains('ax-text-only'), aLinks[0].className);

  /* ---- PÚBLICO ---- */
  console.log('\n━━━ SOMENTE TEXTO | página pública ━━━');
  const { window: wP } = await boot(INDEX_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/?s=teste' });
  wP.__alaPublica.aplicar(c);
  const dP = wP.document;
  neutral(wP, dP.querySelector('#pgTitle'), 'público Nome (#pgTitle)', check);
  neutral(wP, dP.querySelector('#pgSubtitle'), 'público Bio (#pgSubtitle)', check);
  neutral(wP, dP.querySelector('#pgAddress'), 'público Endereço (#pgAddress)', check);
  const pLinks = dP.querySelectorAll('#pgLinks .featured__card');
  neutral(wP, pLinks[1], 'público Botão text-only (link#1)', check);
  const pBox = wP.getComputedStyle(pLinks[0]);
  check('público Botão caixa (link#0) CONTINUA com box', !TRANSPARENT.test(pBox.backgroundColor) || !isZero(pBox.padding),
    'bg=' + pBox.backgroundColor + ' pad=' + pBox.padding);
  check('público Botão text-only tem classe .ax-text-only', pLinks[1].classList.contains('ax-text-only'), pLinks[1].className);
  check('público Bio tem classe .ax-text-only', dP.querySelector('#pgSubtitle').classList.contains('ax-text-only'), dP.querySelector('#pgSubtitle').className);
  check('público Botão caixa NÃO tem classe .ax-text-only', !pLinks[0].classList.contains('ax-text-only'), pLinks[0].className);

  /* ---- PARIDADE preview == público (computed) ---- */
  console.log('\n━━━ SOMENTE TEXTO | paridade admin == público ━━━');
  const pairs = [
    ['Bio', '#pvBio', '#pgSubtitle'],
    ['Nome', '#pvName', '#pgTitle'],
    ['Endereço', '#pvAddress', '#pgAddress']
  ];
  for (const [label, aSel, pSel] of pairs) {
    const csA = wA.getComputedStyle(dA.querySelector(aSel));
    const csP = wP.getComputedStyle(dP.querySelector(pSel));
    const same =
      csA.backgroundColor === csP.backgroundColor &&
      csA.padding === csP.padding &&
      csA.borderTopWidth === csP.borderTopWidth &&
      csA.boxShadow === csP.boxShadow &&
      csA.backdropFilter === csP.backdropFilter;
    check(`paridade ${label}: preview==público (bg/padding/borda/sombra/vidro)`, same,
      'admin bg=' + csA.backgroundColor + '/' + csP.backgroundColor);
  }
  const aTo = wA.getComputedStyle(aLinks[1]);
  const pTo = wP.getComputedStyle(pLinks[1]);
  const linkSame =
    aTo.backgroundColor === pTo.backgroundColor &&
    aTo.padding === pTo.padding &&
    aTo.borderTopWidth === pTo.borderTopWidth &&
    aTo.boxShadow === pTo.boxShadow &&
    aTo.display === pTo.display;
  check('paridade Botão text-only: preview==público (bg/padding/borda/sombra/display)', linkSame,
    'admin pad=' + aTo.padding + '/' + pTo.padding + ' display=' + aTo.display + '/' + pTo.display);

  /* ---- ROUND-TRIP: text-only → box remove a classe e devolve o container ---- */
  console.log('\n━━━ SOMENTE TEXTO | retorno text-only → caixa ━━━');
  const c2 = JSON.parse(JSON.stringify(c));
  c2.design.profile.elem.bio.displayStyle = 'box';
  c2.design.profile.elem.name.displayStyle = 'box';
  c2.design.profile.elem.address.displayStyle = 'box';
  c2.links[1].style = undefined;
  wP.__alaPublica.aplicar(c2);
  const pBio2 = dP.querySelector('#pgSubtitle');
  const csBio2 = wP.getComputedStyle(pBio2);
  check('público Bio volta a box: classe .ax-text-only REMOVIDA', !pBio2.classList.contains('ax-text-only'), pBio2.className);
  check('público Bio volta a box: padding do container de volta', !isZero(csBio2.padding) && csBio2.padding !== '0px',
    'pad=' + csBio2.padding);
  check('público Botão volta a box: classe .ax-text-only REMOVIDA', !dP.querySelectorAll('#pgLinks .featured__card')[1].classList.contains('ax-text-only'), dP.querySelectorAll('#pgLinks .featured__card')[1].className);

  console.log(`\n  ✅ SOMENTE TEXTO Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}