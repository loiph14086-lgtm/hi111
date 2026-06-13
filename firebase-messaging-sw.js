importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCsYwhMwrFahVQwUG3fbjVW7zoG7g6weLk",
    authDomain: "hiweb-c92a4.firebaseapp.com",
    projectId: "hiweb-c92a4",
    storageBucket: "hiweb-c92a4.firebasestorage.app",
    messagingSenderId: "323046508146",
    appId: "1:323046508146:web:edf5b391033a237943e4eb",
    measurementId: "G-P0Q4KHLELH"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || "Thông báo mới";
    const body = data.body || "Bạn có thông báo mới từ hệ thống";

    const notificationOptions = {
        body: body,
        icon: "/assets/img/logo-small.png",
        badge: "/assets/img/logo-small.png",
        requireInteraction: true,
        data: data
    };

    return self.registration.showNotification(title, notificationOptions);
});

// Xử lý click thông báo
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url === "/" && "focus" in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow("/");
                }
            })
    );
});

// Lifecycle để cập nhật SW ngay lập tức
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});