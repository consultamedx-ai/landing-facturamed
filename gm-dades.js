/* ConsultaMed · GestorMed Despatx — gm-dades.js (A-020, F1)
   La capa de dades del panell. Té la MATEIXA forma que les taules proposades
   a informes/F0.md §4 (DespatxClient, DespatxObligacio, DespatxPresentacio,
   DespatxDocument) perquè a F2 es canviï el magatzem per les accions de l'API
   sense tocar el tauler.

   F1: mode «prova» — un despatx fictici de 12 clients que viu NOMÉS al
   localStorage d'aquest navegador. Cap dada real, cap crida al servidor.
   Les dates dels estats són absolutes: el tauler, fixat a una data, només
   compta el que ja havia passat aquell dia (una presentació del 27/01 no
   existeix el 19/01). Així les tres dates simulades de les proves surten
   d'un sol joc de dades. */
(function (arrel, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else arrel.gmDades = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var CLAU = 'gm_despatx_prova';
  var VERSIO_LLAVOR = 3;             // si canvia la llavor, es torna a sembrar
  var magatzem = null, gm = null;    // gmTerminis, per suggerir obligacions i calcular dates
  var estat = null;

  function configura(o) {
    o = o || {};
    magatzem = o.magatzem || null;
    gm = o.terminis || (typeof window !== 'undefined' ? window.gmTerminis : null);
    if (o.clau) CLAU = o.clau;       // una gestoria real guarda a la seva clau, no a la del despatx de prova
    return api;
  }
  function llegeix() {
    if (!magatzem) return null;
    try { var s = magatzem.getItem(CLAU); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function desa() {
    if (!magatzem || !estat) return;
    try { magatzem.setItem(CLAU, JSON.stringify(estat)); } catch (e) { /* quota: es queda en memòria */ }
  }
  function carrega(opts) {
    opts = opts || {};
    var d = opts.reinicia ? null : llegeix();
    // buit: una gestoria real comença sense cap client (els metges ConsultaMed hi entren per importaPanell)
    if (!d || d.versioLlavor !== VERSIO_LLAVOR) { d = opts.buit ? buit(opts.gestoria) : sembra(); desa0(d); }
    estat = d;
    return estat;
  }
  function buit(gestoria) {
    return { versioLlavor: VERSIO_LLAVOR, mode: 'api', gestoria: gestoria || { id: null, nom: '' },
      clients: [], obligacions: [], presentacions: [], documents: [], resums: [], enviaments: [] };
  }

  // Els metges ConsultaMed entren SOLS: la resposta de gestoria.panell d'un
  // període (només agregats) crea el client si no existeix (la gestoria després
  // hi posa NIF i règims) i posa al dia el resum i l'enviament d'aquell període.
  // No sobreescriu mai el que la gestoria hagi editat del client.
  function importaPanell(periode, metges, avui) {
    (metges || []).forEach(function (m) {
      if (!m || m.estat !== 'ACTIU' || !m.organitzacioId) return;
      var id = 'cm-' + m.organitzacioId, c = client(id);
      if (!c) {
        c = { id: id, nom: m.nom || 'ConsultaMed', tipus: m.tipus === 'CENTRE' ? 'SOCIETAT' : 'AUTONOM',
          regimIrpf: m.tipus === 'CENTRE' ? 'SOCIETATS' : 'DIRECTA', regimIva: 'EXEMPT',
          organitzacioId: m.organitzacioId, actiu: true, creatEl: avui || avuiISO() };
        estat.clients.push(c);
        if (gm) obligacionsDesa(id, gm.obligacionsSuggerides(c), c.creatEl);
      }
      if (m.factures != null) {
        estat.resums = estat.resums.filter(function (r) { return !(r.organitzacioId === m.organitzacioId && r.periode === periode); });
        estat.resums.push({ organitzacioId: m.organitzacioId, periode: periode, factures: m.factures, base: m.base, quota: m.quota, total: m.total,
          baseExempta: m.baseExempta == null ? null : m.baseExempta, baseSubjecta: m.baseSubjecta == null ? null : m.baseSubjecta,
          prova: m.prova === true, cadenaIntegra: m.cadenaIntegra === true, primeraData: m.primeraData || null, darreraData: m.darreraData || null,
          actualitzatEl: m.actualitzatEl || null });
      }
      if (m.enviatEl) {
        estat.enviaments = estat.enviaments.filter(function (e) { return !(e.organitzacioId === m.organitzacioId && e.periode === periode); });
        estat.enviaments.push({ organitzacioId: m.organitzacioId, periode: periode, factures: m.facturesEnviades == null ? m.factures : m.facturesEnviades, enviatEl: m.enviatEl });
      }
    });
    desa();
  }
  function desa0(d) { estat = d; desa(); }
  function despatx() { return estat; }
  function idNou(prefix) { return prefix + Math.random().toString(36).slice(2, 8); }

  // ---------- clients ----------
  function clientDesa(c) {
    var nou = !c.id;
    if (nou) c.id = idNou('c');
    c.actiu = c.actiu !== false;
    c.actualitzatEl = c.actualitzatEl || null;
    var i = -1; estat.clients.forEach(function (x, k) { if (x.id === c.id) i = k; });
    if (i >= 0) estat.clients[i] = Object.assign({}, estat.clients[i], c); else { c.creatEl = c.creatEl || avuiISO(); estat.clients.push(c); }
    if (nou && gm) obligacionsDesa(c.id, gm.obligacionsSuggerides(c), c.creatEl);
    desa();
    return c;
  }
  function clientEsborra(id) {
    ['clients'].forEach(function (k) { estat[k] = estat[k].filter(function (x) { return x.id !== id; }); });
    ['obligacions', 'presentacions', 'documents'].forEach(function (k) { estat[k] = estat[k].filter(function (x) { return x.clientId !== id; }); });
    desa();
  }
  function client(id) { var out = null; estat.clients.forEach(function (c) { if (c.id === id) out = c; }); return out; }

  // ---------- obligacions (la matriu) ----------
  function obligacionsDe(clientId) { return estat.obligacions.filter(function (o) { return o.clientId === clientId && o.actiu !== false; }); }
  // La matriu d'un client. Les obligacions que ja hi eren conserven el seu
  // «des de»; les noves comencen al període actual de la data donada (el
  // tauler no pinta períodes anteriors al «des de»). desDe pot ser una data
  // ISO (es converteix al període actual de cada model) o un mapa model→període.
  function obligacionsDesa(clientId, models, desDe) {
    var velles = {}; estat.obligacions.forEach(function (o) { if (o.clientId === clientId) velles[o.model] = o; });
    estat.obligacions = estat.obligacions.filter(function (o) { return o.clientId !== clientId; });
    models.forEach(function (m) {
      var v = velles[m], d = null;
      if (v && v.desDe) d = v.desDe;
      else if (desDe && typeof desDe === 'object') d = desDe[m] || null;
      else if (desDe && gm) d = gm.periodeActual(m, desDe);
      estat.obligacions.push({ id: v ? v.id : idNou('o'), clientId: clientId, model: m, actiu: true, desDe: d });
    });
    desa();
  }
  function obligacioDesDe(clientId, model, periode) {
    estat.obligacions.forEach(function (o) { if (o.clientId === clientId && o.model === model) o.desDe = periode || null; });
    desa();
  }

  // ---------- estats ----------
  function presentacioDesa(p) {
    var k = function (x) { return x.clientId === p.clientId && x.model === p.model && x.periode === p.periode; };
    estat.presentacions = estat.presentacions.filter(function (x) { return !k(x); });
    if (p.estat && p.estat !== 'PENDENT') estat.presentacions.push({ clientId: p.clientId, model: p.model, periode: p.periode, estat: p.estat,
      presentadaEl: p.presentadaEl || null, referencia: p.referencia || null, notes: p.notes || null });
    desa();
  }
  function presentacioDe(clientId, model, periode) {
    var out = null; estat.presentacions.forEach(function (x) { if (x.clientId === clientId && x.model === model && x.periode === periode) out = x; }); return out;
  }
  function documentDesa(d) {
    var k = function (x) { return x.clientId === d.clientId && x.model === d.model && x.periode === d.periode && x.clau === d.clau; };
    estat.documents = estat.documents.filter(function (x) { return !k(x); });
    if (d.estat && d.estat !== 'FALTA') estat.documents.push({ clientId: d.clientId, model: d.model, periode: d.periode, clau: d.clau, estat: d.estat, data: d.data || null, referencia: d.referencia || null });
    desa();
  }
  function documentsDe(clientId, model, periode) {
    return estat.documents.filter(function (x) { return x.clientId === clientId && x.model === model && x.periode === periode; });
  }

  // El despatx «tal com era» un dia concret: només compta el que ja havia passat.
  function despatxA(avui) {
    return {
      clients: estat.clients, obligacions: estat.obligacions,
      presentacions: estat.presentacions.filter(function (p) { return !p.presentadaEl || p.presentadaEl <= avui; }),
      documents: estat.documents.filter(function (d) { return !d.data || d.data <= avui; }),
      resums: estat.resums.filter(function (r) { return !r.actualitzatEl || r.actualitzatEl.slice(0, 10) <= avui; }),
      enviaments: estat.enviaments.filter(function (e) { return !e.enviatEl || e.enviatEl.slice(0, 10) <= avui; }),
    };
  }
  function avuiISO() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
  }

  // ═══════════════════════════════════════════════════════════════════
  // LA LLAVOR: «Assessoria de prova» amb 12 clients variats.
  // 3 metges ConsultaMed · 4 autònoms · 3 societats · 2 particulars.
  // Regla general: tot el que ha vençut abans de la llavor consta com a
  // presentat 3 dies abans del venciment i amb la documentació rebuda 16
  // dies abans. Les EXCEPCIONS de sota són els casos que el tauler ha
  // d'ensenyar (vençuts, tard, sense documentació, ConsultaMed que ha
  // facturat després d'enviar, no procedeix…).
  // ═══════════════════════════════════════════════════════════════════
  var CLIENTS = [
    { id: 'c01', nom: 'Dra. Marta Vila', tipus: 'AUTONOM', regimIrpf: 'DIRECTA', regimIva: 'EXEMPT', organitzacioId: 'org-vila', obligacions: ['130', '100'] },
    { id: 'c02', nom: 'Dr. Joan Puig, SLP', tipus: 'SOCIETAT', regimIrpf: 'SOCIETATS', regimIva: 'GENERAL', tePersonal: true, pagaLloguer: true, organitzacioId: 'org-puig', obligacions: ['303', '111', '115', '180', '190', '200', '202', '347', '390'] },
    { id: 'c03', nom: 'Clínica Dental Somriure, SL', tipus: 'SOCIETAT', regimIrpf: 'SOCIETATS', regimIva: 'GENERAL', tePersonal: true, organitzacioId: 'org-somriure', obligacions: ['303', '111', '190', '200', '202', '347', '390'] },
    { id: 'c04', nom: 'Instal·lacions Ferrer (autònom)', tipus: 'AUTONOM', regimIrpf: 'DIRECTA', regimIva: 'GENERAL', tePersonal: true, obligacions: ['303', '130', '111', '190', '347', '390', '100'] },
    { id: 'c05', nom: 'Bar La Plaça (mòduls)', tipus: 'AUTONOM', regimIrpf: 'OBJECTIVA', regimIva: 'GENERAL', obligacions: ['303', '131', '390', '100'], notes: 'Mòduls: revisar magnituds cada gener.' },
    { id: 'c06', nom: 'Laia Roca, psicòloga', tipus: 'AUTONOM', regimIrpf: 'DIRECTA', regimIva: 'EXEMPT', domicilia: true, obligacions: ['130', '100'] },
    { id: 'c07', nom: 'Pere Soler, traductor', tipus: 'AUTONOM', regimIrpf: 'DIRECTA', regimIva: 'GENERAL', intracomunitari: true, obligacions: ['303', '130', '349', '347', '390', '100'] },
    { id: 'c08', nom: 'Construccions Vallès, SL', tipus: 'SOCIETAT', regimIrpf: 'SOCIETATS', regimIva: 'GENERAL', tePersonal: true, pagaLloguer: true, domicilia: true, obligacions: ['303', '111', '115', '180', '190', '200', '202', '347', '390'] },
    { id: 'c09', nom: 'Botiga Mirall, SL', tipus: 'SOCIETAT', regimIrpf: 'SOCIETATS', regimIva: 'GENERAL', tePersonal: true, obligacions: ['303', '111', '190', '200', '202', '347', '390'] },
    { id: 'c10', nom: 'Consultoria Nord, SL', tipus: 'SOCIETAT', regimIrpf: 'SOCIETATS', regimIva: 'GENERAL', intracomunitari: true, capitalMobiliari: true, obligacions: ['303', '349', '123', '200', '202', '390'] },
    { id: 'c11', nom: 'Anna Batlle', tipus: 'PARTICULAR', regimIrpf: 'CAP', regimIva: 'CAP', obligacions: ['100'] },
    { id: 'c12', nom: 'Ramon Costa', tipus: 'PARTICULAR', regimIrpf: 'CAP', regimIva: 'CAP', obligacions: ['100'] },
  ];
  // Presentacions que NO segueixen la regla general (o que no existeixen).
  // 'MAI' = no presentada mai · data = presentada aquell dia · 'NO_PROCEDEIX'
  var EXCEPCIONS_PRESENTACIO = {
    'c04|111|2025T4': '2026-01-22',       // tard: el 19/01 venç l'endemà i no hi és
    'c08|111|2025T4': '2026-01-20',       // domicilia i se li passa la domiciliació del 15/01
    'c04|303|2026T2': '2026-11-02',       // el 06/10 fa 78 dies que ha vençut
    'c05|303|2026T3': '2026-10-05',       // presentat aviat: verd el 06/10
    'c08|303|2026T3': '2026-10-05',
    'c10|123|2026T3': 'NO_PROCEDEIX',     // aquest trimestre no ha pagat dividends
    'c12|100|2025': 'MAI',                // un particular que no va fer la Renda 2025
    'c11|100|2025': '2026-06-10',
    'c01|100|2025': '2026-06-20',
    'c09|202|2026P3': 'MAI',              // el 18/01/2027 fa 28 dies que ha vençut
    'c04|111|2026T4': '2027-01-25',       // tard un altre cop
  };
  // Documents que FALTEN (no es creen): el semàfor els pinta grocs.
  var DOCS_QUE_FALTEN = {
    'c02|111|2026T3': ['nomines', 'professionals'], 'c02|202|2026P2': ['base'],
    'c03|202|2026P2': ['base'],
    'c04|130|2026T3': ['despeses'],
    'c05|131|2026T3': ['moduls'],
    'c07|349|2026T3': ['intracom'], 'c07|303|2026T3': ['llibre'],
    'c09|111|2026T3': ['nomines'],
    'c10|349|2026T3': ['intracom'],
    'c02|303|2026T4': ['rebudes', 'llibre'],
    'c02|180|2025': ['rebuts-any'], 'c02|190|2025': ['nomines-any'],
  };
  // La facturació dels metges ConsultaMed (agregats, com ResumFiscal i Enviament)
  var RESUMS = [
    { organitzacioId: 'org-vila', periode: '2025T4', factures: 52, base: 7280, baseExempta: 7280, baseSubjecta: 0, quota: 0, total: 7280, primeraData: '2025-10-02', darreraData: '2025-12-30', cadenaIntegra: true, actualitzatEl: '2026-01-07T18:20:00Z' },
    { organitzacioId: 'org-vila', periode: '2026T3', factures: 41, base: 6150, baseExempta: 6150, baseSubjecta: 0, quota: 0, total: 6150, primeraData: '2026-07-02', darreraData: '2026-10-05', cadenaIntegra: true, actualitzatEl: '2026-10-05T10:12:00Z' },
    { organitzacioId: 'org-vila', periode: '2026T4', factures: 47, base: 7050, baseExempta: 7050, baseSubjecta: 0, quota: 0, total: 7050, primeraData: '2026-10-06', darreraData: '2026-12-29', cadenaIntegra: true, actualitzatEl: '2027-01-08T09:00:00Z' },
    { organitzacioId: 'org-puig', periode: '2025T4', factures: 118, base: 17900, baseExempta: 8300, baseSubjecta: 9600, quota: 2016, total: 19916, primeraData: '2025-10-01', darreraData: '2025-12-31', cadenaIntegra: true, actualitzatEl: '2026-01-05T08:00:00Z' },
    { organitzacioId: 'org-puig', periode: '2026T3', factures: 120, base: 18400, baseExempta: 8400, baseSubjecta: 10000, quota: 2100, total: 20500, primeraData: '2026-07-01', darreraData: '2026-09-30', cadenaIntegra: true, actualitzatEl: '2026-10-01T18:00:00Z' },
    { organitzacioId: 'org-puig', periode: '2026T4', factures: 130, base: 19800, baseExempta: 9000, baseSubjecta: 10800, quota: 2268, total: 22068, primeraData: '2026-10-01', darreraData: '2026-12-30', cadenaIntegra: true, actualitzatEl: '2027-01-12T11:00:00Z' },
    { organitzacioId: 'org-somriure', periode: '2025T4', factures: 290, base: 61000, baseExempta: 61000, baseSubjecta: 0, quota: 0, total: 61000, primeraData: '2025-10-01', darreraData: '2025-12-31', cadenaIntegra: true, actualitzatEl: '2026-01-09T12:00:00Z' },
    { organitzacioId: 'org-somriure', periode: '2026T3', factures: 310, base: 66400, baseExempta: 66400, baseSubjecta: 0, quota: 0, total: 66400, primeraData: '2026-07-01', darreraData: '2026-09-29', cadenaIntegra: false, actualitzatEl: '2026-10-03T16:30:00Z' },
    { organitzacioId: 'org-somriure', periode: '2026T4', factures: 302, base: 64100, baseExempta: 64100, baseSubjecta: 0, quota: 0, total: 64100, primeraData: '2026-10-01', darreraData: '2026-12-30', cadenaIntegra: true, actualitzatEl: '2027-01-10T10:00:00Z' },
  ];
  var ENVIAMENTS = [
    { organitzacioId: 'org-vila', periode: '2025T4', factures: 52, enviatEl: '2026-01-08T09:30:00Z' },
    { organitzacioId: 'org-vila', periode: '2026T3', factures: 39, enviatEl: '2026-10-02T09:00:00Z' },   // després en va emetre 2 més: el tauler ho ha de veure
    { organitzacioId: 'org-vila', periode: '2026T4', factures: 47, enviatEl: '2027-01-09T08:30:00Z' },
    { organitzacioId: 'org-puig', periode: '2025T4', factures: 118, enviatEl: '2026-01-05T08:10:00Z' },
    { organitzacioId: 'org-puig', periode: '2026T3', factures: 120, enviatEl: '2026-10-01T18:05:00Z' },
    // org-puig 2026T4: encara no ha enviat (té 130 factures) → feina per a la gestoria el gener del 2027
    { organitzacioId: 'org-somriure', periode: '2025T4', factures: 290, enviatEl: '2026-01-09T12:05:00Z' },
    // org-somriure 2026T3: no ha enviat, i a més la cadena no verifica
    { organitzacioId: 'org-somriure', periode: '2026T4', factures: 302, enviatEl: '2027-01-10T10:05:00Z' },
  ];

  function sembra() {
    if (!gm) throw new Error('gmDades.sembra: cal gmTerminis carregat');
    var d = { versioLlavor: VERSIO_LLAVOR, mode: 'prova', gestoria: { id: 'prova', nom: 'Assessoria de prova' },
      clients: [], obligacions: [], presentacions: [], documents: [], resums: RESUMS.slice(), enviaments: ENVIAMENTS.slice() };
    var FINS = '2027-03-31';   // fins on es «viuen» períodes a la llavor
    var ALTA = '2025-09-01';   // el despatx va començar a fer servir el panell aquest dia
    CLIENTS.forEach(function (c0) {
      var c = Object.assign({ actiu: true, creatEl: ALTA }, c0); var obl = c.obligacions; delete c.obligacions;
      d.clients.push(c);
      obl.forEach(function (m) {
        var desDe = gm.periodeActual(m, ALTA);
        d.obligacions.push({ id: 'o-' + c.id + '-' + m, clientId: c.id, model: m, actiu: true, desDe: desDe });
        gm.periodesDe(m, '2026-06-01', { enrere: 400, endavant: 700 }).forEach(function (p) {
          if (desDe && p < desDe) return;
          var dd = gm.dataEfectiva(m, p); if (!dd || dd.fi > FINS) return;
          var k = c.id + '|' + m + '|' + p, exc = EXCEPCIONS_PRESENTACIO[k];
          var dataPres = exc === undefined ? gm.suma(dd.fi, -3) : exc;
          if (dataPres === 'NO_PROCEDEIX') d.presentacions.push({ clientId: c.id, model: m, periode: p, estat: 'NO_PROCEDEIX', presentadaEl: gm.suma(dd.inici || dd.fi, 1) });
          else if (dataPres !== 'MAI') d.presentacions.push({ clientId: c.id, model: m, periode: p, estat: 'PRESENTADA', presentadaEl: dataPres, referencia: 'J' + p.replace(/[^0-9]/g, '') + c.id.slice(1) });
          var falten = DOCS_QUE_FALTEN[k] || [];
          gm.model(m).documents.forEach(function (doc) {
            if (falten.indexOf(doc.clau) >= 0) return;
            var auto = gm.model(m).consultamed && gm.model(m).consultamed.documentAuto === doc.clau && c.organitzacioId;
            if (auto) return;   // el rebut ConsultaMed surt de l'enviament, no d'un estat manual
            d.documents.push({ clientId: c.id, model: m, periode: p, clau: doc.clau, estat: 'REBUDA', data: gm.suma(dd.fi, -16), referencia: null });
          });
        });
      });
    });
    return d;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ENG-39 · LA CÒPIA DE LA CARTERA. Mentre F2c no hi sigui, la cartera
  // d'una gestoria real viu NOMÉS al seu navegador (la seva clau): si
  // s'esborren les dades de navegació, es perd. copia() la treu sencera;
  // llegeixCopia() la comprova SENSE tocar res; restaura() la posa.
  // Només s'accepta una còpia d'aquest mateix despatx, d'aquesta versió, i
  // amb cada camp en la forma que el panell escriu: el panell pinta alguns
  // camps sense escapar (codis de model, períodes, claus de document), o
  // sigui que una còpia de fora no hi pot posar res que el panell mateix no
  // hi hagués pogut posar. La gestoria de la cartera restaurada és la de la
  // sessió, no la de la còpia.
  // ═══════════════════════════════════════════════════════════════════
  var COPIA_APP = 'GestorMed Despatx', COPIA_VERSIO = 1, COPIA_MAX = 5 * 1024 * 1024;
  var RX_ID = /^[A-Za-z0-9_-]{1,64}$/, RX_DIA = /^\d{4}-\d{2}-\d{2}$/;
  var RX_MOMENT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;
  var LLISTES = ['clients', 'obligacions', 'presentacions', 'documents', 'resums', 'enviaments'];

  function copia(ara) {
    if (!estat) return null;
    var g = estat.gestoria || {};
    return { app: COPIA_APP, versio: COPIA_VERSIO, data: ara || new Date().toISOString(),
      gestoria: { id: g.id == null ? null : g.id, nom: g.nom || '' }, despatx: JSON.parse(JSON.stringify(estat)) };
  }
  function llegeixCopia(text, gestoria) {
    if (typeof text !== 'string' || text.length > COPIA_MAX) return { error: typeof text === 'string' ? 'copia_massa_gran' : 'copia_no_valida' };
    var c;
    try {
      // Cap clau que pugui tocar un prototip arriba mai a cap objecte.
      c = JSON.parse(text, function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
    } catch (e) { return { error: 'copia_no_valida' }; }
    if (!esObj(c) || c.app !== COPIA_APP || !esObj(c.despatx)) return { error: 'copia_no_valida' };
    if (c.versio !== COPIA_VERSIO) return { error: 'copia_versio' };
    var d = c.despatx, gid = gestoria && gestoria.id;
    var deLaCopia = esObj(c.gestoria) ? c.gestoria : {}, deDins = esObj(d.gestoria) ? d.gestoria : {};
    if (!gid || deLaCopia.id !== gid || deDins.id !== gid) {
      return { error: 'copia_altre_despatx', nom: String(deLaCopia.nom || deDins.nom || '').slice(0, 80) };
    }
    if (d.versioLlavor !== VERSIO_LLAVOR || d.mode !== 'api') return { error: 'copia_no_valida' };
    var net = { versioLlavor: VERSIO_LLAVOR, mode: 'api', gestoria: gestoria };
    for (var i = 0; i < LLISTES.length; i++) {
      var k = LLISTES[i];
      if (!Array.isArray(d[k])) return { error: 'copia_no_valida' };
      net[k] = [];
    }
    var ids = {};
    for (i = 0; i < d.clients.length; i++) {
      var cl = netClient(d.clients[i]);
      if (!cl || ids[cl.id]) return { error: 'copia_no_valida' };
      ids[cl.id] = true; net.clients.push(cl);
    }
    var fes = [[d.obligacions, net.obligacions, netObligacio], [d.presentacions, net.presentacions, netPresentacio], [d.documents, net.documents, netDocument],
      [d.resums, net.resums, netResum], [d.enviaments, net.enviaments, netEnviament]];
    for (i = 0; i < fes.length; i++) {
      for (var j = 0; j < fes[i][0].length; j++) {
        var x = fes[i][2](fes[i][0][j], ids);
        if (!x) return { error: 'copia_no_valida' };
        fes[i][1].push(x);
      }
    }
    return { despatx: net, n: net.clients.length, data: typeof c.data === 'string' && RX_MOMENT.test(c.data) ? c.data : '' };
  }
  function restaura(d) { estat = d; desa(); return estat; }

  // Cada objecte de la còpia, refet camp a camp: només els camps que el panell
  // escriu, amb la seva forma. Un camp de més o mal fet → null (la còpia no serveix).
  function esObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function nomesCamps(o, camps) { for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && camps.indexOf(k) < 0) return false; return true; }
  function opcional(v, prova) { return v === undefined || v === null || prova(v); }
  function text(max) { return function (v) { return typeof v === 'string' && v.length <= max; }; }
  function esModel(m) { return typeof m === 'string' && !!gm && gm.models().indexOf(m) >= 0; }
  function esPeriode(p) { return typeof p === 'string' && !!gm && !!gm.parsePeriode(p); }
  function esNombre(n) { return typeof n === 'number' && isFinite(n); }
  function esEnter(n) { return typeof n === 'number' && Math.floor(n) === n && n >= 0; }
  function esBool(b) { return typeof b === 'boolean'; }
  // (en l'ordre de la còpia: la cartera restaurada és, byte a byte, la que es va desar)
  function copiaCamps(o, camps) { var out = {}; Object.keys(o).forEach(function (k) { if (camps.indexOf(k) >= 0) out[k] = o[k]; }); return out; }
  function netClient(c) {
    if (!esObj(c) || !gm) return null;
    var reg = gm.cataleg().regims, marques = Object.keys(reg.marques);
    var camps = ['id', 'nom', 'tipus', 'regimIrpf', 'regimIva', 'notes', 'organitzacioId', 'actiu', 'creatEl', 'actualitzatEl'].concat(marques);
    if (!nomesCamps(c, camps)) return null;
    if (typeof c.id !== 'string' || !RX_ID.test(c.id)) return null;
    if (typeof c.nom !== 'string' || !c.nom.trim() || c.nom.length > 120) return null;
    if (!Object.prototype.hasOwnProperty.call(reg.tipus, c.tipus) || !Object.prototype.hasOwnProperty.call(reg.regimIrpf, c.regimIrpf) || !Object.prototype.hasOwnProperty.call(reg.regimIva, c.regimIva)) return null;
    if (!opcional(c.notes, text(300)) || !opcional(c.organitzacioId, function (v) { return typeof v === 'string' && RX_ID.test(v); })) return null;
    if (!opcional(c.actiu, esBool) || !opcional(c.creatEl, function (v) { return typeof v === 'string' && RX_DIA.test(v); })) return null;
    if (!opcional(c.actualitzatEl, function (v) { return typeof v === 'string' && RX_MOMENT.test(v); })) return null;
    for (var i = 0; i < marques.length; i++) if (!opcional(c[marques[i]], esBool)) return null;
    return copiaCamps(c, camps);
  }
  function netObligacio(o, ids) {
    var camps = ['id', 'clientId', 'model', 'actiu', 'desDe'];
    if (!esObj(o) || !nomesCamps(o, camps) || typeof o.id !== 'string' || !RX_ID.test(o.id) || !ids[o.clientId] || !esModel(o.model)) return null;
    if (!opcional(o.actiu, esBool) || !opcional(o.desDe, esPeriode)) return null;
    return copiaCamps(o, camps);
  }
  function netPresentacio(p, ids) {
    var camps = ['clientId', 'model', 'periode', 'estat', 'presentadaEl', 'referencia', 'notes'];
    if (!esObj(p) || !nomesCamps(p, camps) || !ids[p.clientId] || !esModel(p.model) || !esPeriode(p.periode)) return null;
    if (p.estat !== 'PRESENTADA' && p.estat !== 'NO_PROCEDEIX') return null;
    if (!opcional(p.presentadaEl, function (v) { return typeof v === 'string' && RX_DIA.test(v); }) || !opcional(p.referencia, text(60)) || !opcional(p.notes, text(300))) return null;
    return copiaCamps(p, camps);
  }
  function netDocument(d, ids) {
    var camps = ['clientId', 'model', 'periode', 'clau', 'estat', 'data', 'referencia'];
    if (!esObj(d) || !nomesCamps(d, camps) || !ids[d.clientId] || !esModel(d.model) || !esPeriode(d.periode)) return null;
    var claus = (gm.model(d.model).documents || []).map(function (x) { return x.clau; });
    if (claus.indexOf(d.clau) < 0 || (d.estat !== 'REBUDA' && d.estat !== 'PRESENTADA')) return null;
    if (!opcional(d.data, function (v) { return typeof v === 'string' && RX_DIA.test(v); }) || !opcional(d.referencia, text(120))) return null;
    return copiaCamps(d, camps);
  }
  function netResum(r) {
    var camps = ['organitzacioId', 'periode', 'factures', 'base', 'quota', 'total', 'baseExempta', 'baseSubjecta', 'prova', 'cadenaIntegra', 'primeraData', 'darreraData', 'actualitzatEl'];
    if (!esObj(r) || !nomesCamps(r, camps) || typeof r.organitzacioId !== 'string' || !RX_ID.test(r.organitzacioId) || !esPeriode(r.periode)) return null;
    if (!esEnter(r.factures) || !esNombre(r.base) || !esNombre(r.quota) || !esNombre(r.total) || !opcional(r.baseExempta, esNombre) || !opcional(r.baseSubjecta, esNombre)) return null;
    if (!esBool(r.prova) || !esBool(r.cadenaIntegra)) return null;
    var dia = function (v) { return typeof v === 'string' && RX_DIA.test(v); };
    if (!opcional(r.primeraData, dia) || !opcional(r.darreraData, dia) || !opcional(r.actualitzatEl, function (v) { return typeof v === 'string' && RX_MOMENT.test(v); })) return null;
    return copiaCamps(r, camps);
  }
  function netEnviament(e) {
    var camps = ['organitzacioId', 'periode', 'factures', 'enviatEl'];
    if (!esObj(e) || !nomesCamps(e, camps) || typeof e.organitzacioId !== 'string' || !RX_ID.test(e.organitzacioId) || !esPeriode(e.periode)) return null;
    if (!opcional(e.factures, esEnter) || typeof e.enviatEl !== 'string' || !RX_MOMENT.test(e.enviatEl)) return null;
    return copiaCamps(e, camps);
  }

  var api = { configura: configura, carrega: carrega, despatx: despatx, despatxA: despatxA, importaPanell: importaPanell, clientDesa: clientDesa, clientEsborra: clientEsborra, client: client,
    obligacionsDe: obligacionsDe, obligacionsDesa: obligacionsDesa, obligacioDesDe: obligacioDesDe, presentacioDesa: presentacioDesa, presentacioDe: presentacioDe,
    documentDesa: documentDesa, documentsDe: documentsDe, avuiISO: avuiISO, sembra: sembra, CLAU: CLAU,
    copia: copia, llegeixCopia: llegeixCopia, restaura: restaura };   // ENG-39
  return api;
});
