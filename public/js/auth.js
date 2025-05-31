console.log('auth.js script loaded');

import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  doc, setDoc, getDoc, query, where, getDocs, collection
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// 🔁 Redirect helper
function redirectTo(path) {
  window.location.href = path;
}

// Validation functions
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.style.display = 'none';
  }
}

// Function to handle user redirect based on role
async function handleUserRedirect(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    const role = userDoc.data().role;

    switch (role) {
      case 'user':
        redirectTo('index.html');
        break;

      case 'shop-owner':
        const shopQuery = query(
          collection(db, 'shops'),
          where('ownerId', '==', userId)
        );
        const shopSnapshot = await getDocs(shopQuery);

        if (shopSnapshot.empty) {
          console.log('No shops found for this user.');
          redirectTo('shop-registration.html');
        } else {
          let approvedShopFound = false;

          shopSnapshot.forEach(doc => {
            const data = doc.data();
            console.log('Checking shop document:', data);

            if (data.approved === true && data.status === 'approved') {
              approvedShopFound = true;
            }
          });

          if (approvedShopFound) {
            console.log('Approved shop found. Redirecting to dashboard...');
            redirectTo('shop-owner-dashboard.html');
          } else {
            console.log('Shop found, but not approved. Redirecting to registration...');
            redirectTo('shop-registration.html');
          }
        }
        break;

      case 'admin':
        redirectTo('admin-dashboard.html');
        break;

      default:
        alert('Unknown user role.');
    }
  } else {
    alert('User document does not exist.');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  console.log('DOMContentLoaded event fired');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const verifyEmailForm = document.getElementById('verify-email-form');
  const resetPasswordForm = document.getElementById('reset-password-form');
  const googleSignInBtn = document.getElementById('google-signin-btn');
  const yahooSignInBtn = document.getElementById('yahoo-signin-btn');
  const githubSignInBtn = document.getElementById('github-signin-btn');

  // Immediate validation for login form
  if (loginForm) {
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');

    loginEmailInput.addEventListener('input', () => {
      if (!validateEmail(loginEmailInput.value)) {
        showError('login-email-error', 'Please enter a valid email address.');
      } else {
        hideError('login-email-error');
      }
    });

    loginPasswordInput.addEventListener('input', () => {
      if (loginPasswordInput.value.trim() === '') {
        showError('login-password-error', 'Password is required.');
      } else {
        hideError('login-password-error');
      }
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginEmailInput.value;
      const password = loginPasswordInput.value;

      let valid = true;
      if (!validateEmail(email)) {
        showError('login-email-error', 'Please enter a valid email address.');
        valid = false;
      }
      if (password.trim() === '') {
        showError('login-password-error', 'Password is required.');
        valid = false;
      }
      if (!valid) return;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleUserRedirect(userCredential.user.uid);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Immediate validation for register form
  if (registerForm) {
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const registerRoleSelect = document.getElementById('register-role');

    registerEmailInput.addEventListener('input', () => {
      if (!validateEmail(registerEmailInput.value)) {
        showError('register-email-error', 'Please enter a valid email address.');
      } else {
        hideError('register-email-error');
      }
    });

    registerPasswordInput.addEventListener('input', () => {
      if (!validatePassword(registerPasswordInput.value)) {
        showError('register-password-error', 'Password must be at least 6 characters.');
      } else {
        hideError('register-password-error');
      }
    });

    registerRoleSelect.addEventListener('change', () => {
      if (!registerRoleSelect.value) {
        showError('register-role-error', 'Please select a role.');
      } else {
        hideError('register-role-error');
      }
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = registerEmailInput.value;
      const password = registerPasswordInput.value;
      const role = registerRoleSelect.value;

      let valid = true;
      if (!validateEmail(email)) {
        showError('register-email-error', 'Please enter a valid email address.');
        valid = false;
      }
      if (!validatePassword(password)) {
        showError('register-password-error', 'Password must be at least 6 characters.');
        valid = false;
      }
      if (!role) {
        showError('register-role-error', 'Please select a role.');
        valid = false;
      }
      if (!valid) return;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        await setDoc(doc(db, 'users', userId), {
          email: email,
          role: role,
          createdAt: new Date().toISOString()
        });

        await auth.currentUser.getIdToken(true); // Refresh token

        // Role-based redirect
        await handleUserRedirect(userId);

      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Google Sign-In Handler
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        // Check if user document exists, if not create one with default role 'user'
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        }
        await handleUserRedirect(user.uid);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Yahoo Sign-In Handler
  if (yahooSignInBtn) {
    yahooSignInBtn.addEventListener('click', async () => {
      const provider = new OAuthProvider('yahoo.com');
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        // Check if user document exists, if not create one with default role 'user'
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        }
        await handleUserRedirect(user.uid);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // GitHub Sign-In Handler
  if (githubSignInBtn) {
    githubSignInBtn.addEventListener('click', async () => {
      const provider = new GithubAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        // Check if user document exists, if not create one with default role 'user'
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        }
        await handleUserRedirect(user.uid);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Verify Email Form Handler
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

  // Reset Password Form Handler
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
          redirectTo('login.html');
        } else {
          alert('No user is signed in.');
        }

      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Auth State Listener (Optional but useful)
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user.email || user.phoneNumber);
    } else {
      console.log('No user is signed in.');
    }
  });

  // Logout Function (if needed)
  /*
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      redirectTo('login.html');
    });
  }
  */
});
