import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

let currentShopId = null;
let salesChartInstance = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const shopQuery = query(collection(db, "shops"),
      where("ownerId", "==", user.uid),
      where("approved", "==", true));
    const shopSnapshot = await getDocs(shopQuery);

    if (shopSnapshot.empty) {
      alert("No approved shop found for user");
      return;
    }

    currentShopId = shopSnapshot.docs[0].id;

    await loadReportData('monthly'); // default filter

    await loadShopDetails();
    await loadProductDetails();
    await loadOrderSummary();
    await loadCustomerCount();

    setupFilterListeners();

  } catch (error) {
    console.error("Error loading shop data:", error);
    alert("Error loading shop data. Please try again or contact support.");
  }
});

async function loadReportData(filter) {
  try {
    const ordersQuery = query(collection(db, "orders"), where("shopId", "==", currentShopId));
    const ordersSnapshot = await getDocs(ordersQuery);

    let salesData = {};
    let now = new Date();

    // Initialize salesData keys based on filter
    if (filter === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        let d = new Date(now);
        d.setDate(now.getDate() - i);
        let key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        salesData[key] = 0;
      }
    } else if (filter === 'monthly') {
      for (let i = 11; i >= 0; i--) {
        let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        let key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        salesData[key] = 0;
      }
    } else if (filter === 'yearly') {
      for (let i = 4; i >= 0; i--) {
        let y = now.getFullYear() - i;
        salesData[y] = 0;
      }
    }

    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === "paid" || data.status === "delivered") {
        let createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date();
        let key = '';
        if (filter === 'weekly') {
          key = createdAt.toISOString().slice(0, 10);
        } else if (filter === 'monthly') {
          key = createdAt.getFullYear() + '-' + String(createdAt.getMonth() + 1).padStart(2, '0');
        } else if (filter === 'yearly') {
          key = createdAt.getFullYear();
        }
        if (key in salesData) {
          salesData[key] += data.total;
        }
      }
    });

    renderSalesChart(salesData, filter);
  } catch (error) {
    console.error("Error loading report data:", error);
  }
}

function renderSalesChart(salesData, filter) {
  const canvas = document.getElementById("salesReportChart");
  if (!canvas) {
    console.error("Canvas element with id 'salesReportChart' not found.");
    return;
  }
  const ctx = canvas.getContext("2d");

  const labels = Object.keys(salesData);
  const data = Object.values(salesData);

  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sales',
        data: data,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Sales Report (${filter.charAt(0).toUpperCase() + filter.slice(1)})`
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: filter === 'weekly' ? 'Date' : filter === 'monthly' ? 'Month' : 'Year'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Sales Amount (₹)'
          },
          beginAtZero: true
        }
      }
    }
  });
}

function setupFilterListeners() {
  const filterSelect = document.getElementById('report-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      loadReportData(e.target.value);
    });
  }
}

async function loadShopDetails() {
  try {
    const shopDoc = await getDoc(doc(db, "shops", currentShopId));
    if (!shopDoc.exists()) {
      console.warn("Shop document not found");
      return;
    }
    const shopData = shopDoc.data();
    displayShopDetails(shopData);
  } catch (error) {
    console.error("Error loading shop details:", error);
  }
}

function displayShopDetails(shopData) {
  const container = document.getElementById('shop-details');
  if (!container) return;
  container.innerHTML = `
    <h2>Shop Details</h2>
    <table class="table table-bordered">
      <tbody>
        <tr><th>Name</th><td>${shopData.name || 'N/A'}</td></tr>
        <tr><th>Address</th><td>${shopData.address || 'N/A'}</td></tr>
        <tr><th>Contact</th><td>${shopData.contact || 'N/A'}</td></tr>
      </tbody>
    </table>
  `;
}

async function loadProductDetails() {
  try {
    const productsQuery = query(collection(db, "products"), where("shopId", "==", currentShopId));
    const productsSnapshot = await getDocs(productsQuery);
    const products = [];
    productsSnapshot.forEach(doc => {
      products.push(doc.data());
    });
    console.log("Products fetched:", products);
    displayProductDetails(products);
  } catch (error) {
    console.error("Error loading product details:", error);
  }
}

function displayProductDetails(products) {
  const container = document.getElementById('product-details');
  console.log("Product details container:", container);
  if (!container) return;
  let html = `<h2>Products (${products.length})</h2>`;
  html += `<table class="table table-striped">
    <thead>
      <tr>
        <th scope="col">Product Name</th>
        <th scope="col">Price (₹)</th>
        <th scope="col">Stock Quantity</th>
      </tr>
    </thead>
    <tbody>`;
  products.forEach(p => {
    html += `<tr>
      <td>${p.name || 'Unnamed'}</td>
      <td>${p.price || 0}</td>
      <td>${p.quantity || 0}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}


