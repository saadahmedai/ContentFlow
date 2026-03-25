importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "valiant-airlock-477220-u9",
  appId: "1:827078048881:web:de0e9922589a353ba52fd0",
  apiKey: "AIzaSyBUq7injdvhMVbcVd5PWFbCQFTtA2oWyEo",
  authDomain: "valiant-airlock-477220-u9.firebaseapp.com",
  messagingSenderId: "827078048881"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
