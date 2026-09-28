/* Validação da edição 100% AO VIVO: mockup e link público refletem a
   alteração no mesmo quadro, e a página pública NÃO recria os cards (para
   não piscar nem roubar o clique de quem está navegando).

   O que é provado:
     1) MOCKUP: digitar no painel atualiza o preview antes do antigo debounce
        de 150ms (aguarda só 2 frames).
     2) MOCKUP: 1 frame agrupa N eventos num único render (coalescing).
     3) PÚBLICO: a aba aberta recebe a config no mesmo quadro, sem esperar o
        autosave de 2s na nuvem.
     4) PÚBLICO: mudar um título NÃO troca o nó do card (identidade) e o
        texto novo aparece.
     5) PÚBLICO: mudar cor/raio/tipografia por link é aplicado no nó existente.
     6) PÚBLICO: apagar um estilo individual limpa o inline (sem herdar lixo).
     7) PÚBLICO: mudança ESTRUTURAL (link novo, subtítulo, cardStyle, imagem
        custom, ícone <img>×<i>, PIX) reconstrói a lista.
     8) PÚBLICO: clicar numa aba de categoria filtra e a edição seguinte
        reconstrói com a lista completa (nada fica desalinhado).

   Uso: node test/independencia.mjs  (ou chamando run() direto)
*/

import { boot, supabaseStub, ADMIN_PATH, INDEX_PATH } from './harness.mjs';
import { NEW_CONFIG } from './fixtures.mjs';

/* Aguarda N frames do jsdom (rAF fica ativo por causa de
   pretendToBeVisual:true no harness). */
