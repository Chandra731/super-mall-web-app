// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDhMt-tyTNIWowOMWjjAwhVvRK9MVzEtHg",
    authDomain: "super-mall-web-app-f5a02.firebaseapp.com",
    databaseURL: "https://super-mall-web-app-f5a02-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "super-mall-web-app-f5a02",
    storageBucket: "super-mall-web-app-f5a02.appspot.com",
    messagingSenderId: "333180334350",
    appId: "1:333180334350:web:e9970df600604c6bff675f",
    measurementId: "G-Q6W5Z1280G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };