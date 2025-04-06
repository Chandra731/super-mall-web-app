import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, query, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function () {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadCartItems(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });
});

async function loadCartItems(userId) {
  const cartItemsList = document.getElementById('cart-list');
  cartItemsList.innerHTML = ''; // Clear the cart items list

  try {
    const cartQuery = query(collection(db, 'carts', userId, 'items'));
    const cartSnapshot = await getDocs(cartQuery);

    if (cartSnapshot.empty) {
      console.log('No items in cart for user:', userId);
      cartItemsList.innerHTML = '<li class="list-group-item">Your cart is empty.</li>';
      return;
    }

    console.log('Cart items fetched for user:', userId);
    for (const cartDoc of cartSnapshot.docs) {
      const cartItem = cartDoc.data();
      const productDoc = await getDoc(doc(db, 'products', cartItem.productId));

      if (productDoc.exists) {
        const product = productDoc.data();
        console.log('Product found:', product);
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
          <h4>${product.productName}</h4>
          <p>Price: $${product.productPrice}</p>
          <p>Quantity: ${cartItem.quantity}</p>
          <img src="http://localhost:5000/uploads/${product.productImage}" alt="${product.productName}" class="img-fluid">
        `;
        cartItemsList.appendChild(listItem);
      } else {
        console.log('Product not found for cart item:', cartItem.productId);
      }
    }
  } catch (error) {
    console.error('Error loading cart items:', error);
    cartItemsList.innerHTML = '<li class="list-group-item">Error loading cart items.</li>';
  }
}