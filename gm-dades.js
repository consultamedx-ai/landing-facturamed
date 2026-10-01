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

  var api = { configura: configura, carrega: carrega, despatx: despatx, despatxA: despatxA, importaPanell: importaPanell, clientDesa: clientDesa, clientEsborra: clientEsborra, client: client,
    obligacionsDe: obligacionsDe, obligacionsDesa: obligacionsDesa, obligacioDesDe: obligacioDesDe, presentacioDesa: presentacioDesa, presentacioDe: presentacioDe,
    documentDesa: documentDesa, documentsDe: documentsDe, avuiISO: avuiISO, sembra: sembra, CLAU: CLAU };
  return api;
});
