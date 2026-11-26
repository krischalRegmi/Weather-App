const CACHE_NAME = "weather-app-v3";
const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./icons/weather.svg",
    "./icons/hamburger.svg",
    "./icons/dark-mode.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key.startsWith("weather-app-") && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const requestUrl = new URL(event.request.url);
    if(event.request.method !== "GET" || requestUrl.origin !== self.location.origin){
        return;
    }

    if(event.request.mode === "navigate"){
        event.respondWith(
            fetch(event.request)
                .catch(async () => {
                    const cachedPage = await caches.match(new URL("./index.html", self.registration.scope));
                    if(!cachedPage){
                        throw new Error("The offline app page is not cached.");
                    }
                    return cachedPage;
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => cachedResponse || fetch(event.request))
    );
});
