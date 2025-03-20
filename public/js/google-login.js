import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();

async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user exists in Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const role = userSnap.data().role;
            if (role === "shop_owner") {
                window.location.href = "shop-owner-dashboard.html";
            } else {
                window.location.href = "dashboard.html";
            }
        } else {
            // New users default to "customer"
            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                role: "customer",
                createdAt: new Date().toISOString()
            });

            window.location.href = "dashboard.html";
        }
    } catch (error) {
        alert(error.message);
    }
}