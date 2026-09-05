/* Temas Prontos — identidade cromática distinta + contraste + miniaturas.

   Contratos verificados (cada um aplicado pelo FLUXO REAL do painel,
   `applyPreset`, e renderizado na PÁGINA PÚBLICA):
     1) Identidade: ao aplicar o tema, o fundo, os botões e o texto da
        página pública carregam exatamente a paleta do preset.
     2) Paridade: o preview do admin (composição) bate com o público.
     3) Distinção: as 7 assinaturas cromáticas (fundo + botão + texto)
        são todas diferentes entre si — sem confusão lado a lado.
     4) Contraste interno: texto vs fundo >= 4.5:1 (AA) e texto do botão
        vs fundo do botão >= 3:1 (AA large) — vidro (translúcido) medido
        pelo fundo efetivo e neon pelo texto/glow real do botão.
     5) Miniaturas: 7 cards exibidos na grade, fundos distintos entre si,
        gradientes (Sunset/Glass) com background gradient de verdade e
        3 bolinhas = paleta (texto, botão, texto do botão).
*/

import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');

/* jsdom serializa hex como rgb() → converte de volta para comparar */
const colHex = (s) => {
  const v = String(s || '').trim();
  const m = v.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) return '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('');
  return v;
};
const N = (s) => norm(colHex(s));

