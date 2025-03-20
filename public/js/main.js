import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication State
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User signed in: ", user.uid);
        document.getElementById('auth-links').innerHTML = `
            <li><a href="profile.html" class="hover:underline">Profile</a></li>
            <li><a href="#" id="logout" class="hover:underline">Logout</a></li>
        `;

        document.getElementById('logout').addEventListener('click', function (e) {
            e.preventDefault();
            signOut(auth).then(() => {
                alert('Logout successful!');
                window.location.href = 'index.html';
            }).catch((error) => {
                alert(`Error: ${error.message}`);
            });
        });

        loadHeroSection();
        loadFeaturedStores();
        loadDeals();
    } else {
        console.log("No user signed in");
        document.getElementById('auth-links').innerHTML = `
            <li><a href="login.html" class="hover:underline">Login</a></li>
            <li><a href="signup.html" class="hover:underline">Sign Up</a></li>
        `;
    }
});

// Load Hero Section
async function loadHeroSection() {
    try {
        const docRef = doc(db, "settings", "homePage");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("hero-title").innerText = data.heroTitle;
            document.getElementById("hero-subtitle").innerText = data.heroSubtitle;
            document.getElementById("hero-section").style.backgroundImage = `url(${data.heroImage})`;
        }
    } catch (error) {
        console.error("Error loading hero section: ", error);
    }
}

// Load Featured Stores
async function loadFeaturedStores() {
    try {
        const querySnapshot = await getDocs(collection(db, "stores"));
        let storeHTML = "";
        querySnapshot.forEach((doc) => {
            const store = doc.data();
            storeHTML += `
                <div class="store-card">
                    <img src="${store.image}" alt="${store.name}">
                    <h3>${store.name}</h3>
                    <p>${store.category} - Floor ${store.floor}</p>
                </div>
            `;
        });
        document.getElementById("featured-stores").innerHTML = storeHTML;
    } catch (error) {
        console.error("Error loading featured stores: ", error);
    }
}

// Load Trending Deals
async function loadDeals() {
    try {
        const querySnapshot = await getDocs(collection(db, "deals"));
        let dealsHTML = "";
        querySnapshot.forEach((doc) => {
            const deal = doc.data();
            dealsHTML += `
                <div class="deal-card">
                    <img src="${deal.image}" alt="${deal.store}">
                    <h3>${deal.title}</h3>
                    <p>Available at ${deal.store}</p>
                </div>
            `;
        });
        document.getElementById("deals-carousel").innerHTML = dealsHTML;
    } catch (error) {
        console.error("Error loading deals: ", error);
    }
}

// Example of adding interactivity
const searchInput = document.getElementById('shop-search');
if (searchInput) {
    searchInput.addEventListener('input', function () {
        const query = searchInput.value.toLowerCase();
        console.log('Searching for:', query);
        // Implement search functionality here
    });
}