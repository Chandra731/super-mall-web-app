import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const cartList = document.getElementById('cart-list');
  const checkoutButton = document.getElementById('checkout-button');
  let cartData = [];

  const fetchCartItems = async () => {
    const userId = auth.currentUser.uid;
    const cartRef = doc(db, 'carts', userId);
    const cartDoc = await getDoc(cartRef);

    if (cartDoc.exists) {
      cartData = cartDoc.data().products;
      cartList.innerHTML = '';
      for (const item of cartData) {
        const productRef = doc(db, 'products', item.id);
        const productDoc = await getDoc(productRef);
        const product = productDoc.data();

        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
          <h4>${product.productName}</h4>
          <p>Price: $${product.productPrice}</p>
          <p>Quantity: <input type="number" value="${item.quantity}" min="1" class="quantity-input" data-id="${item.id}"></p>
          <button class="btn btn-danger remove-button" data-id="${item.id}">Remove</button>
        `;
        cartList.appendChild(listItem);
      }
    } else {
      cartList.innerHTML = '<p>Your cart is empty.</p>';
    }
  };

  document.addEventListener('click', async (event) => {
    if (event.target.classList.contains('remove-button')) {
      const productId = event.target.getAttribute('data-id');
      cartData = cartData.filter(item => item.id !== productId);
      await updateDoc(doc(db, 'carts', auth.currentUser.uid), { products: cartData });
      fetchCartItems();
    }
  });

  document.addEventListener('change', async (event) => {
    if (event.target.classList.contains('quantity-input')) {
      const productId = event.target.getAttribute('data-id');
      const newQuantity = parseInt(event.target.value, 10);
      const item = cartData.find(item => item.id === productId);
      if (item) {
        item.quantity = newQuantity;
        await updateDoc(doc(db, 'carts', auth.currentUser.uid), { products: cartData });
      }
    }
  });

  checkoutButton.addEventListener('click', async () => {
    const userId = auth.currentUser.uid;
    const ordersRef = collection(db, 'orders');
    try {
      await addDoc(ordersRef, {
        userId,
        products: cartData,
        status: 'Processing',
        timestamp: serverTimestamp()
      });
      await deleteDoc(doc(db, 'carts', userId));
      alert('Order placed successfully!');
      window.location.href = 'orders.html';
    } catch (error) {
      console.error('Error placing order:', error.message);
    }
  });

  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchCartItems();
    } else {
      window.location.href = 'login.html';
    }
  });
});