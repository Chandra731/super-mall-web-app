import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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

        const storeId = new URLSearchParams(window.location.search).get('store');
        if (storeId) {
            loadStoreDetails(storeId);
            loadOffers(storeId);
            loadReviews(storeId);
            loadRecommendations(storeId);
        }
    } else {
        console.log("No user signed in");
        document.getElementById('auth-links').innerHTML = `
            <li><a href="login.html" class="hover:underline">Login</a></li>
            <li><a href="signup.html" class="hover:underline">Sign Up</a></li>
        `;
        window.location.href = "login.html";
    }
});

// Load Store Details
async function loadStoreDetails(storeId) {
    try {
        const docRef = doc(db, "stores", storeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const store = docSnap.data();
            document.getElementById("store-image").src = store.image;
            document.getElementById("store-name").textContent = store.name;
            document.getElementById("store-category").textContent = store.category;
            document.getElementById("store-rating").textContent = `⭐ ${store.rating}`;
            document.getElementById("occupancy-status").textContent = store.occupancy;
            document.getElementById("followers-count").textContent = `${store.followers} Followers`;
        }
    } catch (error) {
        console.error("Error loading store details: ", error);
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
                    <div class="offer-card">
                        <img src="${offer.image}" alt="${offer.title}">
                        <p>${offer.title}</p>
                        <span>Valid Until: ${offer.validUntil}</span>
                    </div>
                `;
            }
        });
        document.getElementById("offers-section").innerHTML = offersHTML;
    } catch (error) {
        console.error("Error loading offers: ", error);
    }
}

// Load Reviews
async function loadReviews(storeId) {
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
        console.error("Error loading reviews: ", error);
    }
}

// Submit Review
document.getElementById("review-form").addEventListener("submit", async function(e) {
    e.preventDefault();
    const storeId = new URLSearchParams(window.location.search).get('store');
    const userName = document.getElementById("review-user").value;
    const userRating = document.getElementById("review-rating").value;
    const userComment = document.getElementById("review-comment").value;

    try {
        await addDoc(collection(db, "reviews"), {
            storeId: storeId,
            user: userName,
            rating: userRating,
            comment: userComment,
            sentiment: "Pending" // AI Sentiment Analysis can update this field later
        });
        alert("Review submitted!");
        loadReviews(storeId); // Reload reviews
    } catch (error) {
        console.error("Error submitting review: ", error);
    }
});

// Load Recommendations
async function loadRecommendations(storeId) {
    try {
        const querySnapshot = await getDocs(collection(db, "recommendations"));
        let recommendationsHTML = "";
        querySnapshot.forEach((doc) => {
            const rec = doc.data();
            if (rec.storeId === storeId) {
                rec.recommendedStores.forEach((store) => {
                    recommendationsHTML += `
                        <div class="recommended-card" onclick="loadStoreDetails('${store.id}')">
                            <img src="${store.image}" alt="${store.name}">
                            <h3>${store.name}</h3>
                        </div>
                    `;
                });
            }
        });
        document.getElementById("recommendations-section").innerHTML = recommendationsHTML;
    } catch (error) {
        console.error("Error loading recommendations: ", error);
    }
}

// Helper function to load store details for recommendations
window.loadStoreDetails = function(storeId) {
    window.location.href = `store-details.html?store=${storeId}`;
}