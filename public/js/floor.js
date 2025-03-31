import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { query, where, getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function () {
  const floorSelectionForm = document.getElementById('floor-selection-form');
  const shopList = document.getElementById('shop-list');

  floorSelectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const floor = document.getElementById('floor').value;

    // Clear the shop list
    shopList.innerHTML = '';

    // Fetch shops on the selected floor
    const shopQuery = query(collection(db, 'shops'), where('shopFloor', '==', floor), where('approved', '==', true));
    const shopSnapshot = await getDocs(shopQuery);
    shopSnapshot.forEach(doc => {
      const shop = doc.data();
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item';
      listItem.innerHTML = `
        <h4>${shop.shopName}</h4>
        <p>${shop.shopDescription}</p>
        <button class="btn btn-primary" onclick="selectShop('${shop.shopId}')">View Products</button>
      `;
      shopList.appendChild(listItem);
    });
  });

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

window.selectShop = (shopId) => {
  window.location.href = `shop.html?shopId=${shopId}`;
};