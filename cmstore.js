/*! cmstore.js — Compressió transparent de dades per a ConsultaMed
 *  Comprimeix automàticament en guardar i descomprimeix en llegir. Instantani i sense
 *  canviar cap línia de la lògica dels productes. 100% reversible: cmStore.decompressAll()
 *  torna totes les dades a text pla.
 *  Motor: LZString (compressToUTF16 / decompressFromUTF16) — MIT License, © 2013 pieroxy.
 */
(function () {
  "use strict";
  var G = (typeof window !== "undefined") ? window
        : (typeof self !== "undefined") ? self
        : (typeof globalThis !== "undefined") ? globalThis : this;

  /* ---------------- LZString (subconjunt UTF-16) ---------------- */
  var LZString = (function () {
    var f = String.fromCharCode;
    function _compress(uncompressed, bitsPerChar, getCharFromInt) {
      if (uncompressed == null) return "";
      var i, value,
        context_dictionary = {}, context_dictionaryToCreate = {},
        context_c = "", context_wc = "", context_w = "",
        context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2,
        context_data = [], context_data_val = 0, context_data_position = 0, ii;
      for (ii = 0; ii < uncompressed.length; ii += 1) {
        context_c = uncompressed.charAt(ii);
        if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
          context_dictionary[context_c] = context_dictSize++;
          context_dictionaryToCreate[context_c] = true;
        }
        context_wc = context_w + context_c;
        if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
          context_w = context_wc;
        } else {
          if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
            if (context_w.charCodeAt(0) < 256) {
              for (i = 0; i < context_numBits; i++) {
                context_data_val = (context_data_val << 1);
                if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
                else { context_data_position++; }
              }
              value = context_w.charCodeAt(0);
              for (i = 0; i < 8; i++) {
                context_data_val = (context_data_val << 1) | (value & 1);
                if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
                else { context_data_position++; }
                value = value >> 1;
              }
            } else {
              value = 1;
              for (i = 0; i < context_numBits; i++) {
                context_data_val = (context_data_val << 1) | value;
                if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
                else { context_data_position++; }
                value = 0;
              }
              value = context_w.charCodeAt(0);
              for (i = 0; i < 16; i++) {
                context_data_val = (context_data_val << 1) | (value & 1);
                if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
                else { context_data_position++; }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
            delete context_dictionaryToCreate[context_w];
          } else {
            value = context_dictionary[context_w];
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
              else { context_data_position++; }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
          context_dictionary[context_wc] = context_dictSize++;
          context_w = String(context_c);
        }
      }
      if (context_w !== "") {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
              else { context_data_position++; }
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 8; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
              else { context_data_position++; }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
              else { context_data_position++; }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 16; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
              else { context_data_position++; }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
            else { context_data_position++; }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
      }
      value = 2;
      for (i = 0; i < context_numBits; i++) {
        context_data_val = (context_data_val << 1) | (value & 1);
        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
        else { context_data_position++; }
        value = value >> 1;
      }
      while (true) {
        context_data_val = (context_data_val << 1);
        if (context_data_position == bitsPerChar - 1) { context_data.push(getCharFromInt(context_data_val)); break; }
        else context_data_position++;
      }
      return context_data.join('');
    }
    function _decompress(length, resetValue, getNextValue) {
      var dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3,
        entry = "", result = [], i, w, bits, resb, maxpower, power, c,
        data = { val: getNextValue(0), position: resetValue, index: 1 };
      for (i = 0; i < 3; i += 1) dictionary[i] = i;
      bits = 0; maxpower = Math.pow(2, 2); power = 1;
      while (power != maxpower) {
        resb = data.val & data.position; data.position >>= 1;
        if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
        bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
      }
      switch (next = bits) {
        case 0:
          bits = 0; maxpower = Math.pow(2, 8); power = 1;
          while (power != maxpower) {
            resb = data.val & data.position; data.position >>= 1;
            if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
            bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
          }
          c = f(bits); break;
        case 1:
          bits = 0; maxpower = Math.pow(2, 16); power = 1;
          while (power != maxpower) {
            resb = data.val & data.position; data.position >>= 1;
            if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
            bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
          }
          c = f(bits); break;
        case 2:
          return "";
      }
      dictionary[3] = c; w = c; result.push(c);
      while (true) {
        if (data.index > length) return "";
        bits = 0; maxpower = Math.pow(2, numBits); power = 1;
        while (power != maxpower) {
          resb = data.val & data.position; data.position >>= 1;
          if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
          bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
        }
        switch (c = bits) {
          case 0:
            bits = 0; maxpower = Math.pow(2, 8); power = 1;
            while (power != maxpower) {
              resb = data.val & data.position; data.position >>= 1;
              if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
              bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
            }
            dictionary[dictSize++] = f(bits); c = dictSize - 1; enlargeIn--; break;
          case 1:
            bits = 0; maxpower = Math.pow(2, 16); power = 1;
            while (power != maxpower) {
              resb = data.val & data.position; data.position >>= 1;
              if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
              bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
            }
            dictionary[dictSize++] = f(bits); c = dictSize - 1; enlargeIn--; break;
          case 2:
            return result.join('');
        }
        if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
        if (dictionary[c]) { entry = dictionary[c]; }
        else { if (c === dictSize) { entry = w + w.charAt(0); } else { return null; } }
        result.push(entry);
        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--; w = entry;
        if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      }
    }
    return {
      compressToUTF16: function (input) {
        if (input == null) return "";
        return _compress(input, 15, function (a) { return f(a + 32); }) + " ";
      },
      decompressFromUTF16: function (compressed) {
        if (compressed == null) return "";
        if (compressed == "") return null;
        return _decompress(compressed.length, 16384, function (index) { return compressed.charCodeAt(index) - 32; });
      }
    };
  })();

  /* ---------------- capa transparent sobre localStorage ---------------- */
  if (typeof Storage === "undefined" || !G.localStorage) return;
  var proto = Storage.prototype;
  if (proto.getItem && proto.getItem.__cm) return; // ja instal·lada en aquesta pàgina

  var _get = proto.getItem;
  var _set = proto.setItem;
  var MARK = "";  // marca de valor comprimit (LZString UTF16 mai comença per )
  var MIN = 60;         // no comprimeixis valors curts (no compensa)

  function wrappedSet(k, v) {
    v = (v == null) ? "" : String(v);
    try {
      if (v.length >= MIN && v.charCodeAt(0) !== 1) {
        var c = LZString.compressToUTF16(v);
        if (c && (c.length + 1) < v.length) { _set.call(this, k, MARK + c); return; }
      }
    } catch (e) { /* si falla, guardem pla */ }
    _set.call(this, k, v);
  }
  function wrappedGet(k) {
    var raw = _get.call(this, k);
    if (raw && raw.charCodeAt(0) === 1) {
      try { var d = LZString.decompressFromUTF16(raw.slice(1)); return (d == null) ? raw : d; }
      catch (e) { return raw; }
    }
    return raw;
  }
  wrappedGet.__cm = true;
  wrappedSet.__cm = true;
  try { proto.getItem = wrappedGet; proto.setItem = wrappedSet; } catch (e) { return; }

  function bytes(s) { return s ? s.length * 2 : 0; } // footprint UTF-16


  /* ═════════════════════════════════════════════════════════════════════════
     ENG-16 ① · LA BARRA DE MODE DE PROVA, EN UN SOL LLOC
     Enginyeria · 27/08/2026

     Viu aqui i no dins de cada producte perque han de dir exactament el mateix
     i canviar alhora. Quatre copies del mateix text acaben sent quatre textos
     diferents: es el mateix motiu pel qual el joc de dades es canonic.

         cmStore.barraProva({ tornar:'app'|'escriba'|'secre'|'hub',
                              factures:true,        // nomes FacturaMed
                              nomesPreview:true })  // nomes SecreMed, de moment

     ── EL TEXT ─────────────────────────────────────────────────────────────
     Es el canonic de `Producte/12` §4, i NOMES el canonic. A FacturaMed hi va
     sencer. Als altres tres se n'omet la clausula del mig —«les factures no
     tenen validesa fiscal»— perque alla no hi ha factures i seria falsa. NO
     me n'invento una de nova per omplir el forat: cada paraula que hi ha es
     d'una frase aprovada. (Pregunta oberta a Producte, P-ENG-33.)

     ── PER QUE SECREMED VA DARRERE DE `cm_preview` ─────────────────────────
     Perque SecreMed encara no es visible al hub: ho sera el dia que es
     publiqui A1. Fins llavors la barra hi es i es pot veure amb `?preview=1`,
     pero no surt a ningu de fora. Aixi viatja al mateix push que l'agenda i no
     s'ha de tornar a tocar el fitxer aquell dia.
     ═════════════════════════════════════════════════════════════════════════ */
  var BARRA_TXT = {
    es: { prova:'Modo de prueba', fisc:'las facturas no tienen validez fiscal', cta:'Activar mi cuenta' },
    ca: { prova:'Mode de prova',  fisc:'les factures no tenen validesa fiscal', cta:'Activar el meu compte' },
    de: { prova:'Testmodus',      fisc:'die Rechnungen haben keine steuerliche Gültigkeit', cta:'Konto aktivieren' },
    en: { prova:'Test mode',      fisc:'these invoices have no fiscal validity', cta:'Activate my account' }
  };
  var DESTINS_BARRA = { app:'app', escriba:'escriba', secre:'secre' };

  function estatCompteBarra() {
    /* Mateixa regla que a FacturaMed: qualsevol cosa que no sigui exactament
       ACTIU o IMPAGAMENT cau a PROVA. El dubte sempre cau del cantó segur —
       ensenyar la barra de mes es un soroll; amagar-la a qui esta en prova es
       deixar-lo creure que factura de veritat. */
    try {
      var v = G.localStorage.getItem('cm_estat_compte');
      return (v === 'ACTIU' || v === 'IMPAGAMENT') ? v : 'PROVA';
    } catch (e) { return 'PROVA'; }
  }
  function idiomaBarra() {
    try { var l = G.localStorage.getItem('em_idioma_ui'); return BARRA_TXT[l] ? l : 'ca'; }
    catch (e) { return 'ca'; }
  }

  function barraProva(op) {
    op = op || {};
    var doc = G.document; if (!doc || !doc.body) return null;
    var vella = doc.getElementById('barra-prova');

    if (op.nomesPreview) {
      var pv = false;
      try { pv = G.localStorage.getItem('cm_preview') === '1'; } catch (e) {}
      if (!pv) { if (vella) vella.style.display = 'none'; return null; }
    }
    if (estatCompteBarra() !== 'PROVA') { if (vella) vella.style.display = 'none'; return null; }

    var t = BARRA_TXT[idiomaBarra()];
    var b = vella;
    if (!b) {
      b = doc.createElement('div');
      b.id = 'barra-prova';
      b.style.cssText = 'position:sticky;bottom:0;z-index:60;background:#0D3B66;color:#fff;' +
        'padding:9px 16px;font-size:.82rem;display:flex;align-items:center;justify-content:center;' +
        'gap:14px;flex-wrap:wrap;font-family:inherit';
      doc.body.appendChild(b);
    }
    b.style.display = 'flex';
    var txt = t.prova + (op.factures ? ' · ' + t.fisc : '');
    var tornar = DESTINS_BARRA[op.tornar] ? ('&tornar=' + DESTINS_BARRA[op.tornar]) : '';
    /* El text es posa amb textContent i l'enllac es construeix a part: aixi cap
       traduccio pot injectar marques a la pagina. */
    b.textContent = '';
    var sp = doc.createElement('span'); sp.id = 'barra-prova-txt'; sp.textContent = txt;
    var a = doc.createElement('a'); a.id = 'barra-prova-cta';
    a.href = 'hub.html?activar=1' + tornar;
    a.style.cssText = 'color:#fff;font-weight:700;text-decoration:underline';
    a.textContent = t.cta;
    b.appendChild(sp); b.appendChild(a);
    return b;
  }

  /* ═════════════════════════════════════════════════════════════════════════
     ENG-22 (nota) · CAP CRIDA A L'API SENSE SESSIO
     Enginyeria · 03/09/2026

     Un visitant que prova els productes sense compte carregava hub/app/secre i
     cada pagina preguntava al servidor (`jo`; el hub a mes `gestoria.meves`, i
     amb ?activar=1 `pagament.estat` i els comptadors de les portes): tot 401,
     i la consola plena a cada carrega. No es un defecte funcional; es soroll
     que amaga els errors de veritat.

     La sessio viu en una cookie httpOnly d'app.consultamed.es: des d'aqui no es
     pot llegir, i l'unic que sap si n'hi ha es el servidor. Per tant l'accio
     `jo` es queda com a UNICA sonda per pagina i tota la resta s'encadena al
     seu resultat (ho fan cmsync.js i hub.html). Aqui nomes es recorda que va
     dir el servidor l'ultima vegada (`cm_sessio`: '1' si hi havia sessio, '0'
     si va respondre 401) per estalviar-se la sonda quan NO POT haver canviat:

       - una recarrega o un enrere/endavant no creen cap sessio;
       - un enllac des d'una pagina nostra (referrer del mateix origen) tampoc:
         la sessio nomes es crea a app.consultamed.es, que redirigeix al hub
         SENSE referrer (Referrer-Policy: no-referrer al servidor).

     Qualsevol altra arribada —URL escrita a ma, retorn del login, enllac des
     d'una pagina nostra amb <meta name="referrer" content="no-referrer">
     (index, es, app, escriba, secremed)— torna a preguntar, perque pot ser el
     metge que acaba d'entrar. El dubte cau SEMPRE del canto de preguntar: el
     cost d'una sonda de mes es un 401 a la consola; el d'una de menys seria un
     metge amb sessio que no sincronitza.
     ═════════════════════════════════════════════════════════════════════════ */
  var K_SESSIO = 'cm_sessio';
  function anotaSessio(hiHa) {
    try { G.localStorage.setItem(K_SESSIO, hiHa ? '1' : '0'); } catch (e) {}
  }
  function potHaverSessio() {
    var v = null;
    try { v = G.localStorage.getItem(K_SESSIO); } catch (e) {}
    if (v !== '0') return true;               // mai preguntat, o l'ultima vegada hi era
    var tipus = 'navigate';
    try {
      var n = G.performance && G.performance.getEntriesByType && G.performance.getEntriesByType('navigation')[0];
      if (n && n.type) tipus = n.type;
    } catch (e) {}
    if (tipus !== 'navigate') return false;    // recarrega, enrere/endavant
    var ref = '';
    try { ref = G.document.referrer || ''; } catch (e) {}
    return !(ref && G.location && ref.indexOf(G.location.origin + '/') === 0);
  }

  var LIMIT = 5 * 1024 * 1024; // ~5 MB (aprox. límit típic per origen)
  G.cmStore = {
    barraProva: barraProva,
    potHaverSessio: potHaverSessio,
    anotaSessio: anotaSessio,
    stats: function () {
      var ls = G.localStorage, stored = 0, raw = 0, keys = 0, i, k, sraw, splain;
      for (i = 0; i < ls.length; i++) {
        k = ls.key(i); if (k == null) continue;
        sraw = _get.call(ls, k); splain = wrappedGet.call(ls, k);
        stored += bytes(k) + bytes(sraw); raw += bytes(k) + bytes(splain); keys++;
      }
      return {
        keys: keys, storedBytes: stored, rawBytes: raw,
        ratio: stored ? (raw / stored) : 1, pct: stored / LIMIT * 100,
        storedKB: Math.round(stored / 1024 * 10) / 10,
        rawKB: Math.round(raw / 1024 * 10) / 10,
        savedKB: Math.round((raw - stored) / 1024 * 10) / 10
      };
    },
    // Comprimeix ara tot el que encara sigui text pla (idempotent)
    compressAll: function () {
      var ls = G.localStorage, i, arr = [], rawv;
      for (i = 0; i < ls.length; i++) arr.push(ls.key(i));
      arr.forEach(function (k) {
        if (k == null) return;
        rawv = _get.call(ls, k);
        if (rawv == null || rawv.charCodeAt(0) === 1 || rawv.length < MIN) return;
        try { wrappedSet.call(ls, k, rawv); } catch (e) {}
      });
      return G.cmStore.stats();
    },
    // Torna-ho tot a text pla (per revertir del tot la compressió)
    decompressAll: function () {
      var ls = G.localStorage, i, arr = [], v;
      for (i = 0; i < ls.length; i++) arr.push(ls.key(i));
      arr.forEach(function (k) {
        if (k == null) return;
        v = wrappedGet.call(ls, k);
        if (v != null) { try { _set.call(ls, k, v); } catch (e) {} }
      });
      return true;
    },
    // Pinta una línia d'estat en un element (opcional)
    meter: function (elId, lang) {
      try {
        var s = G.cmStore.stats(), t = document.getElementById(elId);
        if (!t) return;
        var L = {
          ca: { u: " KB en ús", c: "comprimit", lim: "% del límit", s: "estalviats" },
          es: { u: " KB en uso", c: "comprimido", lim: "% del límite", s: "ahorrados" },
          en: { u: " KB used", c: "compressed", lim: "% of the limit", s: "saved" }
        }[lang || "ca"] || null;
        if (!L) L = { u: " KB en ús", c: "comprimit", lim: "% del límit", s: "estalviats" };
        var parts = ["💾 " + s.storedKB + L.u];
        if (s.ratio > 1.05) parts.push(L.c + " " + (Math.round(s.ratio * 10) / 10) + "×");
        if (s.savedKB > 0.5) parts.push(s.savedKB + " KB " + L.s);
        parts.push((Math.round(s.pct * 10) / 10) + L.lim);
        t.textContent = parts.join(" · ");
      } catch (e) {}
    }
  };

  // Migració automàtica en carregar: comprimeix el que ja hi hagi (una passada, ràpida)
  try { G.cmStore.compressAll(); } catch (e) {}
})();
