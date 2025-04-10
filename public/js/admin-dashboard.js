import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  console.log("Admin Dashboard Loaded");

  // Metrics Section
  await updateMetrics();

  // Graphical Insights
  const salesChartCtx = document.getElementById('salesChart').getContext('2d');
  const revenueChartCtx = document.getElementById('revenueChart').getContext('2d');
  renderLineChart(salesChartCtx, 'Sales Trends');
  renderLineChart(revenueChartCtx, 'Revenue Trends');

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
function renderPendingShops(shops) {
  const container = document.getElementById('pending-shops');
  container.innerHTML = '';
  if (shops.length === 0) {
    container.innerHTML = '<p>No pending shops for approval.</p>';
    return;
  }
  shops.forEach((shop) => {
    const item = `
      <div class="list-group-item">
        <h5>${shop.shopName}</h5>
        <p>${shop.shopDescription}</p>
        <button class="btn btn-success" onclick="approveShop('${shop.id}')">Approve</button>
        <button class="btn btn-danger" onclick="rejectShop('${shop.id}')">Reject</button>
      </div>`;
    container.insertAdjacentHTML('beforeend', item);
  });
}

// Approve Shop
window.approveShop = async function (shopId) {
  try {
    const shopRef = doc(db, 'shops', shopId);
    await updateDoc(shopRef, { approved: true });
    alert('Shop approved!');
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
    const q = query(collection(db, 'shops'), where('approved', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching featured shops:', error);
    return [];
  }
}

// Render Featured Shops
function renderFeaturedShops(shops) {
  const container = document.getElementById('featured-shops');
  container.innerHTML = '';
  if (shops.length === 0) {
    container.innerHTML = '<p>No approved shops available to feature.</p>';
    return;
  }

  shops.forEach((shop) => {
    const isFeatured = shop.featured === true;
    const item = `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <h5>${shop.shopName}</h5>
          <p>${shop.shopDescription || ''}</p>
        </div>
        <button class="btn ${isFeatured ? 'btn-warning' : 'btn-primary'}" onclick="toggleFeaturedShop('${shop.id}', ${isFeatured})">
          ${isFeatured ? 'Unfeature' : 'Feature'}
        </button>
      </div>`;
    container.insertAdjacentHTML('beforeend', item);
  });
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

// Render Users
function renderUsers(users) {
  const container = document.getElementById('user-management-list');
  container.innerHTML = '';
  if (users.length === 0) {
    container.innerHTML = '<p>No users available.</p>';
    return;
  }
  users.forEach((user) => {
    const item = `
      <div class="list-group-item">
        <h5>${user.email}</h5>
        <p>Role: ${user.role || 'N/A'}</p>
        <button class="btn btn-danger" onclick="deleteUser('${user.id}')">Delete</button>
      </div>`;
    container.insertAdjacentHTML('beforeend', item);
  });
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

// Render Line Chart
function renderLineChart(ctx, label) {
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['January', 'February', 'March', 'April'],
      datasets: [
        {
          label,
          data: [10, 20, 30, 40],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
      ],
    },
    options: { responsive: true },
  });
}
