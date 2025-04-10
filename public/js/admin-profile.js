import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function() {
  // Form elements
  const profileForm = document.getElementById('admin-profile-form');
  const fullNameInput = document.getElementById('admin-fullname');
  const emailInput = document.getElementById('admin-email-input');
  const phoneInput = document.getElementById('admin-phone');
  const profilePic = document.getElementById('admin-profile-pic');
  const adminNameDisplay = document.getElementById('admin-name');
  const adminEmailDisplay = document.getElementById('admin-email');
  const changePhotoBtn = document.getElementById('admin-change-photo');
  const imageUpload = document.getElementById('admin-image-upload');

  // Load admin profile data
  const loadAdminProfile = async () => {
    const user = auth.currentUser;
    if (user) {
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        fullNameInput.value = adminData.fullName || '';
        phoneInput.value = adminData.phone || '';
        emailInput.value = user.email;
        
        if (adminData.profileImage) {
          profilePic.src = adminData.profileImage;
        }
        
        adminNameDisplay.textContent = adminData.fullName || 'Admin';
        adminEmailDisplay.textContent = user.email;
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
          formData.append('type', 'admin');

          const response = await fetch('/upload-profile-image', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();
          if (result.success) {
            profilePic.src = result.imageUrl;
            await setDoc(doc(db, 'admins', user.uid), {
              profileImage: result.imageUrl
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
        const adminData = {
          fullName: fullNameInput.value,
          phone: phoneInput.value,
          lastUpdated: new Date().toISOString()
        };

        await setDoc(doc(db, 'admins', user.uid), adminData, { merge: true });
        adminNameDisplay.textContent = fullNameInput.value;
        alert('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
      }
    }
  });

  // Logout handler
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadAdminProfile();
    } else {
      window.location.href = 'login.html';
    }
  });
});
