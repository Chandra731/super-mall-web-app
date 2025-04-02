import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function () {
  const shopRegistrationForm = document.getElementById('shop-registration-form');
  const messageDiv = document.getElementById('message');

  shopRegistrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const shopName = document.getElementById('shop-name').value;
    const shopDescription = document.getElementById('shop-description').value;
    const shopFloor = document.getElementById('shop-floor').value;
    const shopImages = document.getElementById('shop-images').files;

    if (shopImages.length === 0) {
        alert('Please select at least one image');
        return;
    }

    const formData = new FormData();
    Array.from(shopImages).forEach(image => {
        formData.append('images', image);
    });

    try {
        // Upload images to local storage (Node.js server)
        const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.error);
        }

        const result = await response.json();

        const shopId = Date.now().toString(); // Generating a shop ID
        const shopData = {
            shopId: shopId,
            userId: auth.currentUser.uid,
            shopName: shopName,
            shopDescription: shopDescription,
            shopFloor: shopFloor,
            shopImageUrls: result.imageUrls, // Store image URLs in Firestore
            approved: false
        };

        await setDoc(doc(db, 'shops', shopId), shopData);
        alert('Shop registered successfully! Waiting for admin approval.');

        // Update the image preview
        const imagePreviewContainer = document.getElementById('shop-image-preview-container');
        imagePreviewContainer.innerHTML = '';
        result.imageUrls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Shop Image';
            img.style.maxWidth = '200px';
            img.classList.add('img-fluid', 'mb-2');
            imagePreviewContainer.appendChild(img);
        });

    } catch (error) {
        console.error('Error:', error);
        alert('Image upload failed: ' + error.message);
    }
  });

  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    }
  });
});