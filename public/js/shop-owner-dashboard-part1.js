import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged,
  signOut 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let currentShopId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const shopQuery = query(collection(db, "shops"),
      where("ownerId", "==", user.uid),
      where("approved", "==", true));
    const shopSnapshot = await getDocs(shopQuery);

    if (shopSnapshot.empty) {
      console.warn("No approved shop found for user");
      return;
    }

    currentShopId = shopSnapshot.docs[0].id;

    async function loadDashboardMetrics() {
      const metricsLoading = document.getElementById("metrics-loading");
      const metricsContent = document.getElementById("metrics-content");
      if (metricsLoading) metricsLoading.style.display = "block";
      if (metricsContent) metricsContent.style.display = "none";

      try {
        const ordersQuery = query(collection(db, "orders"), where("shopId", "==", currentShopId));
        const ordersSnapshot = await getDocs(ordersQuery);

        let totalSales = 0;
        let totalOrders = 0;
        let customers = new Set();
        let productSales = {};

        ordersSnapshot.forEach(doc => {
          const data = doc.data();
          totalOrders++;
          if (data.status === "paid" || data.status === "delivered") {
            totalSales += data.total;
          }
          customers.add(data.userId);

          data.items.forEach(item => {
            if (!productSales[item.productId]) {
              productSales[item.productId] = { name: item.name, quantity: 0 };
            }
            productSales[item.productId].quantity += item.quantity;
          });
        });

        let topProduct = Object.values(productSales).sort((a, b) => b.quantity - a.quantity)[0];

        document.getElementById("total-sales").textContent = `₹${totalSales}`;
        document.getElementById("total-orders").textContent = totalOrders;
        document.getElementById("customers-visited").textContent = customers.size;
        document.getElementById("top-product").textContent = topProduct?.name || "N/A";

        if (metricsLoading) metricsLoading.style.display = "none";
        if (metricsContent) metricsContent.style.display = "block";
      } catch (error) {
        console.error("Error loading metrics:", error);
        if (metricsLoading) metricsLoading.style.display = "none";
        const metricsError = document.getElementById("metrics-error");
        if (metricsError) metricsError.style.display = "block";
      }
    }

    async function loadOrders() {
      const ordersLoading = document.getElementById("orders-loading");
      const ordersContent = document.getElementById("orders-content");
      const ordersError = document.getElementById("orders-error");
      const orderList = document.getElementById("order-list");

      if (ordersLoading) ordersLoading.style.display = "block";
      if (ordersContent) ordersContent.style.display = "none";
      if (ordersError) ordersError.style.display = "none";
      if (orderList) orderList.innerHTML = "";

      try {
        const snapshot = await getDocs(query(collection(db, "orders"), where("shopId", "==", currentShopId)));

        if (orderList) {
          snapshot.forEach((doc) => {
            const o = doc.data();

            let productDetails = '';
            if (o.items && Array.isArray(o.items)) {
              productDetails = '<ul>';
              o.items.forEach(item => {
                productDetails += `<li>${item.name} - Quantity: ${item.quantity}</li>`;
              });
              productDetails += '</ul>';
            }

            const item = document.createElement("div");
            item.className = "col-md-4 mb-4";
            item.innerHTML = `
              <div class="card h-100">
                <div class="card-body">
                  <h5 class="card-title">Order #${doc.id}</h5>
                  <p class="card-text">Customer: ${o.userId}</p>
                  <p class="card-text">Total: ₹${o.total}</p>
                  <p class="card-text">Products: ${productDetails}</p>
                  <div class="form-group">
                    <label>Status:</label>
                    <select class="form-control" onchange="updateOrderStatus('${doc.id}', this.value)">
                      <option value="pending" ${o.status === "pending" ? "selected" : ""}>Pending</option>
                      <option value="paid" ${o.status === "paid" ? "selected" : ""}>Paid</option>
                      <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>Shipped</option>
                      <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>Delivered</option>
                    </select>
                  </div>
                </div>
              </div>
            `;
            orderList.appendChild(item);
          });
        }

        if (ordersLoading) ordersLoading.style.display = "none";
        if (ordersContent) ordersContent.style.display = "block";
      } catch (error) {
        console.error("Error loading orders:", error);
        if (ordersLoading) ordersLoading.style.display = "none";
        if (ordersError) ordersError.style.display = "block";
      }
    }

    async function loadShopName() {
      try {
        const shopDoc = await getDoc(doc(db, "shops", currentShopId));
        if (shopDoc.exists()) {
          const shopName = shopDoc.data().name;
          document.getElementById("shop-name-display").textContent = shopName;
          document.getElementById("shop-name-nav").textContent = shopName;
        } else {
          console.error("Shop document not found");
        }
      } catch (error) {
        console.error("Error loading shop name:", error);
      }
    }

    loadDashboardMetrics();
    loadShopName();
    loadOrders();

  } catch (error) {
    console.error("Error loading shop data:", error);
    alert("Error loading shop data. Please try again or contact support.");
  }
});

