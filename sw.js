// Victory Life CMS - Service Worker
const CACHE_NAME = 'victory-cms-v3';
const OFFLINE_URL = '/offline.html';

const ASSETS = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/pages/dashboard/index.html',
    '/pages/members/index.html',
    '/pages/members/add.html',
    '/pages/members/profile.html',
    '/pages/attendance/index.html',
    '/pages/attendance/checkin.html',
    '/pages/finance/index.html',
    '/pages/finance/add.html',
    '/pages/events/index.html',
    '/pages/events/add.html',
    '/pages/sermons/index.html',
    '/pages/prayer/index.html',
    '/pages/budget/index.html',
    '/pages/pledges/index.html',
    '/pages/notifications/index.html',
    '/pages/users/index.html',
    '/pages/media/index.html',
    '/pages/reports/index.html',
    '/pages/settings/index.html',
    '/pages/auth/login.html',
    '/pages/auth/forgot-password.html',
    '/assets/css/main.css',
    '/assets/js/data.js',
    '/assets/js/utils.js',
    '/assets/js/app.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            if (response) {
                return response;
            }
            return fetch(event.request).catch(function() {
                return caches.match('/offline.html');
            });
        })
    );
});