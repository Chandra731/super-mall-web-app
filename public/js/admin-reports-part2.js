import { fetchShopsProductsSalesReport } from './admin-reports-part1.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs';

let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  setupDateFilters();
  setupDownloadButton();
  loadDataAndCharts('weekly');
});

function setupDateFilters() {
  const buttons = document.querySelectorAll('.date-filters .btn-group .btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      loadDataAndCharts(filter);
    });
  });
  buttons[0].classList.add('active');
}

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
  const labels = generateDateLabels(startDate, endDate);
  const data = labels.map(() => Math.floor(Math.random() * 100) + 50);
  renderChart('userGrowthChart', 'User Growth', labels, data, 'bar');
}

async function loadSalesPredictionChart(startDate, endDate) {
  const labels = generateDateLabels(startDate, endDate);
  const data = labels.map(() => Math.floor(Math.random() * 2000) + 500);
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
