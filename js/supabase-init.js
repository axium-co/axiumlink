/* ================================================================
   Cliente Supabase único — usado por admin.html e index.html
   Publica em window.supabase (compat com referências bare) e em
   window.supabaseClient. Falhas de boot viram erro acionável.
   ================================================================ */
(function () {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error(
      '[Axiumlink] SDK Supabase não carregou. Verifique a tag ' +
      '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js">' +
      ' (rede, bloqueador de extensões ou cache antigo do service worker).'
    );
    return;
  }
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('[Axiumlink] Credenciais ausentes — verifique js/env.js.');
    return;
  }
  try {
    const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    window.supabase = client;
    window.supabaseClient = client;
  } catch (err) {
    console.error('[Axiumlink] Falha ao criar cliente Supabase:', err.message);
  }
})();
