// SW Version
const version = '1.0';

// Static Cache - App Shell
const appAssets = [
  'index.html',
  'main.js',
  'images/flame.png',
  'images/logo.png',
  'images/sync.png',
  'vendor/bootstrap.min.css',
  'vendor/jquery.min.js'
];

// SW Install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(`static-${version}`)
      .then(cache => cache.addAll(appAssets))
  );
});

// SW Activate
self.addEventListener('activate', e => {
  let cleaned = caches.keys().then(keys => {
    keys.forEach(key => {
      if (key !== `static-${version}` && key.match('static-')) {
        return caches.delete(key);
      }
    });
  });

  e.waitUntil(cleaned);
});

// Static caching strategy
const staticCache = (req, cacheName = `static-${version}`) => {
  return caches.match(req).then(cachedRes => {
    if (cachedRes) return cachedRes;

    return fetch(req).then(networkRes => {
      caches.open(cacheName)
        .then(cache => cache.put(req, networkRes));

      return networkRes.clone();
    });
  });
};

// Network with cache fallback
const fallbackCache = (req) => {
  // Try network
  return fetch(req).then(networkRes => {
    if (!networkRes.ok) throw 'Fetch error';

    caches.open(`static-${version}`)
      .then(cache => cache.put(req, networkRes));

    return networkRes.clone();
  })
  .catch(err => caches.match(req));
};

// Clean old giphys from giphy cache
const cleanGiphyCache = (giphys) => {
  caches.open('giphy').then(cache => {
    cache.keys().then(keys => {
      keys.forEach(key => {
        if (!giphys.includes(key.url)) cache.delete(key);
      });
    });
  });
};

// SW Fetch
self.addEventListener('fetch', e => {

  // App Shell
  if (e.request.url.match(location.origin)) {
    e.respondWith(staticCache(e.request));

  // Giphy API
  } else if (e.request.url.match('api.giphy.com/v1/gifs/trending')) {
    e.respondWith(fallbackCache(e.request));

  // Giphy media
  } else if (e.request.url.match('giphy.com/media')) {
    e.respondWith(staticCache(e.request, 'giphy'));
  }
});

// Listen for message from the client
self.addEventListener('message', e => {
  if (e.data.action === 'cleanGiphyCache') cleanGiphyCache(e.data.giphys);
});
