const firebaseConfig = {
    apiKey: "AIzaSyDhMt-tyTNIWowOMWjjAwhVvRK9MVzEtHg",
    authDomain: "super-mall-web-app-f5a02.firebaseapp.com",
    projectId: "super-mall-web-app-f5a02",
    storageBucket: "super-mall-web-app-f5a02.firebasestorage.app",
    messagingSenderId: "333180334350",
    appId: "1:333180334350:web:e9970df600604c6bff675f",
    measurementId: "G-Q6W5Z1280G"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);