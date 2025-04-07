import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, getDocs, getDoc, setDoc, deleteDoc, query, where, collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import 'chartjs-adapter-date-fns'; // Add this line to import the date adapter

document.addEventListener('DOMContentLoaded', async function () {
  const salesChartCtx = document.getElementById('salesChart').getContext('2d');
  const inventoryChartCtx = document.getElementById('inventoryChart').getContext('2d');
  const selectShopsBtn = document.getElementById('select-shops-btn');

  // Fetch data for sales chart
  const salesData = await fetchSalesData();
  renderSalesChart(salesChartCtx, salesData);

  // Fetch data for inventory chart
  const inventoryData = await fetchInventoryData();
  renderInventoryChart(inventoryChartCtx, inventoryData);

  // Fetch and render pending shops
  const pendingShops = await fetchPendingShops();
  renderPendingShops(pendingShops);

  // Fetch and render users for user management
  const users = await fetchUsers();
  renderUsers(users);

  // Fetch and render featured shops
  const featuredShops = await fetchFeaturedShops();
  renderFeaturedShops(featuredShops);

  // Handle authentication state changes
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    }
  });

  // Logout functionality
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        alert('You have been logged out.');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Logout error:', error.message);
      }
    });
  }

  // Load shops and allow admin to select featured shops
  async function loadShops() {
    try {
      const querySnapshot = await getDocs(collection(db, 'shops'));
      const featuredShopsList = document.getElementById('featured-shops-list');
      featuredShopsList.innerHTML = '';
      querySnapshot.forEach((doc) => {
        const shopData = doc.data();
        const shopItem = `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h5>${shopData.shopName}</h5>
                <p>${shopData.shopDescription}</p>
              </div>
              <button class="btn btn-primary select-shop-btn" data-id="${doc.id}">Select</button>
            </div>
          </div>
        `;
        featuredShopsList.insertAdjacentHTML('beforeend', shopItem);
      });

      document.querySelectorAll('.select-shop-btn').forEach(button => {
        button.addEventListener('click', selectShop);
      });
    } catch (error) {
      console.error('Error loading shops:', error.message);
    }
  }

  async function selectShop(event) {
    const shopId = event.target.getAttribute('data-id');
    try {
      const shopDoc = await getDoc(doc(db, 'shops', shopId));
      if (shopDoc.exists()) {
        await setDoc(doc(db, 'featuredShops', shopId), shopDoc.data());
        alert('Shop selected as featured!');
        // Refresh the list of featured shops
        const featuredShops = await fetchFeaturedShops();
        renderFeaturedShops(featuredShops);
      }
    } catch (error) {
      console.error('Error selecting shop:', error.message);
    }
  }

  if (selectShopsBtn) {
    selectShopsBtn.addEventListener('click', loadShops);
  }
});

async function fetchSalesData() {
  try {
    const response = await fetch('/api/sales');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return [];
  }
}

async function fetchInventoryData() {
  try {
    const response = await fetch('/api/inventory');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching inventory data:', error);
    return [];
  }
}

async function fetchPendingShops() {
  try {
    const q = query(collection(db, 'shops'), where('approved', '==', false));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching pending shops:', error);
    return [];
  }
}

async function fetchUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function fetchFeaturedShops() {
  try {
    const querySnapshot = await getDocs(collection(db, 'featuredShops'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching featured shops:', error);
    return [];
  }
}

function renderSalesChart(ctx, data) {
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(item => item.date),
      datasets: [{
        label: 'Sales',
        data: data.map(item => item.sales),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderInventoryChart(ctx, data) {
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(item => item.productName),
      datasets: [{
        label: 'Inventory',
        data: data.map(item => item.stock),
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          beginAtZero: true
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderPendingShops(shops) {
  const container = document.getElementById('pending-shops');
  container.innerHTML = '';
  shops.forEach(shop => {
    const listItem = document.createElement('div');
    listItem.className = 'list-group-item';
    listItem.innerHTML = `
      <h5>${shop.name}</h5>
      <p>${shop.description}</p>
      <button class="btn btn-success" onclick="approveShop('${shop.id}')">Approve</button>
      <button class="btn btn-danger" onclick="rejectShop('${shop.id}')">Reject</button>
    `;
    container.appendChild(listItem);
  });
}

function renderUsers(users) {
  const container = document.getElementById('user-management-list');
  container.innerHTML = '';
  users.forEach(user => {
    const listItem = document.createElement('div');
    listItem.className = 'list-group-item';
    listItem.innerHTML = `
      <h5>${user.email}</h5>
      <p>Role: ${user.role}</p>
      <button class="btn btn-danger" onclick="deleteUser('${user.id}')">Delete</button>
    `;
    container.appendChild(listItem);
  });
}

function renderFeaturedShops(shops) {
  const container = document.getElementById('featured-shops-list');
  container.innerHTML = '';
  shops.forEach(shop => {
    const listItem = document.createElement('div');
    listItem.className = 'list-group-item';
    listItem.innerHTML = `
      <h5>${shop.name}</h5>
      <p>${shop.description}</p>
    `;
    container.appendChild(listItem);
  });
}

async function approveShop(shopId) {
  try {
    const shopRef = doc(db, 'shops', shopId);
    await updateDoc(shopRef, { approved: true });
    // Refresh the list of pending shops
    const pendingShops = await fetchPendingShops();
    renderPendingShops(pendingShops);
  } catch (error) {
    console.error('Error approving shop:', error);
  }
}

async function rejectShop(shopId) {
  try {
    const shopRef = doc(db, 'shops', shopId);
    await deleteDoc(shopRef);
    // Refresh the list of pending shops
    const pendingShops = await fetchPendingShops();
    renderPendingShops(pendingShops);
  } catch (error) {
    console.error('Error rejecting shop:', error);
  }
}

async function deleteUser(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    // Refresh the list of users
    const users = await fetchUsers();
    renderUsers(users);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
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