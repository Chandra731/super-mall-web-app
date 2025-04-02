import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, getDocs, updateDoc, query, where, collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const salesChartCtx = document.getElementById('salesChart').getContext('2d');
  const inventoryChartCtx = document.getElementById('inventoryChart').getContext('2d');
  const pendingShopsContainer = document.getElementById('pending-shops');

  // Fetch data for sales chart
  const salesData = await fetchSalesData();
  renderSalesChart(salesChartCtx, salesData);

  // Fetch data for inventory chart
  const inventoryData = await fetchInventoryData();
  renderInventoryChart(inventoryChartCtx, inventoryData);

  // Fetch and render pending shops
  const pendingShops = await fetchPendingShops();
  renderPendingShops(pendingShops);
});

async function fetchSalesData() {
  try {
    const response = await fetch('/api/sales');
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

document.getElementById('logout').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
  }
});