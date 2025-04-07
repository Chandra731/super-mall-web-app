import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

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
      const querySnapshot = await getDocs(collection(db, 'featuredShops'));
      featuredShopsContainer.innerHTML = '';
      querySnapshot.forEach((doc) => {
        const shopData = doc.data();
        const shopCard = `
          <div class="col-md-4">
            <div class="card mb-4">
              <img src="${shopData.image}" class="card-img-top" alt="${shopData.name}">
              <div class="card-body">
                <h5 class="card-title">${shopData.name}</h5>
                <p class="card-text">${shopData.description}</p>
              </div>
            </div>
          </div>
        `;
        featuredShopsContainer.insertAdjacentHTML('beforeend', shopCard);
      });
    } catch (error) {
      console.error('Error loading featured shops:', error.message);
    }
  }

  loadFeaturedShops();


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