import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { query, where, getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const productList = document.getElementById('product-list');
  const urlParams = new URLSearchParams(window.location.search);
  const shopId = urlParams.get('shopId');

  if (!shopId) {
    window.location.href = 'floor.html';
    return;
  }

  // Fetch products for the selected shop
  const productQuery = query(collection(db, 'products'), where('shopId', '==', shopId));
  const productSnapshot = await getDocs(productQuery);
  productSnapshot.forEach(doc => {
    const product = doc.data();
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    listItem.innerHTML = `
      <h4>${product.productName}</h4>
      <p>Price: $${product.productPrice}</p>
      <p>${product.productDescription}</p>
      <img src="${product.productImage}" alt="${product.productName}" class="img-fluid">
    `;
    productList.appendChild(listItem);
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