async function loadOrderSummary() {
  try {
    const ordersQuery = query(collection(db, "orders"), where("shopId", "==", currentShopId));
    const ordersSnapshot = await getDocs(ordersQuery);
    let totalOrders = 0;
    let totalSales = 0;
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      totalOrders++;
      if (data.status === "paid" || data.status === "delivered") {
        totalSales += data.total;
      }
    });
    displayOrderSummary(totalOrders, totalSales);
  } catch (error) {
    console.error("Error loading order summary:", error);
  }
}

function displayOrderSummary(totalOrders, totalSales) {
  const container = document.getElementById('order-summary');
  if (!container) return;
  container.innerHTML = `
    <h2>Order Summary</h2>
    <table class="table table-bordered">
      <tbody>
        <tr><th>Total Orders</th><td>${totalOrders}</td></tr>
        <tr><th>Total Sales</th><td>₹${totalSales}</td></tr>
      </tbody>
    </table>
  `;
}

async function loadCustomerCount() {
  try {
    const ordersQuery = query(collection(db, "orders"), where("shopId", "==", currentShopId));
    const ordersSnapshot = await getDocs(ordersQuery);
    const customers = new Set();
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      customers.add(data.userId);
    });
    displayCustomerCount(customers.size);
  } catch (error) {
    console.error("Error loading customer count:", error);
  }
}

function displayCustomerCount(count) {
  const container = document.getElementById('customer-count');
  if (!container) return;
  container.innerHTML = `
    <h2>Customer Visits</h2>
    <table class="table table-bordered">
      <tbody>
        <tr><th>Unique Customers</th><td>${count}</td></tr>
      </tbody>
    </table>
  `;
}

async function downloadReport() {
  try {
    const shopDoc = await getDoc(doc(db, "shops", currentShopId));
    if (!shopDoc.exists()) {
      alert("Shop data not found");
      return;
    }
    const shopData = shopDoc.data();

    const productsQuery = query(collection(db, "products"), where("shopId", "==", currentShopId));
    const productsSnapshot = await getDocs(productsQuery);
    const products = [];
    productsSnapshot.forEach(doc => {
      products.push(doc.data());
    });

    const ordersQuery = query(collection(db, "orders"), where("shopId", "==", currentShopId));
    const ordersSnapshot = await getDocs(ordersQuery);
    let totalOrders = 0;
    let totalSales = 0;
    const customers = new Set();
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      totalOrders++;
      if (data.status === "paid" || data.status === "delivered") {
        totalSales += data.total;
      }
      customers.add(data.userId);
    });

    // Prepare report content as text
    let reportContent = `Shop Report - ${shopData.name || 'N/A'}\n\n`;
    reportContent += `Address: ${shopData.address || 'N/A'}\n`;
    reportContent += `Contact: ${shopData.contact || 'N/A'}\n\n`;

    reportContent += `Total Orders: ${totalOrders}\n`;
    reportContent += `Total Sales: ₹${totalSales}\n`;
    reportContent += `Unique Customers: ${customers.size}\n\n`;

    reportContent += `Products:\n`;
    products.forEach(p => {
      reportContent += ` - ${p.name || 'Unnamed'}: ₹${p.price || 0}, Stock: ${p.quantity || 0}\n`;
    });

    // Create a blob and trigger download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shop_Report_${shopData.name || 'report'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error generating report:", error);
    alert("Failed to generate report. Please try again.");
  }
}

// Add event listener for download button
document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-report-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadReport);
  }
});
