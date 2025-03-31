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
    const shopImage = document.getElementById('shop-images').files[0];

    if (!shopImage) {
        alert('Please select an image');
        return;
    }

    const formData = new FormData();
    formData.append('shopImage', shopImage);

    try {
        // Upload image to local storage (Node.js server)
        const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        const shopId = Date.now().toString(); // Generating a shop ID
        const shopData = {
            shopId: shopId,
            userId: auth.currentUser.uid,
            shopName: shopName,
            shopDescription: shopDescription,
            shopFloor: shopFloor,
            shopImageUrl: result.imageUrl, // Store image URL in Firestore
            approved: false
        };

        await setDoc(doc(db, 'shops', shopId), shopData);
        alert('Shop registered successfully! Waiting for admin approval.');

        // Update the image preview
        document.getElementById('shop-image-preview').src = result.imageUrl;

    } catch (error) {
        console.error('Error:', error);
        alert('Image upload failed.');
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