import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js';
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

        const storeId = "store1"; // Replace with logic to get the actual store ID for the logged-in owner
        loadStoreAnalytics(storeId);
        loadStoreDetails(storeId);
        loadOffers(storeId);
        loadStoreReviews(storeId);
        loadAdvancedAnalytics(storeId);

        document.getElementById("store-details-form").addEventListener("submit", function(e) {
            e.preventDefault();
            updateStoreDetails(storeId);
        });

        document.getElementById("offer-form").addEventListener("submit", function(e) {
            e.preventDefault();
            addNewOffer(storeId);
        });
    } else {
        console.log("No user signed in");
        document.getElementById('auth-links').innerHTML = `
            <li><a href="login.html" class="hover:underline">Login</a></li>
            <li><a href="signup.html" class="hover:underline">Sign Up</a></li>
        `;
        window.location.href = "login.html";
    }
});

// Load Store Analytics
async function loadStoreAnalytics(storeId) {
    try {
        const docRef = doc(db, "store_analytics", storeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("revenue").textContent = `₹${data.totalRevenue}`;
            document.getElementById("footTraffic").textContent = `${data.footTraffic} Visitors`;
            document.getElementById("activeOffers").textContent = `${data.activeOffers} Active Offers`;
            document.getElementById("averageRating").textContent = `⭐ ${data.averageRating}`;

            updateSalesChart(data.salesTrend);
        }
    } catch (error) {
        console.error("Error loading store analytics: ", error);
    }
}

// Update Sales Chart
function updateSalesChart(data) {
    new Chart(document.getElementById("salesChart"), {
        type: "line",
        data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            datasets: [{
                label: "Daily Sales (₹)",
                data: data,
                borderColor: "#4CAF50",
                fill: false
            }]
        }
    });
}

// Load Store Details
async function loadStoreDetails(storeId) {
    try {
        const docRef = doc(db, "stores", storeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const store = docSnap.data();
            document.getElementById("storeName").value = store.name;
            document.getElementById("storeCategory").value = store.category;
            document.getElementById("storeDescription").value = store.description;
        }
    } catch (error) {
        console.error("Error loading store details: ", error);
    }
}

// Update Store Details
async function updateStoreDetails(storeId) {
    try {
        const storeRef = doc(db, "stores", storeId);
        await updateDoc(storeRef, {
            name: document.getElementById("storeName").value,
            category: document.getElementById("storeCategory").value,
            description: document.getElementById("storeDescription").value
        });
        alert("Store details updated successfully!");
    } catch (error) {
        console.error("Error updating store details: ", error);
    }
}

// Load Offers
async function loadOffers(storeId) {
    try {
        const querySnapshot = await getDocs(collection(db, "offers"));
        let offersHTML = "";
        querySnapshot.forEach((doc) => {
            const offer = doc.data();
            if (offer.storeId === storeId) {
                offersHTML += `
                    <div class="offer-card" data-offer-id="${doc.id}">
                        <img src="${offer.image}" alt="${offer.title}">
                        <p>${offer.title}</p>
                        <span>Valid Until: ${offer.validUntil}</span>
                        <button onclick="deleteOffer('${doc.id}')" class="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition">Delete</button>
                    </div>
                `;
            }
        });
        document.getElementById("offers-list").innerHTML = offersHTML;
    } catch (error) {
        console.error("Error loading offers: ", error);
    }
}

// Add New Offer
async function addNewOffer(storeId) {
    try {
        const offerRef = collection(db, "offers");
        await addDoc(offerRef, {
            storeId: storeId,
            title: document.getElementById("offerTitle").value,
            image: document.getElementById("offerImage").value,
            validUntil: document.getElementById("offerValidUntil").value
        });
        alert("Offer added successfully!");
        loadOffers(storeId); // Reload offers
    } catch (error) {
        console.error("Error adding new offer: ", error);
    }
}

// Delete Offer
window.deleteOffer = async function(offerId) {
    try {
        await deleteDoc(doc(db, "offers", offerId));
        alert("Offer deleted successfully!");
        const storeId = "store1"; // Replace with logic to get the actual store ID for the logged-in owner
        loadOffers(storeId); // Reload offers
    } catch (error) {
        console.error("Error deleting offer: ", error);
    }
}

// Load Store Reviews
async function loadStoreReviews(storeId) {
    try {
        const querySnapshot = await getDocs(collection(db, "reviews"));
        let reviewsHTML = "";
        querySnapshot.forEach((doc) => {
            const review = doc.data();
            if (review.storeId === storeId) {
                reviewsHTML += `
                    <div class="review-card">
                        <h4>${review.user}</h4>
                        <p>${review.comment}</p>
                        <span class="rating">⭐ ${review.rating}</span>
                    </div>
                `;
            }
        });
        document.getElementById("reviews-section").innerHTML = reviewsHTML;
    } catch (error) {
        console.error("Error loading store reviews: ", error);
    }
}

// Load Advanced Analytics
async function loadAdvancedAnalytics(storeId) {
    try {
        const docRef = doc(db, "advanced_analytics", storeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("busiest-hours").textContent = data.busiestHours.join(", ");
            document.getElementById("top-items").textContent = data.topSellingItems.join(", ");
            document.getElementById("satisfaction").textContent = `${data.customerSatisfaction}% Happy Customers`;
        }
    } catch (error) {
        console.error("Error loading advanced analytics: ", error);
    }
}