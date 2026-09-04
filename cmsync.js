/* ConsultaMed — cmsync.js v1.0
   Sincronitzacio ADMINISTRATIVA (agenda + fitxes) amb app.consultamed.es.
   REGLA SAGRADA: mai puja res clinic (informes, historials, audio). Nomes sm_cites i fm2_pacients.
   Offline-first: localStorage mana en local; el servidor es la copia compartida entre dispositius. */
(function () {
  'use strict';
  var BASE = 'https://app.consultamed.es/api/s';
  var K = { cites: 'sm_cites', pac: 'fm2_pacients' };
  var org = null, nomUsuari = '', timer = null, orgs = [], orgNom = '';
  /* Revisio adversaria 04/09/2026 · la resposta de `jo` d'aquesta carrega, per
     compartir-la: qui la necessiti a la mateixa pagina no ha de tornar a
     sondar (ho fa config.html, que abans preguntava dues vegades per carrega).
     Es null mentre no s'ha preguntat, i tambe si aqui s'ha decidit no preguntar
     perque no pot haver-hi sessio; llavors cmSync.jo() resol amb null, que es
     el que hauria contestat el servidor. */
  var joResposta = null;

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
    /* Revisio adversaria 04/09/2026 · CONTRAST DEL XIP (regla 9 del contracte:
       4,5:1 minim en tot text). El xip es l'unic element que veu TOT visitant
       sense sessio de FacturaMed i SecreMed, i cap dels seus textos hi arribava.
       Els fons son TRANSLUCIDS, o sigui que el que compta es el color compost
       amb el que hi ha a sota, i a sota no sempre hi ha Blanc Gasa: mesurat amb
       Chromium (un pixel de sota el xip, amb el xip amagat) surt #E9EEF3 a
       app.html, #F0F4F8 a secremed.html i #F7FAFC a config.html. Els numeros de
       sota son els del PITJOR dels tres (app.html), amb proves/contrast-wcag.mjs:
         off       rgba(148,163,184,.15) sobre #E9EEF3 = #DCE3EA
                   text   #64748B 3,68:1 -> #475569 5,85:1
                   enllac #0F9488 2,89:1 -> Blau Clinic #0D3B66 8,84:1
         sync/ok   rgba(20,184,166,.12)  sobre #E9EEF3 = #CFE8EA
                   text   #0F9488 2,92:1 -> Blau Clinic #0D3B66 8,93:1
         verifica  rgba(234,179,8,.15)   sobre #E9EEF3 = #E9E5D0
                   enllac #0F9488 -> #0D3B66 9,04:1 (el text #92400E ja en feia 5,60)
         error     rgba(234,115,23,.12)  sobre #E9EEF3 = #E9DFD9
                   text   #B45309 3,83:1 -> #9A3412 5,57:1
       L'ordre demanava #0D7F74 (el teal fosc que les landings han adoptat al
       repas visual) per als estats sync/ok i per a l'enllac. NO S'HI POSA: sobre
       el fons compost del xip nomes en fa 3,81:1 (sync/ok) i 4,14:1 (off), per
       sota del minim; el 4,65:1 de les landings es sobre Blanc Gasa net, sense
       cap tint al damunt. Es fa servir l'altra opcio que la revisio deixava
       oberta, Blau Clinic, que passa de sobres a les tres pagines. #0D7F74 si
       que es fa servir al menu d'organitzacions, que te fons blanc opac. */
    if (estat === 'off') {
      xip.style.background = 'rgba(148,163,184,.15)'; xip.style.color = '#475569';
      xip.innerHTML = t('off') + ' · <a href="https://app.consultamed.es" style="color:#0D3B66;font-weight:700;text-decoration:none">' + t('entra') + '</a>';
      xip.style.opacity = '1';
    } else if (estat === 'sync') {
      xip.style.background = 'rgba(20,184,166,.12)'; xip.style.color = '#0D3B66';
      xip.textContent = t('sync'); xip.style.opacity = '1';
    } else if (estat === 'ok') {
      xip.style.background = 'rgba(20,184,166,.12)'; xip.style.color = '#0D3B66';
      xip.textContent = t('ok') + (orgs.length > 1 ? ' · ' + orgNom + ' ▾' : (nomUsuari ? ' · ' + nomUsuari.split(' ')[0] : ''));
      xip.style.cursor = orgs.length > 1 ? 'pointer' : 'default';
      xip.style.opacity = '1';
      setTimeout(function () { if (xip) xip.style.opacity = '.45'; }, 2500);
    } else if (estat === 'verifica') {
      // El servidor accepta la sessio pero encara no el correu: NO es pot dir "sincronitzat".
      xip.style.background = 'rgba(234,179,8,.15)'; xip.style.color = '#92400E';
      xip.innerHTML = t('verif') + ' · <a href="https://app.consultamed.es/panell" target="_blank" rel="noopener" style="color:#0D3B66;font-weight:700;text-decoration:none">' + t('obrir') + '</a>';
      xip.style.opacity = '1';
    } else {
      xip.style.background = 'rgba(234,115,23,.12)'; xip.style.color = '#9A3412';
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
  /* Revisio adversaria 04/09/2026 · EL SOSTRE DE sync.tanca (MAX_TANCA del
     servidor: 20.000 per llista). Per sobre, sync.tanca tornava 413, la cadena
     llancava i el pull NO S'EXECUTAVA MAI MES en aquell dispositiu (el cicle es
     push().then(pull)): el xip es quedava en «Error de sincronitzacio» cada
     cinc minuts i la sincronitzacio quedava morta. SecreMed no purga mai les
     cites passades, o sigui que el sostre s'assoleix nomes amb el temps: era un
     limit per consulta que tornava per la porta del darrere, just el que en
     Roger va demanar que no existis. Ara, per sobre del sostre, el cicle SEMPRE
     acaba i el pull corre:
       - CITES: es tanca amb una FINESTRA. Nomes viatgen els ids de les cites
         amb data dins dels ultims TANCA_DIES, i el cos porta `citesDesDe` amb
         aquella data; el servidor (corregit en paral.lel) nomes esborra dins de
         la finestra, o sigui que una cita antiga que no ha viatjat no s'esborra
         per haver-se quedat fora de la llista.
       - FITXES: s'envia `pacients: []`. El servidor no esborra res quan la
         llista es buida (guard «un dispositiu buit no buida el servidor»): amb
         mes de 20.000 fitxes els esborrats de fitxa deixen de propagar-se, pero
         l'agenda segueix sincronitzada i el dispositiu segueix baixant dades.
     Les dues coses son una degradacio conscient d'un cas extrem; el que no es
     accepta es una sincronitzacio morta. */
  var MAX_TANCA = 20000;   // = MAX_TANCA de route.js
  var TANCA_DIES = 400;    // finestra d'esborrat de cites quan es passa el sostre
  function ambOk(r) { if (r && r.ok === false) throw r; return r; }
  /* Revisio adversaria 04/09/2026 · CINTURO PER A L'ORDRE DE PUBLICACIO.
     ENG-28 va partir el `contacte` en `telefon` i `correu`, i el client va deixar
     d'enviar-lo. El servidor PUBLICAT encara nomes llegeix `p.contacte` a
     sync.push: si la web sortis abans que el servidor, cada pujada posaria el
     telefon en blanc a totes les fitxes del servidor. El .command del
     coordinador ja publica en l'ordre correcte i ho comprova; aixo es el segon
     cinturo, perque l'ordre deixi de ser critic: cada fitxa de cada lot viatja
     amb el `contacte` DERIVAT ([telefon, correu] units amb « · »), que el
     servidor nou ignora explicitament quan li arriben telefon i correu. Nomes
     s'afegeix si la fitxa no en porta cap (una fitxa vella que encara el tingui
     no es toca) i nomes si hi ha alguna cosa que derivar.
     ES TRANSITORI: es pot treure al proper lot, un cop ENG-28 sigui a
     produccio. */
  function ambContacte(p) {
    if (!p || typeof p !== 'object' || p.contacte) return p;
    var c = [p.telefon, p.correu].filter(Boolean).join(' · ');
    if (!c) return p;
    var q = Object.assign({}, p); q.contacte = c; return q;
  }
  function push() {
    if (!org) return Promise.resolve();
    var o = org;   // fixat aqui: un canvi de context a mig cami no barreja lots
    var pac = llegeix(K.pac), cit = llegeix(K.cites);
    var n = Math.max(Math.ceil(pac.length / LOT.pac), Math.ceil(cit.length / LOT.cites));
    var cadena = Promise.resolve({ ok: true });
    function lot(i) {
      return function () {
        return api('sync.push', { organitzacioId: o,
          pacients: pac.slice(i * LOT.pac, (i + 1) * LOT.pac).map(ambContacte),
          cites: cit.slice(i * LOT.cites, (i + 1) * LOT.cites),
          complet: false }).then(ambOk);
      };
    }
    for (var i = 0; i < n; i++) cadena = cadena.then(lot(i));
    if (pac.length || cit.length) cadena = cadena.then(function () {
      var cos = { organitzacioId: o,
        pacients: pac.length > MAX_TANCA ? [] : pac.map(function (p) { return p && p.nom; }).filter(Boolean),
        cites: cit.map(function (c) { return c && c.id; }).filter(function (id) { return id != null; }) };
      if (cit.length > MAX_TANCA) {
        /* la data de la cita es 'AAAA-MM-DD' (secremed.html): es compara com a text */
        var desDe = new Date(Date.now() - TANCA_DIES * 864e5).toISOString().slice(0, 10);
        cos.citesDesDe = desDe;
        cos.cites = cit.filter(function (c) { return c && String(c.data || '') >= desDe; })
                       .map(function (c) { return c.id; }).filter(function (id) { return id != null; });
      }
      return api('sync.tanca', cos).then(ambOk);
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
    api: api,
    jo: function () { return joResposta || Promise.resolve(null); }
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
        /* mateix motiu que el xip: #0F9488 sobre el blanc del menu fa 3,83:1; #0D7F74, 4,88:1 */
        'border-radius:8px;cursor:pointer;font:inherit;color:' + (o.id === org ? '#0D7F74' : '#1F2937');
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
       que abans, pero sense cap 401 a la consola.

       Revisio adversaria 04/09/2026 · aquella marca ja no es definitiva. La
       sessio es crea a app.consultamed.es i es pot crear en una ALTRA pestanya
       (el metge entra al panell i alla es queda): qui tornava a FacturaMed hi
       veia «Sin conexion con la cuenta» i no sincronitzava, cosa que contradiu
       el «cap canvi de comportament per a qui si que te sessio» d'ENG-22. Ara la
       marca caduca (cmstore.js) i, si aquesta carrega no ha preguntat, es torna
       a preguntar UNA sola vegada quan la pestanya recupera la vista o el focus:
       es exactament el moment en que el metge torna de l'altra pestanya. */
    var st = window.cmStore || {};
    if (st.potHaverSessio && !st.potHaverSessio()) {
      pintaXip('off');
      if (st.tornaASondar) st.tornaASondar(function () { sonda(st); });
      return;
    }
    sonda(st);
  }
  function sonda(st) {
    joResposta = crida('jo').then(function (r) {
      if (r.status === 401 && st.anotaSessio) st.anotaSessio(false);
      return r.json();
    }).catch(function () { return null; });
    joResposta.then(function (r) {
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
