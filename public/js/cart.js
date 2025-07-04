import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  query,
  getDocs,
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

let orderItems = [];
let total = 0;
let itemCount = 0;

document.addEventListener('DOMContentLoaded', function () {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadCartItems(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });
});

// Load cart items
async function loadCartItems(userId) {
  const cartItemsList = document.getElementById('cart-list');
  cartItemsList.innerHTML = '';
  total = 0;
  itemCount = 0;

  try {
    const cartQuery = query(collection(db, 'carts', userId, 'items'));
    const cartSnapshot = await getDocs(cartQuery);

    if (cartSnapshot.empty) {
      cartItemsList.innerHTML = '<li class="list-group-item">Your cart is empty.</li>';
      updateTotalDisplay();
      return;
    }

    for (const cartDoc of cartSnapshot.docs) {
      const cartItem = cartDoc.data();
      const cartItemId = cartDoc.id;
      
      const productDoc = await getDoc(doc(db, 'products', cartItem.productId));
      
      if (productDoc.exists()) {
        const product = productDoc.data();
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-start flex-column flex-md-row';

        const itemTotal = product.price * cartItem.quantity;
        total += itemTotal;
        itemCount += cartItem.quantity;

        listItem.innerHTML = `
          <div>
            <h5>${product.name}</h5>
            <p>Price: ₹${product.price}</p>
            <div class="d-flex align-items-center">
              <button class="btn btn-sm btn-secondary me-2 decrease-btn" data-id="${cartItemId}">-</button>
              <span class="quantity-text">${cartItem.quantity}</span>
              <button class="btn btn-sm btn-secondary ms-2 increase-btn" data-id="${cartItemId}">+</button>
            </div>
            <p class="mt-2">Item Total: ₹<span class="item-total">${itemTotal.toFixed(2)}</span></p>
            <button class="btn btn-sm btn-danger delete-btn mt-2" data-id="${cartItemId}">Delete</button>
          </div>
          <img src="${product.imageUrl}" alt="${product.name}" class="img-fluid" style="max-width: 200px;">
        `;
        listItem.dataset.price = product.price;
        listItem.dataset.productId = cartItem.productId;

        cartItemsList.appendChild(listItem);
      }
    }

    updateTotalDisplay();
    attachEventListeners(userId);
  } catch (error) {
    console.error('Error loading cart items:', error);
    cartItemsList.innerHTML = '<li class="list-group-item">Error loading cart items.</li>';
  }
}

function updateTotalDisplay() {
  const totalContainer = document.getElementById('cart-total');
  if (totalContainer) {
    totalContainer.innerHTML = `
      <strong>Total Items:</strong> ${itemCount}<br>
      <strong>Total Price:</strong> ₹${total.toFixed(2)}
    `;
  }
}

// Attach quantity and delete handlers
function attachEventListeners(userId) {
  document.querySelectorAll('.increase-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const itemRef = doc(db, 'carts', userId, 'items', id);
      const itemSnap = await getDoc(itemRef);
      if (itemSnap.exists()) {
        const data = itemSnap.data();
        const newQuantity = data.quantity + 1;
        await updateDoc(itemRef, { quantity: newQuantity });
        loadCartItems(userId);
      }
    });
  });

  document.querySelectorAll('.decrease-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const itemRef = doc(db, 'carts', userId, 'items', id);
      const itemSnap = await getDoc(itemRef);
      if (itemSnap.exists()) {
        const data = itemSnap.data();
        const newQuantity = data.quantity - 1;
        if (newQuantity > 0) {
          await updateDoc(itemRef, { quantity: newQuantity });
        } else {
          await deleteDoc(itemRef);
        }
        loadCartItems(userId);
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await deleteDoc(doc(db, 'carts', userId, 'items', id));
      loadCartItems(userId);
    });
  });
}

// Logout
document.getElementById('logout').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// Checkout button
document.getElementById('checkout-button').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  const cartQuery = query(collection(db, 'carts', user.uid, 'items'));
  const cartSnapshot = await getDocs(cartQuery);

  if (cartSnapshot.empty) {
    alert('Your cart is empty. Please add items before checkout.');
    return;
  }

    orderItems = [];
    total = 0;
    itemCount = 0;

    for (const cartDoc of cartSnapshot.docs) {
      const cartItem = cartDoc.data();
      const productDoc = await getDoc(doc(db, 'products', cartItem.productId));
      
      if (!productDoc.exists()) {
        alert(`Product ${cartItem.productId} no longer exists. Please remove it from your cart.`);
        return;
      }

      const product = productDoc.data();
      total += product.price * cartItem.quantity;
      itemCount += cartItem.quantity;
      orderItems.push({
        productId: cartItem.productId,
        name: product.name,
        price: product.price,
        quantity: cartItem.quantity,
        image: product.imageUrl,
        shopId: product.shopId || null
      });
    }

    document.getElementById('checkout-summary').innerHTML = `
      <strong>Total Items:</strong> ${itemCount}<br>
      <strong>Total Price:</strong> ₹${total.toFixed(2)}
    `;
    $('#checkoutModal').modal('show');
});

document.getElementById('pay-now-button').addEventListener('click', async () => {
  if (orderItems.length === 0) {
    alert("No items in order. Cannot proceed to payment.");
    return;
  }
  // Save order data to sessionStorage and redirect to payment page
  const orderData = {
    id: null, // Will be created after payment
    items: orderItems,
    total: total
  };
  sessionStorage.setItem('orderData', JSON.stringify(orderData));
  $('#checkoutModal').modal('hide');
  window.location.href = 'payment.html';
});
