import { db } from './firebase-config.js';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs';

let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  setupDateFilters();
  setupDownloadButton();
  loadDataAndCharts('weekly');
});

function setupDownloadButton() {
  const btn = document.getElementById('download-report');
  btn.addEventListener('click', async () => {
    const activeFilterBtn = document.querySelector('.date-filters .btn-group .btn.active');
    const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'weekly';
    const reportData = await fetchShopsProductsSalesReport(filter);
    if (reportData.length === 0) {
      alert('No data available for the selected filter.');
      return;
    }
    generateReportDownload(reportData);
  });
}

async function fetchShopsProductsSalesReport(filter) {
  const { startDate, endDate } = getDateRange(filter);
  const shopsSnapshot = await getDocs(collection(db, 'shops'));
  const shops = shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const shopMap = {};
  shops.forEach(shop => {
    shopMap[shop.id] = {
      shopName: shop.name || 'Unnamed Shop',
      totalProducts: 0,
      totalSales: 0
    };
  });

  // Count total products per shop
  const productsSnapshot = await getDocs(collection(db, 'products'));
  productsSnapshot.forEach(doc => {
    const product = doc.data();
    const shopId = product.shopId;
    if (shopMap[shopId]) {
      shopMap[shopId].totalProducts += 1;
    }
  });

  // Count total sales per shop within the date range
  const ordersSnapshot = await getDocs(collection(db, 'orders'));
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    if ((order.status === 'paid' || order.status === 'delivered') && order.shopId) {
      let createdAtDate = null;
      if (order.createdAt && typeof order.createdAt.toDate === 'function') {
        createdAtDate = order.createdAt.toDate();
      } else if (order.createdAt) {
        createdAtDate = new Date(order.createdAt);
      }
      if (createdAtDate && createdAtDate >= startDate && createdAtDate <= endDate) {
        const shopId = order.shopId;
        if (shopMap[shopId]) {
          shopMap[shopId].totalSales += 1;
        }
      }
    }
  });

  return Object.values(shopMap);
}

const setupDateFilters = () => {
  const buttons = document.querySelectorAll('.date-filters .btn-group .btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      console.log("Filter button clicked:", filter);
      loadDataAndCharts(filter);
    });
  });
  buttons[0].classList.add('active');
};

function generateReportDownload(data) {
  const pdf = new window.jspdf.jsPDF();
  pdf.setFontSize(16);
  pdf.text('Shops Products and Sales Report', 14, 20);
  const columns = ['Shop Name', 'Total Products', 'Total Sales'];
  const rows = data.map(d => [d.shopName, d.totalProducts.toString(), d.totalSales.toString()]);
  pdf.autoTable({
    head: [columns],
    body: rows,
    startY: 30
  });
  pdf.save('shops_products_sales_report.pdf');

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, 'shops_products_sales_report.xlsx');
}

async function loadDataAndCharts(filter) {
  const reportData = await fetchShopsProductsSalesReport(filter);
  renderShopsSalesTable(reportData);
  const { startDate, endDate } = getDateRange(filter);
  await loadUserGrowthChart(startDate, endDate);
  await loadSalesPredictionChart(startDate, endDate);
}

function renderShopsSalesTable(data) {
  const container = document.getElementById('shops-sales-table-container');
  if (!container) return;
  if (data.length === 0) {
    container.innerHTML = '<p>No data available for the selected filter.</p>';
    return;
  }
  let html = `
    <table class="table table-striped table-bordered">
      <thead>
        <tr>
          <th>Shop Name</th>
          <th>Total Products</th>
          <th>Total Sales</th>
        </tr>
      </thead>
      <tbody>
  `;
  data.forEach(row => {
    html += `
      <tr>
        <td>${row.shopName}</td>
        <td>${row.totalProducts}</td>
        <td>${row.totalSales}</td>
      </tr>
    `;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}



async function loadUserGrowthChart(startDate, endDate) {
  const usersRef = collection(db, 'users');

  // Convert dates to ISO strings for comparison (matching stored format)
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  const q = query(
    usersRef,
    where('createdAt', '>=', startStr),
    where('createdAt', '<=', endStr),
    orderBy('createdAt')
  );

  const snapshot = await getDocs(q);
  console.log('User growth query snapshot size:', snapshot.size);

  const countsMap = new Map();

  snapshot.forEach(doc => {
    const data = doc.data();
    let dateStr = null;

    if (typeof data.createdAt === 'string') {
      try {
        const date = new Date(data.createdAt);
        if (!isNaN(date.getTime())) {
          // Use local date format (YYYY-MM-DD)
          dateStr = date.toLocaleDateString('en-CA');
        }
      } catch (e) {
        console.warn('Invalid createdAt format:', data.createdAt);
      }
    }

    if (dateStr) {
      countsMap.set(dateStr, (countsMap.get(dateStr) || 0) + 1);
    }
  });

  const labels = generateDateLabels(startDate, endDate); // must return YYYY-MM-DD
  const data = labels.map(date => countsMap.get(date) || 0);

  console.log('User growth chart labels:', labels);
  console.log('User growth chart data:', data);

  renderChart('userGrowthChart', 'User Growth', labels, data, 'bar');
}



async function loadSalesPredictionChart(startDate, endDate) {
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<=', Timestamp.fromDate(endDate)), orderBy('createdAt'));
  const snapshot = await getDocs(q);

  const salesMap = new Map();
  snapshot.forEach(doc => {
    const data = doc.data();
    let dateStr = null;
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
      dateStr = data.createdAt.toDate().toISOString().split('T')[0];
    } else if (data.createdAt) {
      dateStr = new Date(data.createdAt).toISOString().split('T')[0];
    }
    if (dateStr) {
      salesMap.set(dateStr, (salesMap.get(dateStr) || 0) + (data.total || 0));
    }
  });

  const labels = generateDateLabels(startDate, endDate);
  const data = labels.map(date => salesMap.get(date) || 0);

  renderChart('salesPredictionChart', 'Sales Prediction', labels, data, 'line');
}

function generateDateLabels(startDate, endDate) {
  const labels = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    labels.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return labels;
}

function renderChart(canvasId, title, labels, data, type) {
  if (charts[canvasId]) {
    charts[canvasId].destroy();
  }
  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        fill: type === 'line',
        borderColor: 'rgba(67, 97, 238, 0.8)',
        backgroundColor: 'rgba(67, 97, 238, 0.4)',
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: true, text: title }
      },
      scales: {
        x: { display: true, title: { display: true, text: 'Date' } },
        y: { display: true, title: { display: true, text: 'Value' }, beginAtZero: true }
      }
    }
  });
}

function getDateRange(filter) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (filter) {
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }
  return { startDate, endDate };
}
