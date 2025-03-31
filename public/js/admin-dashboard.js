import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function () {
  const pendingShopsList = document.getElementById('pending-shops');
  const userLoginCountSpan = document.getElementById('user-login-count');
  const totalRevenueSpan = document.getElementById('total-revenue');

  const fetchAnalytics = async () => {
    const summaryDoc = await getDoc(doc(db, 'analytics', 'summary'));
    if (summaryDoc.exists()) {
      const data = summaryDoc.data();
      userLoginCountSpan.textContent = data.userLoginCount || 0;
      totalRevenueSpan.textContent = data.totalRevenue || 0.00;
    }
  };

  const fetchPendingShops = async () => {
    const shopQuery = query(collection(db, 'shops'), where('approved', '==', false));
    const shopSnapshot = await getDocs(shopQuery);
    shopSnapshot.forEach(doc => {
      const shop = doc.data();
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item';
      listItem.innerHTML = `
        <h4>${shop.shopName}</h4>
        <p>${shop.shopDescription}</p>
        <p>Floor: ${shop.shopFloor}</p>
        <button class="btn btn-success" onclick="approveShop('${shop.shopId}')">Approve</button>
        <button class="btn btn-danger" onclick="rejectShop('${shop.shopId}')">Reject</button>
      `;
      pendingShopsList.appendChild(listItem);
    });
  };

  fetchAnalytics();
  fetchPendingShops();

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

window.approveShop = async (shopId) => {
  try {
    await updateDoc(doc(db, 'shops', shopId), {
      approved: true
    });
    location.reload(); // Reload the page to update the list
  } catch (error) {
    alert(error.message);
  }
};

window.rejectShop = async (shopId) => {
  try {
    await deleteDoc(doc(db, 'shops', shopId));
    location.reload(); // Reload the page to update the list
  } catch (error) {
    alert(error.message);
  }
};