import { auth, db } from './firebase-config.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('shop-registration-form');
  const imageInput = document.getElementById('shopImages');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const submitBtn = document.getElementById('submit-text');
  const submitSpinner = document.getElementById('submit-spinner');

  if (!form) {
    alert("Form element not found!");
    return;
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

      // Validate images
      const files = imageInput.files;
      if (files.length === 0) {
        throw new Error('Please upload at least one shop image');
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      for (let i = 0; i < files.length; i++) {
        if (!validTypes.includes(files[i].type)) {
          throw new Error('Only JPG, PNG or WebP images are allowed');
        }
        if (files[i].size > 5 * 1024 * 1024) { // 5MB
          throw new Error('Image size must be less than 5MB');
        }
      }

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('shopImages', files[i]);
      }

      const uploadResponse = await fetch('http://localhost:5001/upload/shop-images', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Raw upload response:', uploadResponse);

      const contentType = uploadResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await uploadResponse.text();
        console.error('Unexpected server response:', errorText);
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

      // Validate required fields
      const requiredFields = ['shop-name', 'shop-category', 'shop-floor', 'shop-number'];
      for (const field of requiredFields) {
        if (!form[field].value.trim()) {
          throw new Error(`Please fill in ${field.replace('-', ' ')}`);
        }
      }

      // Validate email format
      const email = form['shop-email'].value.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Validate phone number (basic check)
      const phone = form['shop-phone'].value.trim();
      if (phone && !/^[\d\s\-()+]{10,20}$/.test(phone)) {
        throw new Error('Please enter a valid phone number');
      }

      const shopData = {
        name: form['shop-name'].value.trim(),
        category: form['shop-category'].value,
        description: form['shop-description'].value.trim(),
        floor: form['shop-floor'].value,
        shopNumber: form['shop-number'].value,
        address: form['shop-address'].value.trim(),
        email: email,
        phone: phone,
        ownerName: form['owner-name'].value.trim(),
        businessHours: {
          opening: form['opening-time'].value,
          closing: form['closing-time'].value,
          openWeekends: form['open-weekends'].checked
        },
        shopImageUrls: imageUrls,
        createdAt: new Date(),
        ownerId: user.uid, // Single ownerId field
        status: 'pending',
        approved: false
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