import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updatePassword, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { 
  doc, setDoc, getDoc, query, where, getDocs, collection 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// 🔁 Redirect helper
function redirectTo(path) {
  window.location.href = path;
}

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const verifyEmailForm = document.getElementById('verify-email-form');
  const resetPasswordForm = document.getElementById('reset-password-form');

  // ✅ Login Handler
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

      } catch (error) {
        alert(error.message);
      }
    });
  }

  // ✅ Registration Handler
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

        await auth.currentUser.getIdToken(true); // Refresh token

        // Role-based redirect
        switch (role) {
          case 'user':
            redirectTo('index.html');
            break;
          case 'shop-owner':
            redirectTo('shop-registration.html');
            break;
          case 'admin':
            redirectTo('admin-dashboard.html');
            break;
          default:
            alert('Unknown user role.');
        }

      } catch (error) {
        alert(error.message);
      }
    });
  }

  // ✅ Verify Email Form Handler
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

  // ✅ Reset Password Form Handler
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

  // ✅ Auth State Listener (Optional but useful)
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user.email);
    } else {
      console.log('No user is signed in.');
    }
  });

  // ✅ Logout Function (if needed)
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
