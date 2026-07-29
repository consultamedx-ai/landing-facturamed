/* ConsultaMed — cmsync.js v1.0
   Sincronitzacio ADMINISTRATIVA (agenda + fitxes) amb app.consultamed.es.
   REGLA SAGRADA: mai puja res clinic (informes, historials, audio). Nomes sm_cites i fm2_pacients.
   Offline-first: localStorage mana en local; el servidor es la copia compartida entre dispositius. */
(function () {
  'use strict';
  var BASE = 'https://app.consultamed.es/api/s';
  var K = { cites: 'sm_cites', pac: 'fm2_pacients' };
  var org = null, nomUsuari = '', timer = null;

  // ---- textos (4 idiomes, mateix codi d'idioma que els productes) ----
  var IDX = { es: 0, ca: 1, de: 2, en: 3 };
  function idi() { var l = localStorage.getItem('em_idioma_ui'); return IDX[l] !== undefined ? l : 'es'; }
  var TXT = {
    off:  ['☁ Sin conexión con la cuenta', '☁ Sense connexió amb el compte', '☁ Nicht mit Konto verbunden', '☁ Not connected to account'],
    entra:['Iniciar sesión', 'Iniciar sessió', 'Anmelden', 'Sign in'],
    sync: ['☁ Sincronizando…', '☁ Sincronitzant…', '☁ Synchronisiere…', '☁ Syncing…'],
    ok:   ['☁ Sincronizado', '☁ Sincronitzat', '☁ Synchronisiert', '☁ Synced'],
    err:  ['☁ Error de sincronización', '☁ Error de sincronització', '☁ Sync-Fehler', '☁ Sync error']
  };
  function t(k) { return TXT[k][IDX[idi()]]; }

  // ---- utilitats ----
  function api(accio, dades) {
    var cos = Object.assign({ accio: accio }, dades || {});
    return fetch(BASE, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cos)
    }).then(function (r) { return r.json(); });
  }
  function llegeix(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }

  // ---- xip d'estat (discret, cantonada inferior dreta) ----
  var xip = null;
  function pintaXip(estat) {
    if (!xip) {
      xip = document.createElement('div');
      xip.id = 'cm-sync-xip';
      xip.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:60;font:600 12px/1 Inter,system-ui,sans-serif;' +
        'padding:8px 14px;border-radius:99px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'box-shadow:0 4px 16px rgba(13,59,102,.18);transition:opacity .3s;user-select:none';
      document.body.appendChild(xip);
    }
    if (estat === 'off') {
      xip.style.background = 'rgba(148,163,184,.15)'; xip.style.color = '#64748B';
      xip.innerHTML = t('off') + ' · <a href="https://app.consultamed.es" style="color:#0F9488;font-weight:700;text-decoration:none">' + t('entra') + '</a>';
      xip.style.opacity = '1';
    } else if (estat === 'sync') {
      xip.style.background = 'rgba(20,184,166,.12)'; xip.style.color = '#0F9488';
      xip.textContent = t('sync'); xip.style.opacity = '1';
    } else if (estat === 'ok') {
      xip.style.background = 'rgba(20,184,166,.12)'; xip.style.color = '#0F9488';
      xip.textContent = t('ok') + (nomUsuari ? ' · ' + nomUsuari.split(' ')[0] : '');
      xip.style.opacity = '1';
      setTimeout(function () { if (xip) xip.style.opacity = '.45'; }, 2500);
    } else {
      xip.style.background = 'rgba(234,115,23,.12)'; xip.style.color = '#B45309';
      xip.textContent = t('err'); xip.style.opacity = '1';
    }
  }

  // ---- push / pull ----
  function push() {
    if (!org) return Promise.resolve();
    return api('sync.push', { organitzacioId: org, pacients: llegeix(K.pac), cites: llegeix(K.cites) });
  }
  function pull() {
    if (!org) return Promise.resolve();
    return api('sync.pull', { organitzacioId: org }).then(function (r) {
      if (!r || !r.ok) return;
      localStorage.setItem(K.pac, JSON.stringify(r.pacients || []));
      localStorage.setItem(K.cites, JSON.stringify(r.cites || []));
      window.dispatchEvent(new Event('cm-sync-pull'));
    });
  }
  function cicle() {
    pintaXip('sync');
    return push().then(pull).then(function () { pintaXip('ok'); })
      .catch(function () { pintaXip('err'); });
  }

  // ---- API publica: els productes criden cmSync.canvi(clau) en desar ----
  window.cmSync = {
    actiu: function () { return !!org; },
    canvi: function (k) {
      if (!org) return;
      if (k !== K.cites && k !== K.pac) return; // res mes se sincronitza. MAI el clinic.
      clearTimeout(timer);
      timer = setTimeout(function () {
        pintaXip('sync');
        push().then(function (r) { pintaXip(r && r.ok ? 'ok' : 'err'); })
          .catch(function () { pintaXip('err'); });
      }, 1200);
    },
    ara: cicle
  };

  // ---- arrencada ----
  function arrenca() {
    api('jo').then(function (r) {
      if (r && r.ok && r.usuari && r.usuari.organitzacions.length) {
        nomUsuari = r.usuari.nom;
        org = r.usuari.organitzacions[0].id;
        cicle();
        setInterval(cicle, 5 * 60 * 1000); // refresc suau cada 5 min
      } else {
        pintaXip('off');
      }
    }).catch(function () { pintaXip('off'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrenca);
  else arrenca();
})();
