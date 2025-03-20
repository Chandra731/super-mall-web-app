import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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
        loadFloors();
        watchStoreOccupancy();
    } else {
        console.log("No user signed in");
        window.location.href = "login.html";
    }
});

// Load Floors
async function loadFloors() {
    try {
        const querySnapshot = await getDocs(collection(db, "floors"));
        let floorsHTML = "";
        querySnapshot.forEach((doc) => {
            const floor = doc.data();
            floorsHTML += `
                <div class="floor-card" onclick="loadStores('${floor.id}')">
                    <img src="${floor.image}" alt="${floor.name}">
                    <h3>${floor.name}</h3>
                    <p>${floor.description}</p>
                    <span>Popular: ${floor.popularStores.join(", ")}</span>
                </div>
            `;
        });
        document.getElementById("floor-section").innerHTML = floorsHTML;
    } catch (error) {
        console.error("Error loading floors: ", error);
    }
}

// Load Stores for Selected Floor
window.loadStores = async function(floorId) {
    try {
        const querySnapshot = await getDocs(collection(db, "stores"));
        let storesHTML = "";
        querySnapshot.forEach((doc) => {
            const store = doc.data();
            if (store.floor === floorId) {
                storesHTML += `
                    <div class="store-card" data-store-id="${store.id}">
                        <img src="${store.image}" alt="${store.name}">
                        <h3>${store.name}</h3>
                        <p>Category: ${store.category}</p>
                        <span class="occupancy-status ${store.occupancy.toLowerCase()}">${store.occupancy}</span>
                    </div>
                `;
            }
        });
        document.getElementById("store-list").innerHTML = storesHTML;
    } catch (error) {
        console.error("Error loading stores: ", error);
    }
}

// Watch Store Occupancy
function watchStoreOccupancy() {
    onSnapshot(collection(db, "stores"), (snapshot) => {
        snapshot.docs.forEach((doc) => {
            const store = doc.data();
            const storeElement = document.querySelector(`[data-store-id="${store.id}"] .occupancy-status`);
            if (storeElement) {
                storeElement.textContent = store.occupancy;
                storeElement.className = `occupancy-status ${store.occupancy.toLowerCase()}`;
            }
        });
    });
}

// Filter Stores
window.filterStores = function(category) {
    const allStores = document.querySelectorAll(".store-card");
    allStores.forEach(store => {
        const storeCategory = store.querySelector("p").textContent;
        store.style.display = storeCategory.includes(category) ? "block" : "none";
    });
}

// Search Stores
document.getElementById("search-bar").addEventListener("input", function() {
    const searchValue = this.value.toLowerCase();
    const allStores = document.querySelectorAll(".store-card h3");
    allStores.forEach(store => {
        const storeName = store.textContent.toLowerCase();
        store.parentElement.style.display = storeName.includes(searchValue) ? "block" : "none";
    });
});

// Get Navigation
window.getNavigation = async function() {
    const start = document.getElementById("start-store").value;
    const destination = document.getElementById("destination-store").value;
    try {
        const querySnapshot = await getDocs(collection(db, "navigation"));
        querySnapshot.forEach((doc) => {
            const path = doc.data();
            if (path.from === start && path.to === destination) {
                document.getElementById("navigation-steps").innerHTML = path.steps.map(step => `<li>${step}</li>`).join("");
            }
        });
    } catch (error) {
        console.error("Error fetching navigation: ", error);
    }
}