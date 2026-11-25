"use strict";
// Service worker : met l'app en cache pour qu'elle marche hors ligne.
// Change VERSION à chaque mise en ligne pour que les téléphones récupèrent la nouvelle version.
const VERSION = "cap-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./base.css",
  "./style.css",
  "./countries.js",
  "./flags.js",
  "./names.js",
  "./i18n.js",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/compass.webp",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/apple-touch-icon.png",
];
const FONT_CACHE = "cap-fonts";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VERSION && key !== FONT_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Polices Google : mises en cache à la première visite, puis servies hors ligne.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(request).then(hit => hit || fetch(request).then(response => {
          if (response.ok || response.type === "opaque") cache.put(request, response.clone());
          return response;
        }))
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Fichiers de l'app : le cache d'abord, le réseau en secours.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(hit => hit || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(VERSION).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => request.mode === "navigate" ? caches.match("./index.html") : undefined))
  );
});
