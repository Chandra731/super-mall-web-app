import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { query, where, getDocs, collection, doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const productList = document.getElementById('product-list');
  const urlParams = new URLSearchParams(window.location.search);
  const shopId = urlParams.get('shopId');

  if (!shopId) {
    window.location.href = 'floor.html';
    return;
  }

  try {
    // Fetch products for the selected shop
    const productQuery = query(collection(db, 'products'), where('shopId', '==', shopId));
    const productSnapshot = await getDocs(productQuery);
    if (productSnapshot.empty) {
      console.log('No products found for the selected shop.');
    }
    productSnapshot.forEach(doc => {
      const product = doc.data();
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item';
      listItem.innerHTML = `
        <h4>${product.productName}</h4>
        <p>Price: $${product.productPrice}</p>
        <p>${product.productDescription}</p>
        <img src="http://localhost:5000/uploads/${product.productImage}" alt="${product.productName}" class="img-fluid">
        <button class="btn btn-primary add-to-cart" data-product-id="${doc.id}">Add to Cart</button>
      `;
      productList.appendChild(listItem);
    });

    // Add event listener to 'Add to Cart' buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
      button.addEventListener('click', async (e) => {
        const productId = e.target.getAttribute('data-product-id');
        await addToCart(productId);
      });
    });
  } catch (error) {
    console.error('Error fetching products:', error);
  }

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

async function addToCart(productId) {
  const user = auth.currentUser;
  if (!user) {
    alert('Please log in to add items to your cart.');
    return;
  }

  try {
    const cartItemRef = doc(db, 'carts', user.uid, 'items', productId);
    await setDoc(cartItemRef, {
      productId,
      quantity: 1,
    }, { merge: true });
    console.log('Product added to cart:', productId);
    alert('Product added to cart successfully!');
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
}