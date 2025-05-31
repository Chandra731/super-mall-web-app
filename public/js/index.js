import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

import './reviews.js'; 
// Create Firestore document reference helper
const getDocRef = (collectionPath, docId) => doc(db, collectionPath, docId);

document.addEventListener('DOMContentLoaded', function () {
  const greetingMessage = document.getElementById('greetingMessage');
  const profileIcon = document.getElementById('profile-icon');
  const loginButton = document.getElementById('login-btn');
  const logoutButton = document.getElementById('logout-btn');
  const contactForm = document.getElementById('contact-form');
  const featuredShopsContainer = document.getElementById('featured-shops');

  // Handle authentication state changes
  onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed. User object:", user);
  
    if (user) {
      console.log("User is logged in:", user.uid);
  
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        console.log("Fetched user document:", userDoc.exists());
  
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("User data from Firestore:", userData);
  
          greetingMessage.innerHTML = `Welcome, <strong>${userData.email}</strong>!`;
          greetingMessage.style.display = 'block';
          profileIcon.style.display = 'block';    
          loginButton.style.display = 'none';
          contactForm.style.display = 'block';
  
          console.log("UI updated for logged-in user");
        } else {
          console.warn("⚠️ No user document found in Firestore for this UID");
        }
  
      } catch (error) {
        console.error("❌ Error fetching user document:", error);
      }
  
    } else {
      console.log("🚪 User is logged out");
  
      greetingMessage.innerHTML = '';
      greetingMessage.style.display = 'none';
      profileIcon.style.display = 'none';
      loginButton.style.display = 'block';
      contactForm.style.display = 'none';
  
      console.log("🔁 UI updated for logged-out state");
    }
  });
  

  // Logout functionality
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await auth.signOut();
        alert('You have been logged out.');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Logout error:', error.message);
      }
    });
  }

  // Load featured shops
  async function loadFeaturedShops() {
    try {
      const featuredQuery = query(
        collection(db, 'shops'),
        where('featured', '==', true)
      );
  
      const querySnapshot = await getDocs(featuredQuery);
      featuredShopsContainer.innerHTML = '';
  
      if (querySnapshot.empty) {
        featuredShopsContainer.innerHTML = '<p>No featured shops at the moment.</p>';
        return;
      }
  
      querySnapshot.forEach((doc) => {
        const shopData = doc.data();
        console.log('Shop data:', shopData);
        
        const imageUrl = (Array.isArray(shopData.shopImageUrls) && shopData.shopImageUrls.length > 0)
          ? shopData.shopImageUrls[0]
          : shopData.shopImage || 'public/images/default-shop.jpg';
        
        const name = shopData.name || 'Shop Name Not Available';
        const desc = shopData.description || 'No description available';

        const shopCard = `
          <div class="col-md-4">
            <div class="card mb-4 shop-card" data-shop-id="${doc.id}" ${shopData.floor ? `data-floor="${shopData.floor}"` : ''}>
              <img src="${imageUrl}" class="card-img-top" alt="${name}"
                   onerror="this.src='public/images/default-shop.jpg'">
              <div class="card-body">
                <h5 class="card-title">${name}</h5>
                <p class="card-text">${desc}</p>
              </div>
            </div>
          </div>
        `;
        featuredShopsContainer.insertAdjacentHTML('beforeend', shopCard);
        
        // Add click handler to featured shop card
        const cardElement = featuredShopsContainer.lastElementChild.querySelector('.shop-card');
        if (cardElement) {
          cardElement.addEventListener('click', () => {
            const shopId = cardElement.getAttribute('data-shop-id');
            window.location.href = `shop.html?id=${shopId}`;
          });
        }
      });
    } catch (error) {
      console.error('Error loading featured shops:', error.message);
    }
  }

  // Load and display current offers
  async function loadCurrentOffers() {
    const offersContainer = document.getElementById('offers-container');
    const loadingElement = document.getElementById('offers-loading');
    const noOffersElement = document.getElementById('no-offers');
    
    try {
      const now = new Date();
      const offersQuery = query(
        collection(db, 'offers'),
        where('endDate', '>=', now),
        orderBy('endDate', 'asc')
      );
      
      const querySnapshot = await getDocs(offersQuery);
      
      if (loadingElement) loadingElement.style.display = 'none';
      
      if (querySnapshot.empty) {
        if (noOffersElement) noOffersElement.style.display = 'block';
        return;
      }
      
      offersContainer.innerHTML = '';
      
      querySnapshot.forEach(async (doc) => {
        const offer = doc.data();
        const offerCard = document.createElement('div');
        offerCard.className = 'col-md-4 mb-4';
        
        // Get shop name and floor only
        let shopName = 'Shop';
        let shopFloor = '';
        let validShopId = false;
        
        if (offer.shopId) {
          try {
            const shopRef = getDocRef('shops', offer.shopId);
            const shopDoc = await getDoc(shopRef);
            if (shopDoc.exists()) {
              const shopData = shopDoc.data();
              shopName = shopData.name || 'Shop';
              shopFloor = shopData.floor ? `Floor ${shopData.floor}` : '';
              validShopId = true;
            }
          } catch (error) {
            console.error('Error fetching shop details:', error);
          }
        }

        offerCard.innerHTML = `
          <div class="card h-100 offer-card" ${validShopId ? `data-shop-id="${offer.shopId}"` : ''}>
            <div class="card-body">
              <h6 class="mb-2">${shopName} ${shopFloor}</h6>
              <h5 class="card-title">${offer.name}</h5>
              <p class="card-text">${offer.description}</p>
              <p class="text-success fw-bold">${offer.discount}% OFF</p>
              <p class="text-muted small">Valid until ${offer.endDate.toDate().toLocaleDateString()}</p>
            </div>
          </div>
        `;
        offersContainer.appendChild(offerCard);

        // Add click handler only if valid shop ID exists
        if (validShopId) {
          const offerCardElement = offerCard.querySelector('.offer-card');
          if (offerCardElement) {
            offerCardElement.addEventListener('click', () => {
              window.location.href = `shop.html?id=${offer.shopId}`;
            });
          }
        } else {
          const offerCardElement = offerCard.querySelector('.offer-card');
          if (offerCardElement) {
            offerCardElement.style.cursor = 'default';
          }
        }
      });
      
    } catch (error) {
      console.error('Error loading offers:', error);
      if (loadingElement) loadingElement.style.display = 'none';
      
      // Show different messages based on error type
      if (error.code === 'permission-denied') {
        if (noOffersElement) {
          noOffersElement.textContent = 'Please login to view offers';
          noOffersElement.style.display = 'block';
        }
      } else {
        if (noOffersElement) {
          noOffersElement.textContent = 'Error loading offers. Please try again later.';
          noOffersElement.style.display = 'block';
        }
      }
      
      // Show login button if not authenticated
      if (!auth.currentUser) {
        const loginPrompt = document.createElement('div');
        loginPrompt.className = 'col-12 text-center mt-3';
        loginPrompt.innerHTML = `
          <a href="login.html" class="btn btn-primary">Login to View Offers</a>
        `;
        offersContainer.appendChild(loginPrompt);
      }
    }
  }

  loadFeaturedShops();
  loadCurrentOffers();

  // Handle Contact Form Submission
  if (contactForm) {
    contactForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        alert('Please log in to submit the form.');
        return;
      }
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const message = document.getElementById('message').value;
      if (!name || !email || !message) {
        alert('Please fill in all fields.');
        return;
      }
      try {
        await addDoc(collection(db, 'messages'), {
          userId: user.uid,
          name: name,
          email: email,
          message: message,
          timestamp: new Date()
        });
        alert('Your message has been sent successfully!');
        contactForm.reset();
      } catch (error) {
        alert('Error submitting message: ' + error.message);
      }
    });
  }
});
