import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const profileForm = document.getElementById('profile-form');
  const displayNameInput = document.getElementById('display-name');
  const emailInput = document.getElementById('email');

  const loadUserProfile = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        displayNameInput.value = userData.displayName || user.displayName;
        emailInput.value = user.email;
      } else {
        displayNameInput.value = user.displayName;
        emailInput.value = user.email;
      }
    }
  };

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
      const displayName = displayNameInput.value;
      try {
        await updateProfile(user, { displayName });
        await setDoc(doc(db, 'users', user.uid), { displayName }, { merge: true });
        alert('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error.message);
      }
    }
  });

  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadUserProfile();
    } else {
      window.location.href = 'login.html';
    }
  });
});