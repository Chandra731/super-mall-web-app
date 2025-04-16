import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function() {
  // Form elements
  const profileForm = document.getElementById('user-profile-form');
  const fullNameInput = document.getElementById('user-fullname');
  const emailInput = document.getElementById('user-email-input');
  const phoneInput = document.getElementById('user-phone');
  const addressInput = document.getElementById('user-address');
  const profilePic = document.getElementById('user-profile-pic');
  const userNameDisplay = document.getElementById('user-name');
  const userEmailDisplay = document.getElementById('user-email');
  const changePhotoBtn = document.getElementById('user-change-photo');
  const imageUpload = document.getElementById('user-image-upload');

  // Load user profile data
  const loadUserProfile = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        fullNameInput.value = userData.fullName || '';
        phoneInput.value = userData.phone || '';
        addressInput.value = userData.address || '';
        emailInput.value = user.email;
        
        if (userData.profileImage) {
          profilePic.src = userData.profileImage;
        }
        
        userNameDisplay.textContent = userData.fullName || 'User';
        userEmailDisplay.textContent = user.email;
      }
    }
  };

  // Handle image upload
  changePhotoBtn.addEventListener('click', () => imageUpload.click());

  imageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const user = auth.currentUser;
      if (user) {
        try {
          const formData = new FormData();
          formData.append('profileImage', file);
          formData.append('userId', user.uid);
          formData.append('type', 'user');

          const response = await fetch('http://localhost:5001/upload/profile', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();
          if (result.success) {
            const imageUrl = result.urls[0];
            profilePic.src = imageUrl;
            await setDoc(doc(db, 'users', user.uid), {
              profileImage: imageUrl
            }, { merge: true });
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
    }
  });

  // Handle form submission
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
      try {
        const userData = {
          fullName: fullNameInput.value,
          phone: phoneInput.value,
          address: addressInput.value,
          lastUpdated: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
        userNameDisplay.textContent = fullNameInput.value;
        alert('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
      }
    }
  });

  // Logout handler
  document.getElementById('user-logout-btn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadUserProfile();
    } else {
      window.location.href = 'login.html';
    }
  });
});
