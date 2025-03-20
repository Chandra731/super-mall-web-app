import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function signUpUser() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;  // 'customer' or 'shop_owner'

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });

        const userData = {
            uid: user.uid,
            name,
            email,
            role,
            createdAt: new Date().toISOString()
        };

        if (role === "shop_owner") {
            userData.shopDetails = {
                shopName: document.getElementById("shopName").value,
                location: document.getElementById("shopLocation").value
            };
        }

        await setDoc(doc(db, "users", user.uid), userData);
        alert("Signup successful!");
        window.location.href = "login.html";
    } catch (error) {
        alert(error.message);
    }
}

document.getElementById('role').addEventListener('change', function() {
    const shopDetails = document.getElementById('shop-details');
    if (this.value === 'shop_owner') {
        shopDetails.classList.remove('hidden');
    } else {
        shopDetails.classList.add('hidden');
    }
});