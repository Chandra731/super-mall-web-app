import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const orderList = document.getElementById('order-list');

  const applyFilters = async () => {
    try {
      console.log('Fetching orders...');
      const user = auth.currentUser;
      if (!user) {
        console.error('No user logged in');
        return;
      }
      const userId = user.uid;

      // Get all orders for the user first
      let ordersQuery = query(collection(db, 'orders'), 
        where('userId', '==', userId));
      
      const ordersSnapshot = await getDocs(ordersQuery);
      let orders = [];
      
      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();
        console.log('Raw order data:', orderData); // Log raw data for debugging
          orders.push({
          id: doc.id,
          status: orderData.status || 'unknown',
          total: orderData.total || 0,
          createdAt: orderData.createdAt || null,
          items: Array.isArray(orderData.items) ? orderData.items : []
        });
      });

      // Apply filters and sorting client-side
      // Status filter
      const statusFilter = document.getElementById('status-filter')?.value;
      if (statusFilter) {
        orders = orders.filter(order => order.status === statusFilter);
      }

      // Date range filter
      const dateFrom = document.getElementById('date-from')?.value;
      const dateTo = document.getElementById('date-to')?.value;
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        orders = orders.filter(order => order.createdAt.toDate() >= fromDate);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        orders = orders.filter(order => order.createdAt.toDate() <= toDate);
      }

      // Sort by createdAt (newest first)
      orders.sort((a, b) => b.createdAt - a.createdAt);

      const orderList = document.getElementById('order-list');
      if (!orderList) {
        console.error('Order list element not found');
        return;
      }

      orderList.innerHTML = '';
      console.log(`Found ${orders.length} orders`);
      
      if (orders.length === 0) {
        console.log('No orders found');
        const noOrders = document.getElementById('no-orders');
        if (noOrders) noOrders.style.display = 'block';
        return;
      }
      
      const noOrders = document.getElementById('no-orders');
      if (noOrders) noOrders.style.display = 'none';
      
      orders.forEach(order => {
        try {
          const listItem = document.createElement('li');
          listItem.className = 'list-group-item';
          listItem.innerHTML = `
            <h4>Order ID: ${order.id}</h4>
            <p>Status: ${order.status}</p>
            <p>Total Amount: ₹${order.total ? order.total.toFixed(2) : '0.00'}</p>
            <p>Placed on: ${order.createdAt ? new Date(order.createdAt.toDate()).toLocaleString() : 'Unknown date'}</p>
            <div class="order-products">
              ${order.items && order.items.length > 0 ? 
                order.items.map(product => `
                  <div class="order-product-item d-flex align-items-center mb-2">
                    <img src="${product.imageUrl || 'placeholder.jpg'}" 
                        class="mr-3" style="width: 50px; height: 50px; object-fit: cover;"
                        alt="${product.name || 'Unknown product'}">
                    <div>
                      <h6>${product.name || 'Unknown product'}</h6>
                      <div>Quantity: ${product.quantity || 0}</div>
                      <div>Price: ₹${product.price ? product.price.toFixed(2) : '0.00'}</div>
                    </div>
                  </div>
                `).join('') : '<p>No products available</p>'}
            </div>
          `;
          orderList.appendChild(listItem);
        } catch (error) {
          console.error('Error rendering order:', error);
        }
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      const orderList = document.getElementById('order-list');
      if (orderList) {
        orderList.innerHTML = '<li class="list-group-item text-danger">Error loading orders. Please try again.</li>';
      }
    }
  };

  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // Set up filter event listeners
  document.getElementById('apply-filters').addEventListener('click', applyFilters);
  document.getElementById('reset-filters').addEventListener('click', () => {
    document.getElementById('status-filter').value = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    applyFilters();
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      applyFilters();
    } else {
      window.location.href = 'login.html';
    }
  });
});

  // Remove redundant logout functionality since we already have
  // the logout button handler above
