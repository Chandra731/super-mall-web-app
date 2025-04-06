import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updatePassword,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, setDoc, getDoc, query, where, getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const verifyEmailForm = document.getElementById('verify-email-form');
  const resetPasswordForm = document.getElementById('reset-password-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === 'user') {
            window.location.href = 'index.html';
          } else if (role === 'shop-owner') {
            const shopQuery = query(collection(db, 'shops'), where('userId', '==', userId), where('approved', '==', true));
            const shopSnapshot = await getDocs(shopQuery);
            if (!shopSnapshot.empty) {
              window.location.href = 'shop-owner-dashboard.html';
            } else {
              window.location.href = 'shop-registration.html';
            }
          } else if (role === 'admin') {
            window.location.href = 'admin-dashboard.html';
          }
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const role = document.getElementById('register-role').value;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        await setDoc(doc(db, 'users', userId), {
          email: email,
          role: role,
          createdAt: new Date().toISOString()
        });
        await auth.currentUser.getIdToken(true);
        if (role === 'user') {
          window.location.href = 'index.html';
        } else if (role === 'shop-owner') {
          window.location.href = 'shop-registration.html';
        } else if (role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (verifyEmailForm) {
    verifyEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('verify-email').value;

      try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          alert('Email verified. Please enter your new password.');
          verifyEmailForm.style.display = 'none';
          resetPasswordForm.style.display = 'block';
        } else {
          alert('No user found with this email.');
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('reset-password-new').value;
      const confirmPassword = document.getElementById('reset-password-confirm').value;

      if (newPassword !== confirmPassword) {
        alert('Passwords do not match.');
        return;
      }

      try {
        const user = auth.currentUser;
        if (user) {
          await updatePassword(user, newPassword);
          alert('Password has been reset successfully!');
          window.location.href = 'login.html';
        } else {
          alert('No user is signed in.');
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user);
    } else {
      console.log('No user is signed in.');
    }
  });
});