import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function loginUser() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if user is the hardcoded admin
        const adminRef = doc(db, "admin", "admin123"); 
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists() && adminSnap.data().email === email) {
            window.location.href = "admin.html";
            return;
        }

        // Fetch role from Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const role = userSnap.data().role;
            if (role === "shop_owner") {
                window.location.href = "shop-owner.html";
            } else {
                window.location.href = "dashboard.html";
            }
        } else {
            alert("User data not found!");
        }
    } catch (error) {
        alert(error.message);
    }
}