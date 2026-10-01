/* GestorMed Despatx · service worker de l'app instal·lable (CEO, 1/10/2026).
   Abast: /gestoria (només el panell de la gestoria; la resta del web no el veu).

   Fa UNA cosa: si el panell no es pot obrir perquè no hi ha xarxa, ensenya un avís
   en comptes de la pàgina d'error del navegador. Res més:
   - NO desa res en memòria cau: el panell es carrega sempre de la xarxa, o sigui
     que l'app és sempre la versió publicada (no cal «actualitzar» res);
   - NO toca cap crida a l'API (app.consultamed.es) ni cap altre fitxer: només les
     navegacions, i només si fallen;
   - NO guarda cap dada de la gestoria ni dels seus clients.
   Chrome i Edge necessiten un service worker amb `fetch` per oferir «Instal·lar». */
'use strict';

var SENSE_XARXA = '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>GestorMed Despatx · sin conexión</title>' +
  '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
  'background:#F7FAFC;color:#1F2937;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
  'main{max-width:420px;padding:32px;text-align:center}h1{font-size:1.35rem;color:#0D3B66;margin:0 0 10px}' +
  'p{line-height:1.5;margin:0 0 8px;color:#475569}button{margin-top:16px;border:0;border-radius:99px;' +
  'padding:11px 22px;font-weight:700;font-size:.95rem;font-family:inherit;background:#14B8A6;color:#04201d;cursor:pointer}</style></head>' +
  '<body><main><h1>GestorMed Despatx</h1>' +
  '<p>No hay conexión a internet. El panel la necesita para mostrar los datos de sus clientes.</p>' +
  '<p lang="ca">No hi ha connexió a internet. El panell la necessita per mostrar les dades dels clients.</p>' +
  '<button type="button" onclick="location.reload()">Reintentar · Tornar-ho a provar</button>' +
  '</main></body></html>';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;          // tot el que no és obrir el panell: com si no hi fos
  e.respondWith(fetch(e.request).catch(function () {
    return new Response(SENSE_XARXA, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }));
});