// Define updateOrderStatus globally since it is used in inline onchange handlers
window.updateOrderStatus = async function (orderId, newStatus) {
  try {
    await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    alert("Order status updated");
  } catch (error) {
    console.error("Error updating order status:", error);
    alert("Failed to update order status.");
  }
};

// Added real sales and revenue charts rendering with aggregated data
let salesChartInstance = null;

function renderSalesRevenueCharts(salesByMonth, revenueByMonth) {
  const salesCtx = document.getElementById("salesChart").getContext("2d");

  // Prepare labels sorted by month
  const months = Object.keys(salesByMonth).sort();
  const salesData = months.map(m => salesByMonth[m]);
  const revenueData = months.map(m => revenueByMonth[m]);

  if (salesChartInstance) {
    salesChartInstance.destroy();
  }
  salesChartInstance = new Chart(salesCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Sales',
          data: salesData,
          borderColor: 'blue',
          fill: false,
        },
        {
          label: 'Revenue',
          data: revenueData,
          borderColor: 'green',
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Amount'
          },
          beginAtZero: true
        }
      }
    }
  });
}

function initializeEventListenersMain() {
  console.log("Initializing main event listeners...");
  const viewProductsBtn = document.getElementById("view-all-products");
  if (viewProductsBtn) {
    viewProductsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loadAllProducts(currentShopId);
    });
  }
  const viewOffersBtn = document.getElementById("view-all-offers");
  if (viewOffersBtn) viewOffersBtn.addEventListener("click", () => loadOffers(currentShopId));
  const viewOrdersBtn = document.getElementById("view-orders");
  if (viewOrdersBtn) viewOrdersBtn.addEventListener("click", () => loadOrders(currentShopId));
  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", (e) => {
      console.log("Product form submitted");
      handleProductSubmit(e);
    });
  }
  const offerForm = document.getElementById("offer-form");
  if (offerForm) {
    offerForm.addEventListener("submit", async (e) => {
      console.log("Offer form submitted");
      e.preventDefault();
      const name = document.getElementById("offer-name").value;
      const description = document.getElementById("offer-description").value;
      const discount = parseFloat(document.getElementById("offer-discount").value);
      const type = document.getElementById("offer-type").value;

      try {
        const offerRef = await addDoc(collection(db, "offers"), {
          shopId: currentShopId,
          name,
          description,
          type,
          discount: Number(discount),
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: serverTimestamp(),
          ownerId: auth.currentUser.uid
        });
        alert("Offer created successfully!");
        e.target.reset();
        await loadOffers(currentShopId);
      } catch (error) {
        console.error("Error creating offer: ", error);
        alert("Failed to create offer: " + error.message);
      }
    });
  }
}

import './shop-owner-report.js';

function initializeEventListenersReport() {
  const viewReportBtn = document.getElementById("view-report");
  if (viewReportBtn) {
    viewReportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "./shop-owner-report.html";
    });
  }
  // existing event listeners...
}

// Call initialization on window load
window.onload = () => {
  initializeEventListenersMain();
  initializeEventListenersReport();
};
