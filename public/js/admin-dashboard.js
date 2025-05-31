import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  console.log("Admin Dashboard Loaded");

  // Verify admin status before proceeding
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!(userDoc.data().role === 'admin' || userDoc.data().isAdmin === true)) {
      alert('You do not have admin privileges');
      window.location.href = 'index.html';
      return;
    }

    // Metrics Section
    await updateMetrics();

    // Load and render dynamic sales and revenue charts
    await loadSalesAndRevenueData();

    // Shop Approval System
    const pendingShops = await fetchPendingShops();
    renderPendingShops(pendingShops);

    // Featured Shops System
    const approvedShops = await fetchFeaturedShops();
    renderFeaturedShops(approvedShops);

    // User Management Section
    const users = await fetchUsers();
    renderUsers(users);

    // Logout Event
    document.getElementById('logout').addEventListener('click', async () => {
      await signOut(auth);
      console.log("User logged out successfully");
      window.location.href = 'login.html';
    });
  });
});

// Fetch and Update Metrics
async function updateMetrics() {
  try {
    console.log("Fetching metrics...");

    // Fetch shop count
    const shopsSnapshot = await getDocs(collection(db, 'shops'));
    const totalShops = shopsSnapshot.size;
    document.getElementById('total-shops').textContent = totalShops;

    // Fetch product count
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const totalProducts = productsSnapshot.size;
    document.getElementById('total-products').textContent = totalProducts;

    // Fetch user count
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;
    document.getElementById('total-users').textContent = totalUsers;
  } catch (error) {
    console.error('Error fetching metrics:', error);
  }
}

// Fetch Pending Shops
async function fetchPendingShops() {
  try {
    const q = query(collection(db, 'shops'), where('approved', '==', false));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching pending shops:', error);
    return [];
  }
}

// Render Pending Shops
function renderPendingShops(shops, showAll = false) {
  const container = document.getElementById('pending-shops');
  container.innerHTML = '';

  if (shops.length === 0) {
    container.innerHTML = '<p>No pending shops for approval.</p>';
    return;
  }

  const shopsToShow = showAll ? shops : shops.slice(0, 3);

  shopsToShow.forEach((shop) => {
    const imageUrl = (Array.isArray(shop.shopImageUrls) && shop.shopImageUrls.length > 0)
      ? shop.shopImageUrls[0]
      : shop.shopImage || 'public/images/default-shop.jpg';

    console.log('Pending shop image URL:', imageUrl);

    const item = `
      <div class="shop-card">
        <div class="shop-image-container">
          <img src="${imageUrl}" alt="${shop.name}" class="shop-image" 
               onerror="this.src='public/images/default-shop.jpg'">
        </div>
        <div class="shop-details">
          <h5>${shop.name}</h5>
          <p>${shop.description}</p>
          <p><strong>Owner:</strong> ${shop.ownerName}</p>
          <p><strong>Category:</strong> ${shop.category}</p>
          <div class="shop-actions">
            <button class="btn btn-success" onclick="approveShop('${shop.id}')">Approve</button>
            <button class="btn btn-danger" onclick="rejectShop('${shop.id}')">Reject</button>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', item);
  });

  if (!showAll && shops.length > 3) {
    const showMoreBtn = document.createElement('button');
    showMoreBtn.textContent = 'Show All Pending Shops';
    showMoreBtn.className = 'btn btn-primary mt-2';
    showMoreBtn.addEventListener('click', () => {
      renderPendingShops(shops, true);
    });
    container.appendChild(showMoreBtn);
  }
}

// Approve Shop
window.approveShop = async function (shopId) {
  try {
    const shopRef = doc(db, 'shops', shopId);
    const shopDoc = await getDoc(shopRef);
    if (!shopDoc.exists()) {
      alert('Shop not found');
      return;
    }
    const shopData = shopDoc.data();

    await updateDoc(shopRef, { 
      approved: true,
      status: 'approved',
      approvedAt: new Date() 
    });

    // Update the owner's user document correctly
    if (shopData.ownerId) {
      const ownerRef = doc(db, 'users', shopData.ownerId);
      await updateDoc(ownerRef, {
        hasApprovedShop: true
      });
    }

    alert('Shop approved! Owner can now access their dashboard.');
    const pendingShops = await fetchPendingShops();
    renderPendingShops(pendingShops);
    const approvedShops = await fetchFeaturedShops();
    renderFeaturedShops(approvedShops);
  } catch (error) {
    console.error('Error approving shop:', error);
  }
};

// Reject Shop
window.rejectShop = async function (shopId) {
  try {
    const shopRef = doc(db, 'shops', shopId);
    await deleteDoc(shopRef);
    alert('Shop rejected!');
    const pendingShops = await fetchPendingShops();
    renderPendingShops(pendingShops);
  } catch (error) {
    console.error('Error rejecting shop:', error);
  }
};

// Fetch Approved Shops (for Featured Section)
async function fetchFeaturedShops() {
  try {
    const q = query(collection(db, 'shops'), where('status', '==', 'approved'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching featured shops:', error);
    return [];
  }
}

// Render Featured Shops
function renderFeaturedShops(shops, showAll = false) {
  const container = document.getElementById('featured-shops');
  container.innerHTML = '';

  if (shops.length === 0) {
    container.innerHTML = '<p>No approved shops available to feature.</p>';
    return;
  }

  const shopsToShow = showAll ? shops : shops.slice(0, 3);

  shopsToShow.forEach((shop) => {
    const isFeatured = shop.featured === true;
    const imageUrl = (Array.isArray(shop.shopImageUrls) && shop.shopImageUrls.length > 0)
      ? shop.shopImageUrls[0]
      : shop.shopImage || 'public/images/default-shop.jpg';

    console.log('Featured shop image URL:', imageUrl);

    const item = `
      <div class="shop-card">
        <div class="shop-image-container">
          <img src="${imageUrl}" alt="${shop.name}" class="shop-image"
               onerror="this.src='public/images/default-shop.jpg'">
        </div>
        <div class="shop-details">
          <h5>${shop.name}</h5>
          <p>${shop.description || 'No description available'}</p>
          <p><strong>Status:</strong> ${shop.status || 'Active'}</p>
          <div class="shop-actions">
            <button class="btn ${isFeatured ? 'btn-warning' : 'btn-primary'}"
                    onclick="toggleFeaturedShop('${shop.id}', ${isFeatured})">
              ${isFeatured ? 'Unfeature' : 'Feature'}
            </button>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', item);
  });

  if (!showAll && shops.length > 3) {
    const showMoreBtn = document.createElement('button');
    showMoreBtn.textContent = 'Show All Featured Shops';
    showMoreBtn.className = 'btn btn-primary mt-2';
    showMoreBtn.addEventListener('click', () => {
      renderFeaturedShops(shops, true);
    });
    container.appendChild(showMoreBtn);
  }
}

