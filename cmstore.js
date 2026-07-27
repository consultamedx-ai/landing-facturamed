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

  var LIMIT = 5 * 1024 * 1024; // ~5 MB (aprox. límit típic per origen)
  G.cmStore = {
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
