import { auth, db } from './firebase-config.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('shop-registration-form');
  const imageInput = document.getElementById('shopImages');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const submitBtn = document.getElementById('submit-text');
  const submitSpinner = document.getElementById('submit-spinner');
  console.log(form);  // This should not log `null`
  if (!form) {
    alert("Form element not found!");
  }

  // Image preview handler
  imageInput.addEventListener('change', (e) => {
    imagePreviewContainer.innerHTML = '';
    const files = e.target.files;

    if (files.length > 5) {
      alert('Maximum 5 images allowed');
      imageInput.value = '';
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.classList.add('image-preview');
        imagePreviewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert('Please login to register a shop');
      window.location.href = 'login.html';
      return;
    }

    try {
      submitBtn.textContent = 'Processing...';
      submitSpinner.classList.remove('d-none');

      const formData = new FormData();
      const files = imageInput.files;

      for (let i = 0; i < files.length; i++) {
        formData.append('shopImages', files[i]); // keep this name same as server expects
      }

      const uploadResponse = await fetch('http://localhost:5000/upload/shop-images', {
        method: 'POST',
        body: formData
      });

      const contentType = uploadResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await uploadResponse.text();
        throw new Error('Server returned HTML instead of JSON. Check server implementation.');
      }

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json().catch(() => {
          throw new Error('Image upload failed (invalid server response)');
        });
        throw new Error(error.message || 'Image upload failed');
      }

      const result = await uploadResponse.json();
      const imageUrls = result.imageUrls || [];

      // Save shop data to Firestore
      const shopData = {
        name: form['shop-name'].value,
        category: form['shop-category'].value,
        description: form['shop-description'].value,
        floor: form['shop-floor'].value,
        shopNumber: form['shop-number'].value,
        address: form['shop-address'].value,
        email: form['shop-email'].value,
        phone: form['shop-phone'].value,
        ownerName: form['owner-name'].value,
        ownerId: form['owner-id'].value,
        businessHours: {
          opening: form['opening-time'].value,
          closing: form['closing-time'].value,
          openWeekends: form['open-weekends'].checked
        },
        shopImageUrls: imageUrls,
        createdAt: new Date(),
        ownerId: user.uid,
        status: 'pending'
      };

      await setDoc(doc(db, 'shops', user.uid), shopData);

      alert('Shop registration submitted successfully! Awaiting admin approval.');
      window.location.href = 'index.html';

    } catch (error) {
      console.error('Registration error:', error);
      alert(`Registration failed: ${error.message}`);
    } finally {
      submitBtn.textContent = 'Register Shop';
      submitSpinner.classList.add('d-none');
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    }
  });
});
