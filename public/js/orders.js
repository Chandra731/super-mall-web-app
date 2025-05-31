import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, query, where,addDoc, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

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
                order.items.map(product => {
let imageUrl = product.imageUrl || product.image || '';
if (imageUrl) {
  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/') && !imageUrl.startsWith('uploads/')) {
    imageUrl = 'uploads/product-images/' + imageUrl;
  }
} else {
  imageUrl = 'placeholder.jpg';
}
          return `
          <div class="order-product-item d-flex align-items-center mb-2">
            <img src="${imageUrl}" 
                class="mr-3" style="width: 50px; height: 50px; object-fit: cover;"
                alt="${product.name || 'Unknown product'}"
                onerror="this.src='public/images/default-product.jpg';">
            <div>
              <h6>${product.name || 'Unknown product'}</h6>
              <div>Quantity: ${product.quantity || 0}</div>
              <div>Price: ₹${product.price ? product.price.toFixed(2) : '0.00'}</div>
          <button class="btn btn-sm btn-outline-primary mt-1 review-btn" data-product-id="${product.productId || product.id || ''}">Write a Review</button>
          <div class="review-form-container mt-2" style="display:none;">
            <form class="review-form">
              <div class="mb-2">
                <label>Rating:</label>
                <select class="form-select form-select-sm rating-select" required>
                  <option value="" disabled selected>Select rating</option>
                  <option value="1">1 ⭐</option>
                  <option value="2">2 ⭐⭐</option>
                  <option value="3">3 ⭐⭐⭐</option>
                  <option value="4">4 ⭐⭐⭐⭐</option>
                  <option value="5">5 ⭐⭐⭐⭐⭐</option>
                </select>
              </div>
              <div class="mb-2">
                <label>Review:</label>
                <textarea class="form-control form-control-sm review-text" rows="2" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-sm submit-review-btn">Submit Review</button>
              <button type="button" class="btn btn-secondary btn-sm cancel-review-btn">Cancel</button>
            </form>
          </div>
            </div>
          </div>
          `;
                }).join('') : '<p>No products available</p>'}
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

  // Event delegation for review button and form actions
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('review-btn')) {
      const container = e.target.closest('.order-product-item').querySelector('.review-form-container');
      if (container) {
        container.style.display = 'block';
        e.target.style.display = 'none';
      }
    } else if (e.target.classList.contains('cancel-review-btn')) {
      const container = e.target.closest('.review-form-container');
      if (container) {
        container.style.display = 'none';
        const reviewBtn = container.closest('.order-product-item').querySelector('.review-btn');
        if (reviewBtn) reviewBtn.style.display = 'inline-block';
      }
    }
  });

  // Event delegation for review form submission
  document.addEventListener('submit', async (e) => {
    if (e.target.classList.contains('review-form')) {
      e.preventDefault();
      const form = e.target;
      const container = form.closest('.review-form-container');
      const ratingSelect = form.querySelector('.rating-select');
      const reviewText = form.querySelector('.review-text');
      const productId = form.closest('.order-product-item').querySelector('.review-btn').getAttribute('data-product-id');

      if (!ratingSelect.value || !reviewText.value.trim()) {
        alert('Please provide both rating and review text.');
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          alert('You must be logged in to submit a review.');
          return;
        }
        await addDoc(collection(db, 'reviews'), {
          userId: user.uid,
          productId,
          rating: parseInt(ratingSelect.value),
          review: reviewText.value.trim(),
          timestamp: new Date(),
        });
        alert('Review submitted successfully!');
        // Hide form and show review button again
        container.style.display = 'none';
        const reviewBtn = form.closest('.order-product-item').querySelector('.review-btn');
        if (reviewBtn) reviewBtn.style.display = 'inline-block';
        // Clear form fields
        ratingSelect.value = '';
        reviewText.value = '';
      } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review. Please try again.');
      }
    }
  });
});
