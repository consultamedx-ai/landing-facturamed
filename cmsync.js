/* ConsultaMed — cmsync.js v1.0
   Sincronitzacio ADMINISTRATIVA (agenda + fitxes) amb app.consultamed.es.
   REGLA SAGRADA: mai puja res clinic (informes, historials, audio). Nomes sm_cites i fm2_pacients.
   Offline-first: localStorage mana en local; el servidor es la copia compartida entre dispositius. */
(function () {
  'use strict';
  var BASE = 'https://app.consultamed.es/api/s';
  var K = { cites: 'sm_cites', pac: 'fm2_pacients' };
  var org = null, nomUsuari = '', timer = null, orgs = [], orgNom = '';

  // ---- textos (4 idiomes, mateix codi d'idioma que els productes) ----
  var IDX = { es: 0, ca: 1, de: 2, en: 3 };
  function idi() { var l = localStorage.getItem('em_idioma_ui'); return IDX[l] !== undefined ? l : 'es'; }
  var TXT = {
    off:  ['☁ Sin conexión con la cuenta', '☁ Sense connexió amb el compte', '☁ Nicht mit Konto verbunden', '☁ Not connected to account'],
    entra:['Iniciar sesión', 'Iniciar sessió', 'Anmelden', 'Sign in'],
    sync: ['☁ Sincronizando…', '☁ Sincronitzant…', '☁ Synchronisiere…', '☁ Syncing…'],
    ok:   ['☁ Sincronizado', '☁ Sincronitzat', '☁ Synchronisiert', '☁ Synced'],
    err:  ['☁ Error de sincronización', '☁ Error de sincronització', '☁ Sync-Fehler', '☁ Sync error'],
    verif:['☁ Confirme su correo', '☁ Confirmi el seu correu', '☁ E-Mail bestätigen', '☁ Confirm your email'],
    obrir:['Abrir', 'Obrir', 'Öffnen', 'Open']
  };
  function t(k) { return TXT[k][IDX[idi()]]; }

  // ---- utilitats ----
  function crida(accio, dades) {
    var cos = Object.assign({ accio: accio }, dades || {});
    return fetch(BASE, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cos)
    });
  }
  function api(accio, dades) { return crida(accio, dades).then(function (r) { return r.json(); }); }
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
      xip.textContent = t('ok') + (orgs.length > 1 ? ' · ' + orgNom + ' ▾' : (nomUsuari ? ' · ' + nomUsuari.split(' ')[0] : ''));
      xip.style.cursor = orgs.length > 1 ? 'pointer' : 'default';
      xip.style.opacity = '1';
      setTimeout(function () { if (xip) xip.style.opacity = '.45'; }, 2500);
    } else if (estat === 'verifica') {
      // El servidor accepta la sessio pero encara no el correu: NO es pot dir "sincronitzat".
      xip.style.background = 'rgba(234,179,8,.15)'; xip.style.color = '#92400E';
      xip.innerHTML = t('verif') + ' · <a href="https://app.consultamed.es/panell" target="_blank" rel="noopener" style="color:#0F9488;font-weight:700;text-decoration:none">' + t('obrir') + '</a>';
      xip.style.opacity = '1';
    } else {
      xip.style.background = 'rgba(234,115,23,.12)'; xip.style.color = '#B45309';
      xip.textContent = t('err'); xip.style.opacity = '1';
    }
  }

  // ---- push / pull ----
  /* ENG-27 (03/09/2026) · SENSE SOSTRE PER CONSULTA: es puja per lots.
     Decisio d'en Roger (2/09): «una consulta privada pot arribar a tenir milers
     de pacients; vull que no hi hagi un maxim». El servidor conserva un sostre
     PER PETICIO (MAX_PACIENTS_SYNC = 500, MAX_CITES_SYNC = 2000: anti-abus), pero
     cap per consulta. Aqui les fitxes es parteixen en lots de 500 i les cites en
     lots de 2000, i s'envien EN SERIE (un sync.push darrere l'altre), tots amb
     complet:false: cap lot, per si sol, es «tot el meu estat». El lot i porta el
     tros i de pacients I el tros i de cites: son la meitat de peticions que
     enviar-los separats, i no hi ha cap dependencia entre ells (sync.push mai
     omple Cita.pacientId). Una peticio amb els dos arrays buits no s'envia.

     Al final, i NOMES si el dispositiu te dades, una sola crida sync.tanca amb
     la llista completa de noms i d'ids (cap fitxa: 5.000 noms son ~100 KB)
     perque el servidor faci l'esborrat propagat que abans feia complet:true.
     El guard «un dispositiu buit no buida el servidor» es conserva: sense
     dades, ni tanca. Si un lot falla, la cadena s'atura, ni tanca ni pull, i
     el xip diu «Error», com abans. L'unic sostre que queda es el localStorage
     del navegador (mesura a 04_Arquitectura). */
  var LOT = { pac: 500, cites: 2000 };   // = sostre per peticio del servidor
  function ambOk(r) { if (r && r.ok === false) throw r; return r; }
  function push() {
    if (!org) return Promise.resolve();
    var o = org;   // fixat aqui: un canvi de context a mig cami no barreja lots
    var pac = llegeix(K.pac), cit = llegeix(K.cites);
    var n = Math.max(Math.ceil(pac.length / LOT.pac), Math.ceil(cit.length / LOT.cites));
    var cadena = Promise.resolve({ ok: true });
    function lot(i) {
      return function () {
        return api('sync.push', { organitzacioId: o,
          pacients: pac.slice(i * LOT.pac, (i + 1) * LOT.pac),
          cites: cit.slice(i * LOT.cites, (i + 1) * LOT.cites),
          complet: false }).then(ambOk);
      };
    }
    for (var i = 0; i < n; i++) cadena = cadena.then(lot(i));
    if (pac.length || cit.length) cadena = cadena.then(function () {
      return api('sync.tanca', { organitzacioId: o,
        pacients: pac.map(function (p) { return p && p.nom; }).filter(Boolean),
        cites: cit.map(function (c) { return c && c.id; }).filter(function (id) { return id != null; })
      }).then(ambOk);
    });
    return cadena;
  }
  function pull() {
    if (!org) return Promise.resolve();
    return api('sync.pull', { organitzacioId: org }).then(function (r) {
      if (r && r.ok === false) throw r;
      if (!r || !r.ok) return;
      localStorage.setItem(K.pac, JSON.stringify(r.pacients || []));
      localStorage.setItem(K.cites, JSON.stringify(r.cites || []));
      window.dispatchEvent(new Event('cm-sync-pull'));
    });
  }
  function calVerificar(e) {
    return !!(e && typeof e.error === 'string' && /correu electronic|correo electr/i.test(e.error));
  }
  function cicle() {
    pintaXip('sync');
    return push().then(pull).then(function () { pintaXip('ok'); })
      .catch(function (e) { pintaXip(calVerificar(e) ? 'verifica' : 'err'); });
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
          .catch(function (e) { pintaXip(calVerificar(e) ? 'verifica' : 'err'); });
      }, 1200);
    },
    ara: cicle,
    // GestorMed: FacturaMed necessita l'organitzacio i poder cridar l'API.
    // NO obre cap porta nova: es la mateixa sessio i el mateix servidor.
    org: function () { return org; },
    api: api
  };

  // ---- multi-context: triar organitzacio (04_Arquitectura: un metge, N contexts) ----
  function triaOrg(id) {
    var o = null;
    for (var i = 0; i < orgs.length; i++) if (orgs[i].id === id) o = orgs[i];
    if (!o) o = orgs[0];
    org = o.id; orgNom = o.nom;
    try { localStorage.setItem('cm_org', org); } catch (e) {}
  }
  function menuOrgs() {
    var vell = document.getElementById('cm-org-menu');
    if (vell) { vell.remove(); return; }
    var m = document.createElement('div');
    m.id = 'cm-org-menu';
    m.style.cssText = 'position:fixed;right:14px;bottom:52px;z-index:61;background:#fff;border:1px solid #E7EDF3;' +
      'border-radius:12px;box-shadow:0 10px 30px rgba(13,59,102,.18);padding:6px;font:600 12.5px Inter,system-ui,sans-serif';
    orgs.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = (o.id === org ? '✓ ' : '') + o.nom;
      b.style.cssText = 'display:block;width:100%;text-align:left;border:0;background:none;padding:8px 12px;' +
        'border-radius:8px;cursor:pointer;font:inherit;color:' + (o.id === org ? '#0F9488' : '#1F2937');
      b.addEventListener('click', function () {
        m.remove();
        if (o.id === org) return;
        // primer es desa el context actual al servidor; despres es canvia i es baixa el nou
        pintaXip('sync');
        push().then(function () { triaOrg(o.id); return pull(); })
          .then(function () { pintaXip('ok'); })
          .catch(function (e) { pintaXip(calVerificar(e) ? 'verifica' : 'err'); });
      });
      m.appendChild(b);
    });
    document.body.appendChild(m);
  }

  // ---- arrencada ----
  function arrenca() {
    /* ENG-22 (nota) · `jo` es l'unica sonda de sessio d'aquesta pagina: push i
       pull nomes surten si respon que si. I si l'ultima vegada va dir que no i
       aquesta carrega no pot haver creat cap sessio (cmStore.potHaverSessio, amb
       el perque a cmstore.js), ni la sonda: el xip diu "sense connexio" igual
       que abans, pero sense cap 401 a la consola. */
    var st = window.cmStore || {};
    if (st.potHaverSessio && !st.potHaverSessio()) { pintaXip('off'); return; }
    crida('jo').then(function (r) {
      if (r.status === 401 && st.anotaSessio) st.anotaSessio(false);
      return r.json();
    }).then(function (r) {
      if (r && r.ok && st.anotaSessio) st.anotaSessio(true);
      if (r && r.ok && r.usuari && r.usuari.organitzacions.length) {
        nomUsuari = r.usuari.nom;
        orgs = r.usuari.organitzacions;
        var guardada = null;
        try { guardada = localStorage.getItem('cm_org'); } catch (e) {}
        triaOrg(guardada);
        cicle();
        setInterval(cicle, 5 * 60 * 1000); // refresc suau cada 5 min
        if (xip) xip.addEventListener('click', function (e) {
          if (orgs.length > 1 && !e.target.closest('a')) menuOrgs();
        });
      } else {
        pintaXip('off');
      }
    }).catch(function () { pintaXip('off'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrenca);
  else arrenca();
})();
