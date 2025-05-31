import { auth, db } from './firebase-config.js';
import { doc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profile-form');
  const profileImageInput = document.getElementById('profile-image');
  const profileImagePreview = document.getElementById('profile-image-preview');
  const submitBtn = document.getElementById('profile-submit-btn');
  const submitSpinner = document.getElementById('profile-submit-spinner');

  // Image preview handler
  profileImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        profileImagePreview.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Form submission
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      submitBtn.disabled = true;
      submitSpinner.classList.remove('d-none');

      const file = profileImageInput.files[0];
      let imageUrl = profileImagePreview.src;

      if (file) {
        // Upload to Node.js server
        const formData = new FormData();
        formData.append('image', file);

        const uploadResponse = await fetch('http://localhost:5001/upload/profile', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) throw new Error('Image upload failed');
        
        const { urls } = await uploadResponse.json();
        imageUrl = urls[0];
      }

      // Update profile in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        profileImage: imageUrl,
        lastUpdated: new Date()
      });

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitSpinner.classList.add('d-none');
    }
  });

  // Load current profile
  // Handle image upload
  changePhotoBtn.addEventListener('click', () => profileImageUpload.click());

  profileImageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const user = auth.currentUser;
      if (user) {
        const imageUrl = await uploadProfileImage(file, user.uid);
        if (imageUrl) {
          profilePicture.src = imageUrl;
          await setDoc(doc(db, 'shopOwners', user.uid), {
            profileImage: imageUrl
          }, { merge: true });
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
        const profileData = {
          shopName: shopNameInput.value,
          contactNumber: contactNumberInput.value,
          shopAddress: shopAddressInput.value,
          openingTime: openingTimeInput.value,
          closingTime: closingTimeInput.value,
          shopDescription: shopDescriptionInput.value,
          lastUpdated: new Date().toISOString()
        };

        await setDoc(doc(db, 'shopOwners', user.uid), profileData, { merge: true });
        shopNameDisplay.textContent = shopNameInput.value;
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
      loadUserProfile();
    } else {
      window.location.href = 'login.html';
    }
  });
});