function lum(hex) {
  const h = hex.replace('#', '');
  const e = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(e.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* Cor efetiva de um fundo translúcido rgba() sobre uma base hex */
function alphaBlend(rgba, base) {
  const h = base.replace('#', '');
  const e = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const m = String(rgba).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/i);
  if (!m) return base;
  const a = m[4] == null ? 1 : Number(m[4]);
  const out = [1, 2, 3].map((i) => Math.round(Number(m[i]) * a + parseInt(e.slice((i - 1) * 2, i * 2), 16) * (1 - a)));
  return '#' + out.map((n) => n.toString(16).padStart(2, '0')).join('');
}

export async function run() {
  let pass = 0, fail = 0;
  const check = (label, ok, detail = '') => {
    if (ok) pass++; else fail++;
    console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
  };

  const wA = boot(ADMIN_PATH, { supabase: supabaseStub(null), url: 'https://axiumlink.test/admin.html' }).window;
  const wP = boot(INDEX_PATH, { supabase: supabaseStub({ config: NEW_CONFIG, slug: 'teste' }), url: 'https://axiumlink.test/?s=teste' }).window;
  const dA = wA.document;
  const dP = wP.document;

  const presets = wA.__axEditor.presets();
  check('7 temas prontos definidos', presets.length === 7, 'presets=' + presets.length);

  const applied = [];
  for (const preset of presets) {
    const cfg = JSON.parse(JSON.stringify(NEW_CONFIG));
    cfg.links = [
      { id: 'l1', title: 'Site', url: 'https://site.com', type: 'site' },
      { id: 'l2', title: 'WhatsApp', url: 'https://wa.me/1', type: 'whatsapp' }
    ];
    wA.__axEditor.init(cfg);
    wA.__axEditor.applyPreset(preset.key);
    const cur = JSON.parse(JSON.stringify(wA.__axEditor.cfg()));
    wP.__alaPublica.aplicar(cur);
    const st = cur.style || {};
    const root = dP.documentElement.style;

    const pageBg = root.getPropertyValue('--page-bg') || '';
    const btnBg = (root.getPropertyValue('--card-destaque-bg') || '').trim();
    const btnTxt = (root.getPropertyValue('--card-destaque-text') || '').trim();
    const titleInk = (root.getPropertyValue('--text-title') || '').trim();
    const textBody = (root.getPropertyValue('--text-body') || '').trim();

    const pvPage = dA.querySelector('#pvPage');
    let bgIdentity = '', btnIdentity = preset.preview.btn, textIdentity = preset.preview.text;
    const bx = preset.name + ' — ';

    /* 1) IDENTIDADE na página pública (não só na miniatura) */
    check(bx + 'fundo da página pública aplicado', !!pageBg, '--page-bg=' + (pageBg.slice(0, 60) || '(vazio)'));
    if (st.bgVariant === 'gradient') {
      const stops = Array.isArray(st.gradientStops) ? st.gradientStops : [
        { color: st.gradientStart, pos: 0 }, { color: st.gradientEnd, pos: 100 }
      ];
      bgIdentity = norm(stops.map((s) => s.color).sort().join('|'));
      const hasAll = stops.every((s) => norm(pageBg).includes(norm(s.color)));
      check(bx + 'gradiente (cores dos stops) no fundo público', /^linear-gradient\(/i.test(pageBg) && hasAll, (pageBg.slice(0, 60) || '') + ' vs ' + stops.map((s) => s.color).join(','));
    } else if (st.bgVariant === 'cyberpunk') {
      const pg = norm(pageBg);
      const ok = pg.includes(norm(st.cyberPrimary)) && pg.includes(norm(st.cyberSecondary));
      check(bx + 'grid cyberpunk com as 2 cores neon no fundo público', ok, st.cyberPrimary + ' + ' + st.cyberSecondary);
      bgIdentity = norm(st.cyberPrimary + '|' + st.cyberSecondary);
} else {
      bgIdentity = N(st.pageBgColor || preset.preview.bg);
    }

    check(bx + 'botão com a cor do tema no público', N(btnBg) === N(preset.preview.btn), '--card-destaque-bg=' + btnBg);
    check(bx + 'texto do botão com a cor do tema no público', N(btnTxt) === N(preset.preview.btnText), '--card-destaque-text=' + btnTxt);
    check(bx + 'título da página com a cor de texto do tema', N(titleInk) === N(st.pageTextColor || preset.preview.text), '--text-title=' + titleInk);
    /* --text-body só é derivado em fundos sólidos (mixHex exige hex);
       nos gradientes o texto da página segue o --text-title (já verificado). */
    if (st.bgVariant === 'solid') {
      check(bx + 'cor de corpo (--text-body) derivada do tema', !!textBody, '--text-body=' + textBody.slice(0, 40));
    }

    /* 2) PARIDADE admin (preview) == público */
    if (st.bgVariant === 'cyberpunk') {
      const ai = norm(pvPage.style.backgroundImage || '');
      const ok = ai.includes(norm(st.cyberPrimary)) && ai.includes(norm(st.cyberSecondary));
      check(bx + 'paridade cyberpunk: preview admin com as mesmas cores neon', ok);
    } else if (st.bgVariant === 'gradient') {
      check(bx + 'paridade gradiente: preview admin == público', norm(pvPage.style.background || pvPage.style.backgroundImage || '') === norm(pageBg),
        'admin=' + (pvPage.style.background || pvPage.style.backgroundImage || '').slice(0, 50) + ' público=' + pageBg.slice(0, 50));
    } else {
      check(bx + 'paridade cor sólida: preview admin == público', N(pvPage.style.background || '') === N(pageBg),
      'admin=' + (pvPage.style.background || '') + ' público=' + pageBg);
    }

    /* Paridade do botão: admin expõe --p-btnbg/--p-btnink no #pvPage;
       o público tem --card-destaque-bg/-text (mecanismos distintos). */
    const aBtnBg = pvPage.style.getPropertyValue('--p-btnbg') || '';
    const aBtnTxt = pvPage.style.getPropertyValue('--p-btnink') || '';
    check(bx + 'paridade botão: fundo do botão admin == público', N(aBtnBg) === N(btnBg), 'admin=' + aBtnBg + ' público=' + btnBg);
    check(bx + 'paridade botão: texto do botão admin == público', N(aBtnTxt) === N(btnTxt), 'admin=' + aBtnTxt + ' público=' + btnTxt);

    applied.push({ preset, st, pageBg, bgIdentity, btnBg: N(btnBg), btnTxt: N(btnTxt), textBody: norm(textBody) });
  }

  /* 3) DISTINÇÃO — assinatura cromática única entre os 7 (sem prefixo) */
  {
    const sigs = applied.map((a) => a.bgIdentity + '|' + a.btnBg + '|' + a.btnTxt);
    const uniq = new Set(sigs);
    check('7 temas com assinatura cromática (fundo+botão+texto) ÚNICA', uniq.size === applied.length,
      [...uniq].join('  '));
    const bodies = applied.map((a) => a.textBody).filter(Boolean);
    check('cor de corpo (--text-body) distinta entre os temas sólidos', new Set(bodies).size === bodies.length && bodies.length >= 4,
      bodies.join(' , '));
  }

  /* 4) CONTRASTE interno (WCAG AA) */
  for (const a of applied) {
    const st = a.st;
    const bx = a.preset.name + ' — ';
    const textC = st.pageTextColor || a.preset.preview.text;
    let bgTone = textC;
    if (st.bgVariant === 'gradient') {
      const stops = Array.isArray(st.gradientStops) ? st.gradientStops : [
        { color: st.gradientStart, pos: 0 }, { color: st.gradientEnd, pos: 100 }
      ];
      const worst = Math.min(...stops.map((s) => ratio(textC, s.color)));
      check(bx + 'contraste texto vs gradiente >= 4.5', worst >= 4.5, worst.toFixed(2) + ':1');
      bgTone = stops.map((s) => s.color).sort((x, y) => lum(x) - lum(y))[0];
    } else if (st.bgVariant === 'cyberpunk') {
      const r = ratio(textC, '#0a0a0f');
      check(bx + 'contraste texto vs fundo neon >= 4.5', r >= 4.5, r.toFixed(2) + ':1');
    } else {
      const r = ratio(textC, st.pageBgColor);
      check(bx + 'contraste texto vs fundo >= 4.5', r >= 4.5, r.toFixed(2) + ':1');
    }

    let btnText = st.btnTextColor;
    let btnBg = st.btnBgColor;
    if (st.btnVariant === 'neon') btnText = st.btnGlowColor;
    let rBtn;
    if (st.btnVariant === 'glass') {
      const base = alphaBlend(btnBg, bgTone);
      rBtn = ratio(btnText, base);
    } else {
      rBtn = ratio(btnText, btnBg);
    }
    check(bx + 'contraste texto do botão >= 3', rBtn >= 3, rBtn.toFixed(2) + ':1 (' + btnText + ' em ' + btnBg + ')');
  }

  /* 5) MINIATURAS da grade "Temas Prontos" */
  {
    const cards = dA.querySelectorAll('#presetsGrid .preset-card');
    check('grade com 7 miniaturas', cards.length === 7, 'cards=' + cards.length);
    const bgStrs = Array.from(cards).map((c) => norm(c.querySelector('.preset-preview').style.background));
    check('7 miniaturas com fundos VISUALMENTE distintos', new Set(bgStrs).size === cards.length);
    const isGrad = (_) => /linear-gradient/i;
    check('miniaturas de gradiente (Sunset/Glass) mostram gradiente de verdade',
      [...cards].filter((c) => /linear-gradient\(/i.test(c.querySelector('.preset-preview').style.background)).length === 2);
    for (const c of cards) {
      const nameEl = c.querySelector('.preset-name');
      const preset = presets.find((p) => p.name === nameEl.textContent);
      if (!preset) continue;
      const dots = c.querySelectorAll('.preset-preview__swatch');
      const [t, b, bt] = [dots[0]?.style.background, dots[1]?.style.background, dots[2]?.style.background];
      check(`miniatura ${preset.name}: 3 bolinhas = paleta (texto/botão/texto do botão)`,
        dots.length === 3 && N(t) === N(preset.preview.text) && N(b) === N(preset.preview.btn) && N(bt) === N(preset.preview.btnText),
        [t, b, bt].join(' , '));
    }
  }

  console.log(`\n  ✅ TEMAS PRONTOS Passed: ${pass}  |  ❌ Failed: ${fail}`);
  return fail;
}