// Toggle Featured Shop
window.toggleFeaturedShop = async function (shopId, currentlyFeatured) {
  try {
    const shopRef = doc(db, 'shops', shopId);
    await updateDoc(shopRef, { featured: !currentlyFeatured });
    alert(`Shop ${currentlyFeatured ? 'unfeatured' : 'featured'} successfully!`);
    const approvedShops = await fetchFeaturedShops();
    renderFeaturedShops(approvedShops);
  } catch (error) {
    console.error('Error toggling featured status:', error);
  }
};

// Fetch Users
async function fetchUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Render Users and Shop Owners separately with pagination and scroll
function renderUsers(users) {
  const userContainer = document.getElementById('user-management-list');
  const shopOwnerContainer = document.getElementById('shop-owner-management-list');

  userContainer.innerHTML = '';
  shopOwnerContainer.innerHTML = '';

  if (users.length === 0) {
    userContainer.innerHTML = '<p>No users available.</p>';
    shopOwnerContainer.innerHTML = '<p>No shop owners available.</p>';
    return;
  }

  // Separate users and shop owners by checking role string case-insensitively
  const normalUsers = users.filter(u => {
    const role = (u.role || '').toLowerCase();
    return role !== 'shop-owner' && role !== 'shopowner' && role !== 'owner';
  });
  const shopOwners = users.filter(u => {
    const role = (u.role || '').toLowerCase();
    return role === 'shop-owner' || role === 'shopowner' || role === 'owner';
  });

  // Helper to create table with scroll and pagination
  function createTable(container, data, title) {
    if (data.length === 0) {
      container.innerHTML = `<p>No ${title.toLowerCase()} available.</p>`;
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.style.maxHeight = '300px';
    tableWrapper.style.overflowY = 'auto';
    tableWrapper.style.border = '1px solid #ddd';
    tableWrapper.style.borderRadius = '4px';

    const table = document.createElement('table');
    table.className = 'table table-striped table-sm mb-0';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Email</th>
        <th>Role</th>
        <th>Actions</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // Pagination variables
    let currentPage = 1;
    const rowsPerPage = 5;
    const totalPages = Math.ceil(data.length / rowsPerPage);

    function renderPage(page) {
      tbody.innerHTML = '';
      const start = (page - 1) * rowsPerPage;
      const end = Math.min(start + rowsPerPage, data.length);
      for (let i = start; i < end; i++) {
        const user = data[i];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.email}</td>
          <td>${user.role || 'N/A'}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')">Delete</button></td>
        `;
        tbody.appendChild(tr);
      }
    }

    // Pagination controls
    const pagination = document.createElement('div');
    pagination.className = 'mt-2 d-flex justify-content-center';

    function createPageButton(page) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline-primary btn-sm mx-1';
      btn.textContent = page;
      if (page === currentPage) {
        btn.disabled = true;
      }
      btn.addEventListener('click', () => {
        currentPage = page;
        renderPage(currentPage);
        updatePagination();
      });
      return btn;
    }

    function updatePagination() {
      pagination.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        pagination.appendChild(createPageButton(i));
      }
    }

    container.appendChild(pagination);

    renderPage(currentPage);
    updatePagination();
  }

  createTable(userContainer, normalUsers, 'Users');
  createTable(shopOwnerContainer, shopOwners, 'Shop Owners');
}

// Delete User
window.deleteUser = async function (userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    alert('User deleted!');
    const users = await fetchUsers();
    renderUsers(users);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

// Render Line Chart with dynamic data
let salesChartInstance = null;
let revenueChartInstance = null;

async function loadSalesAndRevenueData() {
  try {
    // Fetch all shops
    const shopsSnapshot = await getDocs(collection(db, 'shops'));
    const shops = shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Prepare data structures
    const shopSales = {};
    const shopRevenue = {};
    const overallSalesByMonth = {};
    const overallRevenueByMonth = {};

    // Initialize shop data
    shops.forEach(shop => {
      shopSales[shop.id] = 0;
      shopRevenue[shop.id] = 0;
    });

    // Fetch all orders
    const ordersSnapshot = await getDocs(collection(db, 'orders'));

    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      if (order.status === 'paid' || order.status === 'delivered') {
        const shopId = order.shopId;
        const total = order.total || 0;
        shopSales[shopId] = (shopSales[shopId] || 0) + 1;
        shopRevenue[shopId] = (shopRevenue[shopId] || 0) + total;

        // Aggregate overall monthly data
        const createdAt = order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)) : new Date();
        const monthKey = createdAt.getFullYear() + '-' + String(createdAt.getMonth() + 1).padStart(2, '0');
        overallSalesByMonth[monthKey] = (overallSalesByMonth[monthKey] || 0) + 1;
        overallRevenueByMonth[monthKey] = (overallRevenueByMonth[monthKey] || 0) + total;
      }
    });

    // Prepare shop-wise sales and revenue arrays for chart
    const shopNames = shops.map(shop => shop.name || 'Unnamed Shop');
    const salesData = shops.map(shop => shopSales[shop.id] || 0);
    const revenueData = shops.map(shop => shopRevenue[shop.id] || 0);

    // Prepare overall monthly labels sorted
    const months = Object.keys(overallSalesByMonth).sort();
    const overallSalesData = months.map(m => overallSalesByMonth[m]);
    const overallRevenueData = months.map(m => overallRevenueByMonth[m]);

    // Render shop-wise sales chart
    const salesChartCtx = document.getElementById('salesChart').getContext('2d');
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(salesChartCtx, {
      type: 'bar',
      data: {
        labels: shopNames,
        datasets: [{
          label: 'Shop-wise Sales',
          data: salesData,
          backgroundColor: 'rgba(54, 162, 235, 0.7)'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // Render shop-wise revenue chart
    const revenueChartCtx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(revenueChartCtx, {
      type: 'bar',
      data: {
        labels: shopNames,
        datasets: [{
          label: 'Shop-wise Revenue (₹)',
          data: revenueData,
          backgroundColor: 'rgba(75, 192, 192, 0.7)'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // Render overall sales trend line chart
    renderLineChart('overallSalesChart', months, overallSalesData, 'Overall Sales Trend');

    // Render overall revenue trend line chart
    renderLineChart('overallRevenueChart', months, overallRevenueData, 'Overall Revenue Trend (₹)');

  } catch (error) {
    console.error('Error loading sales and revenue data:', error);
  }
}

function renderLineChart(canvasId, labels, data, label) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
