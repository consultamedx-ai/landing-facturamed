/* GestorMed Despatx · l'aplicació instal·lable i l'alta del despatx (CEO, 1/10/2026).

   1. Registra el service worker (gestoria-sw.js, abast /gestoria). Sense ell, Chrome
      i Edge no ofereixen el seu botó d'instal·lar.
   2. «Instalar la aplicación»: quan el navegador ho permet (beforeinstallprompt), un
      botó a la pantalla d'entrada i un de petit a la barra de dalt. Si la pàgina ja
      s'obre com a aplicació, no surt res. Safari i Firefox no instal·len aplicacions
      web amb inici de sessió en un altre domini (app.consultamed.es): s'hi diu que
      cal Chrome o Edge, que és la veritat.
   3. Sense sessió: a més d'«Iniciar sesión», «Crear la cuenta del despacho» → l'alta
      de gestoria del servidor (/registre?despatx=1, ENG-32).
   No llegeix ni escriu cap dada: només l'idioma de la interfície (em_idioma_ui). */
(function () {
  'use strict';
  var ALTA = 'https://app.consultamed.es/registre?despatx=1';
  var TX = {
    es: {
      crea_pre: '¿Su gestoría aún no tiene cuenta?',
      crea: 'Crear la cuenta del despacho',
      tit: 'GestorMed en su ordenador',
      sub: 'Instálela como aplicación: icono y ventana propios, sin descargar ningún programa. Se actualiza sola.',
      instal: '⬇ Instalar la aplicación',
      instal_curt: '⬇ Instalar la app',
      fet: '✓ Aplicación instalada. La encontrará en el escritorio, en el Dock o en el menú Inicio.',
      manual: 'Si no aparece el botón, use el icono «Instalar» de la barra de direcciones o el menú del navegador (⋮ o …) → Instalar.',
      no_suport: 'Para instalarla, abra esta página con Google Chrome o Microsoft Edge, en Windows o en Mac.'
    },
    ca: {
      crea_pre: 'La seva gestoria encara no té compte?',
      crea: 'Crear el compte del despatx',
      tit: 'GestorMed al seu ordinador',
      sub: "Instal·li-la com a aplicació: icona i finestra pròpies, sense descarregar cap programa. S'actualitza sola.",
      instal: "⬇ Instal·lar l'aplicació",
      instal_curt: "⬇ Instal·lar l'app",
      fet: "✓ Aplicació instal·lada. La trobarà a l'escriptori, al Dock o al menú Inici.",
      manual: "Si no apareix el botó, faci servir la icona «Instal·lar» de la barra d'adreces o el menú del navegador (⋮ o …) → Instal·lar.",
      no_suport: 'Per instal·lar-la, obri aquesta pàgina amb Google Chrome o Microsoft Edge, a Windows o a Mac.'
    }
  };
  function idioma() {
    var l = null;
    try { l = new URLSearchParams(location.search).get('idioma'); } catch (e) {}
    if (l !== 'ca' && l !== 'es') { try { l = localStorage.getItem('em_idioma_ui'); } catch (e) { l = null; } }
    if (l !== 'ca' && l !== 'es') l = (navigator.language || '').toLowerCase().indexOf('ca') === 0 ? 'ca' : 'es';
    return l;
  }
  function t(k) { var l = idioma(); return (TX[l] && TX[l][k]) || TX.es[k]; }
  function $(id) { return document.getElementById(id); }

  var esApp = false;
  try { esApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) {}
  var esChromium = (function () {
    try {
      if (navigator.userAgentData && navigator.userAgentData.brands)
        return navigator.userAgentData.brands.some(function (b) { return /Chromium|Google Chrome|Microsoft Edge/.test(b.brand); });
    } catch (e) {}
    return /(Chrome|Chromium|Edg)\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
  })();

  var diferit = null, instalada = false, esperat = false;

  // 1 · El service worker (abast /gestoria: la resta del web no el veu).
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/gestoria-sw.js', { scope: '/gestoria' }).catch(function () {});
  }
  // 2 · El botó del navegador.
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); diferit = e; pinta(); });
  window.addEventListener('appinstalled', function () { diferit = null; instalada = true; pinta(); });
  setTimeout(function () { esperat = true; pinta(); }, 2500);

  function instal() {
    if (!diferit) return;
    var d = diferit; diferit = null;
    d.prompt();
    if (d.userChoice) d.userChoice.then(function (r) { if (r && r.outcome === 'accepted') instalada = true; pinta(); }).catch(function () { pinta(); });
    pinta();
  }

  function estil() {
    if ($('gm-instal-estil')) return;
    var s = document.createElement('style'); s.id = 'gm-instal-estil';
    s.textContent =
      '.gm-alta{margin-top:26px;padding-top:20px;border-top:1px solid #E7EDF3}' +
      '.gm-alta p{margin:0 0 10px;color:#475569;font-size:.92rem}' +
      '.gm-alta a{text-decoration:none;display:inline-block}' +
      '.gm-instal{margin:26px auto 0;max-width:460px;text-align:left;background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 20px;display:flex;gap:16px;align-items:flex-start}' +
      '.gm-instal img{width:52px;height:52px;border-radius:12px;flex:none}' +
      '.gm-instal strong{display:block;color:#0D3B66;font-family:Sora,Inter,sans-serif;font-size:1rem;margin-bottom:4px}' +
      '.gm-instal p{margin:0 0 10px;color:#475569;font-size:.86rem;line-height:1.45}' +
      '.gm-instal .gm-nota{margin:8px 0 0;font-size:.8rem;color:#64748B}' +
      '.gm-instal .gm-nota.fet{color:#047857;font-weight:600}' +
      '#gm-b-instal-nav{white-space:nowrap}' +
      '#gm-instal[hidden],#gm-instal [hidden],#gm-b-instal-nav[hidden]{display:none!important}';
    (document.head || document.documentElement).appendChild(s);
  }

  function munta() {
    estil();
    var fora = $('v-fora');
    if (fora && !$('gm-alta')) {
      var a = document.createElement('div'); a.className = 'gm-alta'; a.id = 'gm-alta';
      a.innerHTML = '<p id="gm-crea-pre"></p><a class="btn sec" id="gm-b-crea" href="' + ALTA + '"></a>';
      fora.appendChild(a);
      var c = document.createElement('div'); c.className = 'gm-instal'; c.id = 'gm-instal';
      c.innerHTML = '<img src="/gestormed-192.png" alt=""><div><strong id="gm-tit"></strong><p id="gm-sub"></p>' +
        '<button class="btn" type="button" id="gm-b-instal" hidden></button><p class="gm-nota" id="gm-nota"></p></div>';
      fora.appendChild(c);
      $('gm-b-instal').addEventListener('click', instal);
    }
    var nav = document.querySelector('nav.nav');
    if (nav && !$('gm-b-instal-nav')) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'logout'; b.id = 'gm-b-instal-nav'; b.hidden = true;
      b.addEventListener('click', instal);
      var dreta = nav.lastElementChild;
      if (dreta && dreta !== nav.firstElementChild) dreta.insertBefore(b, dreta.firstChild); else nav.appendChild(b);
    }
    document.querySelectorAll('.lang button').forEach(function (x) { x.addEventListener('click', function () { setTimeout(pinta, 0); }); });
    pinta();
  }

  function posa(id, text) { var e = $(id); if (e) e.textContent = text; }
  function pinta() {
    posa('gm-crea-pre', t('crea_pre')); posa('gm-b-crea', t('crea'));
    posa('gm-tit', t('tit')); posa('gm-sub', t('sub'));
    posa('gm-b-instal', t('instal')); posa('gm-b-instal-nav', t('instal_curt'));
    var caixa = $('gm-instal'), b = $('gm-b-instal'), bn = $('gm-b-instal-nav'), nota = $('gm-nota');
    if (caixa) caixa.hidden = esApp;
    if (b) b.hidden = !diferit;
    if (bn) bn.hidden = !diferit || esApp;
    if (nota) {
      var n = '', fet = false;
      if (instalada) { n = t('fet'); fet = true; }
      else if (!diferit && esperat) n = esChromium ? t('manual') : t('no_suport');
      nota.textContent = n; nota.className = 'gm-nota' + (fet ? ' fet' : '');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', munta); else munta();
})();
