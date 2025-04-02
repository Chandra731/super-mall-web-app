import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const orderList = document.getElementById('order-list');

  const fetchOrders = async () => {
    const userId = auth.currentUser.uid;
    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const ordersSnapshot = await getDocs(ordersQuery);

    orderList.innerHTML = '';
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item';
      listItem.innerHTML = `
        <h4>Order ID: ${doc.id}</h4>
        <p>Status: ${order.status}</p>
        <p>Total Amount: $${order.totalAmount}</p>
        <p>Placed on: ${new Date(order.timestamp.toDate()).toLocaleString()}</p>
        <ul>
          ${order.products.map(product => `<li>${product.name} - Quantity: ${product.quantity} - Price: $${product.price}</li>`).join('')}
        </ul>
      `;
      orderList.appendChild(listItem);
    });
  };

  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchOrders();
    } else {
      window.location.href = 'login.html';
    }
  });
});