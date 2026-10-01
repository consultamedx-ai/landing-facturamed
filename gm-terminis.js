/* ConsultaMed · GestorMed Despatx — gm-terminis.js (A-020, F1)
   El motor de terminis. Funcions PURES sobre el catàleg de dades
   (terminis-aeat.json): cap crida de xarxa, cap rellotge propi — la data
   «avui» sempre arriba com a paràmetre, perquè les proves la fixin.

   REGLA D'OR: un termini equivocat és el pitjor defecte d'aquest producte.
   Per això aquí no s'inventa cap data: (1) si el catàleg porta la data
   verificada de l'AEAT per a aquell model i període, es torna tal qual;
   (2) si no, es calcula amb la regla general i es marca PROVISIONAL, i mai
   se li posa domiciliació ni font.

   Es carrega com a <script> clàssic (window.gmTerminis) o amb require() a
   les proves de Node. Tot el càlcul de dates va en UTC sobre cadenes ISO
   (YYYY-MM-DD): cap artefacte de zona horària (lliçó dels arnessos de la casa). */
(function (arrel, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else arrel.gmTerminis = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var C = null;                 // el catàleg carregat
  var DIA = 86400000;

  // ---------- dates (ISO ↔ UTC) ----------
  function aUtc(iso) { var p = String(iso).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function aIso(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + dos(d.getUTCMonth() + 1) + '-' + dos(d.getUTCDate()); }
  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function iso(any, mes, dia) { return any + '-' + dos(mes) + '-' + dos(dia); }
  function ultimDia(any, mes) { return new Date(Date.UTC(any, mes, 0)).getUTCDate(); } // mes 1-12
  function dies(desDe, finsA) { return Math.round((aUtc(finsA) - aUtc(desDe)) / DIA); }
  function suma(isoData, n) { return aIso(aUtc(isoData) + n * DIA); }
  function diaSetmana(isoData) { return new Date(aUtc(isoData)).getUTCDay(); } // 0 diumenge … 6 dissabte
  function esFestiu(isoData) {
    var any = isoData.slice(0, 4);
    var f = C && C.festius_nacionals && C.festius_nacionals[any];
    return !!(f && f.indexOf(isoData) >= 0);
  }
  // Criteri AEAT (i art. 30 Llei 39/2015): dissabtes, diumenges i festius no compten.
  function primerDiaHabil(isoData) {
    var d = isoData, guard = 0;
    while ((diaSetmana(d) === 0 || diaSetmana(d) === 6 || esFestiu(d)) && guard++ < 14) d = suma(d, 1);
    return d;
  }

  // ---------- catàleg ----------
  function carrega(cataleg) { C = cataleg; return api; }
  function cal() { if (!C) throw new Error('gmTerminis: cap catàleg carregat (crida carrega() abans)'); return C; }
  function model(codi) { return cal().models[codi] || null; }
  function models() { return Object.keys(cal().models); }

  // ---------- períodes ----------
  // 'YYYYTn' trimestral · 'YYYY' anual (exercici) · 'YYYYPn' pagaments fraccionats IS
  function parsePeriode(p) {
    var m;
    if ((m = /^(\d{4})T([1-4])$/.exec(p))) return { tipus: 'T', any: +m[1], n: +m[2] };
    if ((m = /^(\d{4})P([1-3])$/.exec(p))) return { tipus: 'P', any: +m[1], n: +m[2] };
    if ((m = /^(\d{4})$/.exec(p))) return { tipus: 'A', any: +m[1] };
    return null;
  }
  function etiquetaPeriode(p, lang) {
    var q = parsePeriode(p); if (!q) return p;
    if (q.tipus === 'T') return q.n + 'T ' + q.any;
    if (q.tipus === 'P') return (lang === 'ca' ? q.n + 'r pagament ' : q.n + 'º pago ') + q.any;
    return (lang === 'ca' ? 'Exercici ' : 'Ejercicio ') + q.any;
  }

  // La data efectiva d'un model i període. Verificada si és al catàleg;
  // calculada i PROVISIONAL si no.
  function dataEfectiva(codi, periode) {
    var c = cal(), clau = codi + '|' + periode, v = c.dates_verificades[clau];
    if (v) {
      return { inici: v.inici, fi: v.fi, domiciliacio: v.domiciliacio || null, verificat: true, provisional: false, font: v.font };
    }
    var m = model(codi), q = parsePeriode(periode);
    if (!m || !q) return null;
    var r = m.regla, inici = null, fi = null;
    if (q.tipus === 'T' && r.T) {
      var mesFi = q.n * 3 + 1, anyFi = q.any;          // el mes següent al trimestre
      if (mesFi > 12) { mesFi = 1; anyFi = q.any + 1; }
      var diaFi = (q.n === 4 && r.T4 && r.T4.fi) ? r.T4.fi : r.T.fi;
      inici = iso(anyFi, mesFi, r.T.inici || 1);
      fi = iso(anyFi, mesFi, diaFi);
    } else if (q.tipus === 'A' && r.A) {
      var anyP = q.any + 1;                             // l'exercici es declara l'any següent
      if (r.A.inici) inici = iso(anyP, r.A.inici.mes, r.A.inici.dia);
      var dFi = r.A.fi.dia === 'ultim' ? ultimDia(anyP, r.A.fi.mes) : r.A.fi.dia;
      fi = iso(anyP, r.A.fi.mes, dFi);
    } else if (q.tipus === 'P' && r.P) {
      var rp = r.P['P' + q.n]; if (!rp) return null;
      inici = iso(q.any, rp.mes, r.P.inici || 1);
      fi = iso(q.any, rp.mes, r.P.fi || 20);
    } else return null;
    return { inici: inici, fi: primerDiaHabil(fi), domiciliacio: null, verificat: false, provisional: true, font: null };
  }

  // El període «actual» d'un model en una data: el primer que encara no ha
  // vençut. És el «des de» per defecte d'una obligació nova: un client que
  // entra a la cartera a l'octubre no ha de sortir amb tres trimestres vells
  // en vermell.
  function periodeActual(codi, avui) {
    var ps = periodesDe(codi, avui, { enrere: 0, endavant: 400 });
    return ps.length ? ps[0] : null;
  }

  // Els períodes d'un model que «viuen» al voltant d'una data: els que vencen
  // entre avui−enrere i avui+endavant, ordenats per venciment.
  function periodesDe(codi, avui, opts) {
    opts = opts || {};
    var enrere = opts.enrere == null ? 400 : opts.enrere, endavant = opts.endavant == null ? 60 : opts.endavant;
    var m = model(codi); if (!m) return [];
    var any = +avui.slice(0, 4), cands = [], y;
    for (y = any - 2; y <= any + 1; y++) {
      if (m.periodicitat === 'T') { cands.push(y + 'T1', y + 'T2', y + 'T3', y + 'T4'); }
      else if (m.periodicitat === 'P') { cands.push(y + 'P1', y + 'P2', y + 'P3'); }
      else cands.push(String(y));
    }
    var out = [];
    for (var i = 0; i < cands.length; i++) {
      var d = dataEfectiva(codi, cands[i]); if (!d) continue;
      var n = dies(avui, d.fi);
      if (n >= -enrere && n <= endavant) out.push({ p: cands[i], fi: d.fi });
    }
    out.sort(function (a, b) { return a.fi < b.fi ? -1 : a.fi > b.fi ? 1 : 0; });
    return out.map(function (x) { return x.p; });
  }

  // ---------- obligacions suggerides pel règim ----------
  function aplica(m, client) {
    var a = m.aplica || {};
    if (a.tipus && a.tipus.indexOf(client.tipus) < 0) return false;
    if (a.regimIrpf && a.regimIrpf.indexOf(client.regimIrpf) < 0) return false;
    if (a.regimIva && a.regimIva.indexOf(client.regimIva) < 0) return false;
    if (a.marques) for (var i = 0; i < a.marques.length; i++) if (!client[a.marques[i]]) return false;
    return true;
  }
  function obligacionsSuggerides(client) {
    return models().filter(function (codi) { var m = model(codi); return !m.foraV1 && aplica(m, client); });
  }

  // ---------- documents ----------
  // La llista completa del checklist d'un model amb l'estat de cadascun
  // (FALTA si ningú l'ha tocat). Per a un client ConsultaMed, el document
  // «automàtic» (facturació emesa) surt de la constància d'enviament.
  function documentsDe(codi, estats, opts) {
    var m = model(codi); if (!m) return [];
    opts = opts || {};
    var per = {};
    (estats || []).forEach(function (e) { per[e.clau] = e; });
    return m.documents.map(function (d) {
      var e = per[d.clau] || {};
      var auto = opts.consultamed && m.consultamed && m.consultamed.documentAuto === d.clau ? opts.consultamed : null;
      var estat = e.estat || 'FALTA';
      // Un resum de PROVA (factures sense validesa fiscal) no és documentació rebuda.
      if (auto && !auto.prova && (auto.estat === 'rebut' || auto.estat === 'canviat') && estat === 'FALTA') estat = 'REBUDA';
      return { clau: d.clau, nom: d.nom, estat: estat, data: e.data || (auto && auto.data) || null,
        referencia: e.referencia || null, auto: !!auto, autoEstat: auto ? auto.estat : null };
    });
  }

  // ---------- el quadre ConsultaMed: resum (viu) vs enviament (instantània) ----------
  function quadreConsultaMed(resum, enviament) {
    if (!resum || resum.factures == null) return { estat: 'sense-dades' };
    var integra = resum.cadenaIntegra === true;   // com al servidor (L1): si no consta, no és íntegra
    var prova = resum.prova === true;             // factures sense validesa fiscal (compte en mode de prova)
    if (!enviament) return { estat: resum.factures > 0 ? 'no-enviat' : 'sense-factures', factures: resum.factures, integra: integra, prova: prova };
    var canviat = resum.factures !== enviament.factures || (resum.actualitzatEl && enviament.enviatEl && resum.actualitzatEl > enviament.enviatEl);
    return { estat: canviat ? 'canviat' : 'rebut', factures: resum.factures, enviades: enviament.factures,
      data: (enviament.enviatEl || '').slice(0, 10), integra: integra, prova: prova };
  }

  // ---------- el semàfor ----------
  // verd presentat · gris no procedeix / encara no oberta · vermell venç (≤ llindar) o vençuda i no està
  // · groc falta documentació · llest tot rebut i encara amb marge
  function semafor(item, avui, opts) {
    opts = opts || {};
    var llindar = opts.llindar != null ? opts.llindar : (cal().llindar_urgent_dies || 5);
    var pres = item.presentacio || null;
    if (pres && pres.estat === 'PRESENTADA') {
      return { color: 'verd', dies: dies(avui, item.fi), motiu: { es: 'Presentado' + (pres.presentadaEl ? ' el ' + curta(pres.presentadaEl) : ''), ca: 'Presentat' + (pres.presentadaEl ? ' el ' + curta(pres.presentadaEl) : '') } };
    }
    if (pres && pres.estat === 'NO_PROCEDEIX') {
      return { color: 'gris', dies: dies(avui, item.fi), motiu: { es: 'No procede este período', ca: 'No procedeix aquest període' } };
    }
    var limit = (item.domicilia && item.domiciliacio) ? item.domiciliacio : item.fi;
    var n = dies(avui, limit);
    if (item.inici && avui < item.inici) {
      return { color: 'gris', dies: n, motiu: { es: 'El plazo se abre el ' + curta(item.inici), ca: 'El termini s\'obre el ' + curta(item.inici) } };
    }
    // Qui domicilia i ha deixat passar la domiciliació encara pot presentar
    // (pagant per un altre mitjà) fins al termini general: vermell, però dit clar.
    if (item.domicilia && item.domiciliacio && avui > item.domiciliacio && avui <= item.fi) {
      var nf = dies(avui, item.fi);
      return { color: 'vermell', dies: nf, motiu: { es: 'Domiciliación vencida el ' + curta(item.domiciliacio) + ' · presentación hasta el ' + curta(item.fi) + ' (' + nf + (nf === 1 ? ' día)' : ' días)'), ca: 'Domiciliació vençuda el ' + curta(item.domiciliacio) + ' · presentació fins al ' + curta(item.fi) + ' (' + nf + (nf === 1 ? ' dia)' : ' dies)') } };
    }
    if (n < 0) {
      var f = -n;
      return { color: 'vermell', dies: n, motiu: { es: 'Venció el ' + curta(limit) + ' · hace ' + f + (f === 1 ? ' día' : ' días') + ' y no está presentado', ca: 'Va vèncer el ' + curta(limit) + ' · fa ' + f + (f === 1 ? ' dia' : ' dies') + ' i no està presentat' } };
    }
    var falten = (item.documents || []).filter(function (d) { return d.estat === 'FALTA'; }).length;
    if (n <= llindar) {
      var quan = n === 0 ? { es: 'hoy', ca: 'avui' } : { es: 'en ' + n + (n === 1 ? ' día' : ' días'), ca: 'd\'aquí a ' + n + (n === 1 ? ' dia' : ' dies') };
      return { color: 'vermell', dies: n, motiu: { es: 'Vence ' + quan.es + (item.domicilia && item.domiciliacio ? ' (domiciliación)' : '') + (falten ? ' · falta documentación' : ''), ca: 'Venç ' + quan.ca + (item.domicilia && item.domiciliacio ? ' (domiciliació)' : '') + (falten ? ' · falta documentació' : '') } };
    }
    if (falten) {
      return { color: 'groc', dies: n, motiu: { es: 'Falta documentación (' + falten + ')', ca: 'Falta documentació (' + falten + ')' } };
    }
    return { color: 'llest', dies: n, motiu: { es: 'Listo para presentar', ca: 'Llest per presentar' } };
  }
  function curta(isoData) { var p = String(isoData).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : isoData; }

  // ---------- el tauler ----------
  // despatx = { clients:[…], obligacions:[…], presentacions:[…], documents:[…], resums:[…], enviaments:[…] }
  // Torna una fila per client × obligació × període viu, amb semàfor, dins de
  // l'horitzó (dies) — i sempre les vençudes no presentades.
  function tauler(despatx, avui, opts) {
    opts = opts || {};
    var horitzo = opts.dies == null ? 14 : opts.dies;
    var filtre = opts.filtre || {};
    var perClient = {}; (despatx.clients || []).forEach(function (c) { perClient[c.id] = c; });
    var pres = {}; (despatx.presentacions || []).forEach(function (p) { pres[p.clientId + '|' + p.model + '|' + p.periode] = p; });
    var docs = {}; (despatx.documents || []).forEach(function (d) { var k = d.clientId + '|' + d.model + '|' + d.periode; (docs[k] = docs[k] || []).push(d); });
    var resums = {}; (despatx.resums || []).forEach(function (r) { resums[r.organitzacioId + '|' + r.periode] = r; });
    var envs = {}; (despatx.enviaments || []).forEach(function (e) { var k = e.organitzacioId + '|' + e.periode; if (!envs[k] || e.enviatEl > envs[k].enviatEl) envs[k] = e; });
    var files = [];
    (despatx.obligacions || []).forEach(function (o) {
      if (o.actiu === false) return;
      var c = perClient[o.clientId]; if (!c || c.actiu === false) return;
      if (filtre.clientId && c.id !== filtre.clientId) return;
      if (filtre.model && o.model !== filtre.model) return;
      var m = model(o.model); if (!m) return;
      periodesDe(o.model, avui, { enrere: opts.enrere, endavant: Math.max(horitzo, 0) + 1 }).forEach(function (p) {
        if (o.desDe && p < o.desDe) return;
        var d = dataEfectiva(o.model, p); if (!d) return;
        var k = c.id + '|' + o.model + '|' + p;
        var cm = null;
        if (c.organitzacioId && m.consultamed) {
          var per = m.periodicitat === 'T' ? p : null;   // la facturació arriba per trimestre
          if (per) cm = quadreConsultaMed(resums[c.organitzacioId + '|' + per], envs[c.organitzacioId + '|' + per]);
        }
        var item = { clientId: c.id, client: c, model: o.model, periode: p, inici: d.inici, fi: d.fi,
          domiciliacio: d.domiciliacio, verificat: d.verificat, provisional: d.provisional, font: d.font,
          domicilia: !!c.domicilia, presentacio: pres[k] || null,
          documents: documentsDe(o.model, docs[k], { consultamed: cm }), consultamed: cm };
        var s = semafor(item, avui, opts);
        item.color = s.color; item.dies = s.dies; item.motiu = s.motiu;
        // ConsultaMed: si el metge ha facturat després d'enviar, o té factures i
        // no ha enviat, és feina per a la gestoria — i el motiu ho ha de dir.
        if (cm && (item.color === 'llest' || item.color === 'groc')) {
          if (cm.estat === 'canviat') {
            item.color = 'groc';
            item.motiu = { es: 'Ha facturado después de enviar el trimestre (' + cm.factures + ' facturas, envió ' + cm.enviades + '): pida el CSV actualizado', ca: 'Ha facturat després d\'enviar el trimestre (' + cm.factures + ' factures, en va enviar ' + cm.enviades + '): demani el CSV actualitzat' };
          } else if (cm.estat === 'no-enviat') {
            item.color = 'groc';
            item.motiu = { es: 'Tiene ' + cm.factures + ' facturas y aún no ha enviado el trimestre', ca: 'Té ' + cm.factures + ' factures i encara no ha enviat el trimestre' };
          }
        }
        var acabat = item.color === 'verd' || (item.presentacio && item.presentacio.estat === 'NO_PROCEDEIX');
        var n = dies(avui, d.fi);
        if (n > horitzo) return;                                 // encara lluny
        if (acabat && n < -horitzo) return;                      // fet i antic: fora del tauler
        if (filtre.estat && item.color !== filtre.estat) return;
        files.push(item);
      });
    });
    files.sort(function (a, b) {
      if (a.fi !== b.fi) return a.fi < b.fi ? -1 : 1;
      var na = (a.client.nom || '').toLowerCase(), nb = (b.client.nom || '').toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : (a.model < b.model ? -1 : 1);
    });
    return files;
  }
  function resum(files) {
    var r = { total: files.length, verd: 0, groc: 0, vermell: 0, llest: 0, gris: 0 };
    files.forEach(function (f) { r[f.color] = (r[f.color] || 0) + 1; });
    return r;
  }

  var api = { carrega: carrega, cataleg: cal, model: model, models: models, dataEfectiva: dataEfectiva, primerDiaHabil: primerDiaHabil,
    periodesDe: periodesDe, periodeActual: periodeActual, parsePeriode: parsePeriode, etiquetaPeriode: etiquetaPeriode, obligacionsSuggerides: obligacionsSuggerides,
    documentsDe: documentsDe, quadreConsultaMed: quadreConsultaMed, semafor: semafor, tauler: tauler, resum: resum,
    dies: dies, suma: suma, curta: curta };
  return api;
});