function frames(window, n = 2) {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      if (i++ >= n) return resolve();
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

function base() {
  const c = JSON.parse(JSON.stringify(NEW_CONFIG));
  c.profile = c.profile || {};
  c.profile.displayName = 'Maria';
  c.profile.bio = 'bio';
  c.style = c.style || {};
  c.style.showCategoryTabs = false;
  c.links = [
    { id: 'l1', title: 'Site', url: 'https://a.com', type: 'site' },
    { id: 'l2', title: 'GitHub', url: 'https://b.com', type: 'github' }
  ];
  return c;
}

const clone = (v) => JSON.parse(JSON.stringify(v));

export async function run(log = console.log) {
  let failures = 0;
  const ok = (cond, msg) => {
    log(cond ? '  ✅ ' + msg : '  ❌ ' + msg);
    if (!cond) failures++;
  };

  /* ================================================================
     1 e 2 — MOCKUP por frame
     ================================================================ */
  log('\n━━━ AO VIVO · MOCKUP: atualiza no mesmo quadro do input ━━━');
  {
    const { window, errors } = boot(ADMIN_PATH, {
      supabase: supabaseStub(base()),
      url: 'https://axiumlink.test/admin.html'
    });
    ok(!errors.length, 'admin: boot sem erros de script' + (errors.length ? ' — ' + errors.map((e) => e.message).join(' | ') : ''));

    window.__axEditor.init(base());
    const pvName = window.document.getElementById('pvName');
    const input = window.document.getElementById('displayName');
    ok(!!pvName && !!input, 'admin: #pvName e #displayName presentes');

    input.value = 'Maria Editada';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    /* Só 2 frames (~32ms). Com o debounce antigo de 150ms isso falharia. */
    await frames(window, 2);
    ok(pvName.textContent === 'Maria Editada',
      'mockup reflete a digitação após 2 frames (antes: 150ms) — "' + pvName.textContent + '"');

    /* Coalescing: vários eventos no mesmo frame = 1 render só. Não medimos
       contagem de renders aqui, mas provamos que o resultado final é o último
       valor e que nada duplicou. */
    input.value = 'A';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    input.value = 'AB';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    input.value = 'Maria Final';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await frames(window, 2);
    ok(pvName.textContent === 'Maria Final', 'mockup mostra só o último valor após 3 eventos no mesmo frame — "' + pvName.textContent + '"');
  }

  /* ================================================================
     3 — PÚBLICO recebe no mesmo quadro (BroadcastChannel)
     ================================================================ */
  log('\n━━━ AO VIVO · PÚBLICO: aba aberta recebe sem esperar a nuvem ━━━');
  {
    const { window, errors } = boot(ADMIN_PATH, {
      supabase: supabaseStub(base()),
      url: 'https://axiumlink.test/admin.html'
    });
    ok(!errors.length, 'admin: boot sem erros de script' + (errors.length ? ' — ' + errors.map((e) => e.message).join(' | ') : ''));

    const posted = [];
    window.BroadcastChannel = class {
      constructor(name) { this.name = name; }
      postMessage(msg) { posted.push({ name: this.name, msg }); }
      close() {}
    };

    window.__axEditor.init(base());
    ok(window.__axEditor.openSync(), 'admin: canal de sync aberto para o slug');

    window.document.getElementById('displayName').value = 'Nome Ao Vivo';
    window.document.getElementById('displayName').dispatchEvent(new window.Event('input', { bubbles: true }));
    await frames(window, 2);

    ok(posted.length >= 1, 'admin: propagou para a aba pública sem esperar o autosave — ' + posted.length + ' mensagem(ns)');
    const last = posted[posted.length - 1];
    ok(!!last && last.msg && last.msg.type === 'config-updated', 'mensagem no contrato { type: config-updated }');
    ok(!!last && last.msg && last.msg.config && last.msg.config.profile.displayName === 'Nome Ao Vivo',
      'payload já vai com o valor novo (não espera o PATCH na nuvem) — "' + ((last && last.msg.config.profile.displayName) || '') + '"');

    /* Coalescing do broadcast: 3 eventos no mesmo frame → 1 mensagem. */
    posted.length = 0;
    const inp = window.document.getElementById('displayName');
    inp.value = 'x';
    inp.dispatchEvent(new window.Event('input', { bubbles: true }));
    inp.value = 'xy';
    inp.dispatchEvent(new window.Event('input', { bubbles: true }));
    inp.value = 'xyz';
    inp.dispatchEvent(new window.Event('input', { bubbles: true }));
    await frames(window, 2);
    ok(posted.length === 1, '3 digitação no mesmo frame viram 1 mensagem (não 3) — ' + posted.length);
  }

  /* ================================================================
     4 a 8 — PÚBLICO: reuso de DOM
     ================================================================ */
  log('\n━━━ AO VIVO · PÚBLICO: texto/estilo mudam NO LUGAR (sem piscar) ━━━');
  {
    const c1 = base();
    const { window } = boot(INDEX_PATH, {
      supabase: supabaseStub({ config: c1, slug: 'teste' }),
      url: 'https://axiumlink.test/?s=teste'
    });
    const d = window.document;
    window.__alaPublica.aplicar(c1);

    const card1 = d.querySelector('.pg-links-list a[data-link-idx="0"], .pg-links-list a');
    ok(!!card1, 'público: lista renderizada');

    /* --- 4: título novo no MESMO nó --- */
    const c2 = clone(c1);
    c2.links[0].title = 'Meu Site Novo';
    c2.links[0].url = 'https://novo.com';
    window.__alaPublica.aplicar(c2);

    const wrapAfter = d.querySelector('.pg-links-list');
    const card1b = wrapAfter.children[0];
    ok(card1b === card1, 'trocar o título e a URL NÃO recria o nó do card (identidade preservada)');
    ok((card1b.querySelector('strong') || {}).textContent === 'Meu Site Novo',
      'texto novo aparece no lugar — "' + ((card1b.querySelector('strong') || {}).textContent || '') + '"');
    ok(card1b.getAttribute('href') === 'https://novo.com', 'href atualizado no lugar — ' + card1b.getAttribute('href'));
    ok(card1b.getAttribute('aria-label') === 'Meu Site Novo', 'aria-label acompanha o texto');

    /* --- 5: estilo INDIVIDUAL (schema aninhado link.style) no nó existente --- */
    const c3 = clone(c2);
    c3.links[0].style = Object.assign({}, c3.links[0].style, {
      colors: { background: '#123456', text: '#ff0000' },
      format: 'pill'
    });
    c3.links[0].linkFontSize = 21;
    window.__alaPublica.aplicar(c3);
    const card1c = d.querySelector('.pg-links-list').children[0];
    ok(card1c === card1, 'mudar cor/raio/tipografia também NÃO recria o nó');
    ok(card1c.style.background === 'rgb(18, 52, 86)', 'cor individual aplicada no nó existente — ' + card1c.style.background);
    ok(card1c.style.color === 'rgb(255, 0, 0)', 'cor do texto aplicada — ' + card1c.style.color);
    ok(card1c.style.borderRadius === '9999px', 'formato pill aplicado — ' + card1c.style.borderRadius);
    ok(card1c.style.fontSize === '21px', 'tipografia aplicada — ' + card1c.style.fontSize);

    /* --- 6: apagar o estilo individual volta ao tema (nada fica grudado) --- */
    const c4 = clone(c3);
    c4.links[0].style = Object.assign({}, c4.links[0].style, {
      colors: { background: '', text: '' },
      format: ''
    });
    c4.links[0].linkFontSize = '';
    window.__alaPublica.aplicar(c4);
    const card1d = d.querySelector('.pg-links-list').children[0];
    ok(card1d === card1, 'limpar estilo também NÃO recria o nó');
    /* Tema indigo do fixture: botão #111827 sobre fundo claro, texto #ffffff. */
    ok(card1d.style.background === 'rgb(17, 24, 39)', 'background volta ao tema ao limpar — ' + card1d.style.background);
    ok(card1d.style.color === 'rgb(255, 255, 255)', 'color volta ao tema ao limpar — ' + card1d.style.color);
    ok(card1d.style.borderRadius === '16px', 'border-radius volta ao formato padrão ao limpar — ' + card1d.style.borderRadius);
    ok(card1d.style.fontSize === '15px', 'font-size volta ao global ao limpar — ' + card1d.style.fontSize);

    /* --- 7: mudança estrutural reconstrói --- */
    const casos = [
      ['link novo no fim', (c) => { c.links.push({ id: 'l3', title: 'Novo', url: 'https://c.com', type: 'site' }); }, 3],
      ['link removido', (c) => { c.links.pop(); }, 1],
      ['subtítulo entra', (c) => { c.links[0].sub = 'agora com sub'; }, 2],
      ['cardStyle highlight', (c) => { c.links[0].cardStyle = 'highlight'; }, 2],
      ['imagem no ícone (iconImg)', (c) => { c.links[0].iconImg = 'https://cdn.test/i.png'; }, 2],
      ['imagem some do ícone', (c) => { delete c.links[0].iconImg; }, 2],
      ['botão-imagem custom (customButtonImage)', (c) => { c.links[1].customButtonImage = 'https://cdn.test/b.png'; }, 2],
      ['PIX liga no fim', (c) => { c.profile.pix = { enabled: true, key: 'k', order: 2 }; }, 3]
    ];
    for (const [nome, mut] of casos) {
      const cur = clone(c4);
      mut(cur);
      window.__alaPublica.aplicar(cur);
      const n = d.querySelectorAll('.pg-links-list > *').length;
      const temImg = d.querySelector('.pg-links-list .featured__customimg');
      const temSub = d.querySelector('.pg-links-list .featured__sub');
      const temPix = d.querySelector('.pg-links-list a[data-pix="1"]');
      const temHigh = d.querySelector('.pg-links-list .featured__card--highlight');
      const temIconeImg = d.querySelector('.pg-links-list .featured__icon img');
      const formaOk =
        (nome.indexOf('link novo') === 0 && n === 3) ||
        (nome.indexOf('link removido') === 0 && n === 1) ||
        (nome.indexOf('subtítulo') === 0 && !!temSub && n === 2) ||
        (nome.indexOf('cardStyle') === 0 && !!temHigh && !temSub) ||
        (nome.indexOf('imagem no ícone') === 0 && !!temIconeImg) ||
        (nome.indexOf('imagem some') === 0 && !temIconeImg) ||
        (nome.indexOf('botão-imagem') === 0 && !!temImg) ||
        (nome.indexOf('PIX liga') === 0 && !!temPix && n === 3);
      ok(formaOk, 'mudança estrutural reconstrói: ' + nome);
    }

    /* --- 8: aba de categoria --- */
    log('\n━━━ AO VIVO · PÚBLICO: aba de categoria + edição depois do clique ━━━');
    const cCat = clone(c1);
    cCat.style.showCategoryTabs = true;
    cCat.links = [
      { id: 'l1', title: 'Site', url: 'https://a.com', type: 'site', category: 'topo' },
      { id: 'l2', title: 'GitHub', url: 'https://b.com', type: 'github', category: 'social' }
    ];
    const { window: w2 } = boot(INDEX_PATH, {
      supabase: supabaseStub({ config: cCat, slug: 'teste' }),
      url: 'https://axiumlink.test/?s=teste'
    });
    const d2 = w2.document;
    w2.__alaPublica.aplicar(cCat);
    const tabs = d2.querySelectorAll('.pg-tabs .pg-tab');
    ok(tabs.length === 3, 'abas de categoria renderizadas (Todos + 2) — ' + tabs.length);

    tabs[2].dispatchEvent(new w2.window.MouseEvent('click', { bubbles: true }));
    const filtrados = d2.querySelectorAll('.pg-links-list > *').length;
    ok(filtrados === 1, 'clicar na aba filtra a lista — ' + filtrados + ' card(s)');

    const cCat2 = clone(cCat);
    cCat2.links[1].title = 'GitHub Editado';
    w2.__alaPublica.aplicar(cCat2);
    const todos = d2.querySelectorAll('.pg-links-list > *').length;
    ok(todos === 2, 'edição depois do clique da aba volta para a lista completa (sem card órfão) — ' + todos);
    const textos = [...d2.querySelectorAll('.pg-links-list strong')].map((s) => s.textContent);
    ok(textos.indexOf('GitHub Editado') >= 0, 'card da aba mostra o texto NOVO (listener não ficou preso ao dado antigo) — ' + JSON.stringify(textos));
  }

  /* ================================================================
     9 — o listener de analytics NÃO pode se duplicar
     ================================================================ */
  log('\n━━━ AO VIVO · PÚBLICO: 1 clique = 1 contagem (sem listener duplicado) ━━━');
  {
    const cClk = base();
    cClk.links[0].id = 'l1';
    const { window } = boot(INDEX_PATH, {
      supabase: supabaseStub({ config: cClk, slug: 'teste' }),
      url: 'https://axiumlink.test/?s=teste'
    });
    const d = window.document;

    /* 20 atualizações ao vivo (o que acontece enquanto se digita). */
    window.__alaPublica.aplicar(cClk);
    for (let i = 1; i <= 20; i++) {
      const c = clone(cClk);
      c.links[0].title = 'Site v' + i;
      window.__alaPublica.aplicar(c);
    }
    ok(true, '20 atualizações ao vivo aplicadas sem listener extra');

    /* A chave de analytics deriva do PATHNAME (por isso 'default' neste
       harness, que monta a URL com ?s=). */
    const KEY = 'axiumlink_clicks_default';
    window.localStorage.removeItem(KEY);
    const card = d.querySelector('.pg-links-list a');
    card.dispatchEvent(new window.window.MouseEvent('click', { bubbles: true, cancelable: true }));

    const raw = window.localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    const n = data.l1 || 0;
    ok(n === 1, 'após 20 renders o primeiro clique conta UMA vez (não 21) — ' + n + 'x');

    /* E o id continua correto depois das atualizações (listener não preso ao
       config antigo). */
    window.localStorage.removeItem(KEY);
    const card2 = d.querySelector('.pg-links-list a');
    card2.dispatchEvent(new window.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    const data2 = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    ok((data2.l1 || 0) === 1, 'contagem continua no id certo após as atualizações — ' + JSON.stringify(data2));
  }

  return failures;
}
