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
    // User not logged in, redirect to login page or handle accordingly
    window.location.href = "login.html";
    return;
  }

  try {
    console.log("User ID:", user.uid); // Log user ID
    const shopQuery = query(collection(db, "shops"),
      where("ownerId", "==", user.uid),
      where("approved", "==", true));
    const shopSnapshot = await getDocs(shopQuery);

    if (shopSnapshot.empty) {
      console.warn("No approved shop found for user");
      // Optionally redirect to registration or show message
      return;
    }

    currentShopId = shopSnapshot.docs[0].id;

    // Define functions inside onAuthStateChanged to have access to currentShopId

    async function loadDashboardMetrics() {
      console.log("loadDashboardMetrics started");
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
            console.log("Order data:", data);
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
        console.log("loadDashboardMetrics completed");
      } catch (error) {
        console.error("Error loading metrics:", error);
        if (metricsLoading) metricsLoading.style.display = "none";
        const metricsError = document.getElementById("metrics-error");
        if (metricsError) metricsError.style.display = "block";
      }
    }

async function loadOrders() {
  console.log("loadOrders started");
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

        // Build product details string
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
    console.log("loadOrders completed");
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

    // Call initial loading functions
    loadDashboardMetrics();
    loadShopName();
    loadOrders();

    // New function to load sales and revenue data and render charts
    async function loadSalesRevenueData() {
      try {
        const ordersQuery = query(collection(db, "orders"), where("shopId", "==", currentShopId));
        const ordersSnapshot = await getDocs(ordersQuery);

        let salesByMonth = {};
        let revenueByMonth = {};

        ordersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === "paid" || data.status === "delivered") {
            const createdAt = data.createdAt ? data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt) : new Date();
            const monthKey = createdAt.getFullYear() + "-" + String(createdAt.getMonth() + 1).padStart(2, "0");

            salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + 1;
            revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + data.total;
          }
        });

        renderSalesRevenueCharts(salesByMonth, revenueByMonth);
      } catch (error) {
        console.error("Error loading sales and revenue data:", error);
      }
    }

    loadSalesRevenueData();

    // Initialize event listeners that depend on currentShopId here if needed

  } catch (error) {
    console.error("Error loading shop data:", error);
    alert("Error loading shop data. Please try again or contact support.");
  }
});

// Define updateOrderStatus globally since it is used in inline onchange handlers
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

// Define other functions that do not depend on shopId outside onAuthStateChanged, e.g., renderCharts, initializeEventListeners, handleProductSubmit, loadAllProducts, loadOffers, etc.

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
  // renderCharts(); // Commented out because renderCharts is not defined
  initializeEventListenersMain();
  initializeEventListenersReport();
  // Do not call loadDashboardMetrics or loadOrders here; they are called after shopId is set
};

// Add button event listener to navigate to report page
function initializeEventListeners() {
  const viewReportBtn = document.getElementById("view-report");
  if (viewReportBtn) {
    viewReportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "shop-owner-report.html";
    });
  }
  // existing event listeners...
}

// Added back missing functions for loading products and offers

async function handleProductSubmit(e) {
  e.preventDefault();

  if (!currentShopId) {
    alert("Shop ID not available. Please try again later.");
    return;
  }

  const name = document.getElementById("product-name")?.value.trim();
  const price = parseFloat(document.getElementById("product-price")?.value);
  const description = document.getElementById("product-description")?.value.trim();
  const quantity = parseInt(document.getElementById("product-quantity")?.value);
  const imageInput = document.getElementById("product-image");
  const image = imageInput?.files[0];
  const previewContainer = document.getElementById("image-preview");

  if (!name || !price || !description || !quantity || !image) {
    return alert("Please fill all fields and select an image");
  }

  if (image.size > 5 * 1024 * 1024) {
    return alert("Image must be smaller than 5MB");
  }

  // Show image preview
  if (previewContainer) {
    previewContainer.innerHTML = "";
    const preview = document.createElement("img");
    preview.src = URL.createObjectURL(image);
    preview.style.maxWidth = "200px";
    preview.style.maxHeight = "200px";
    previewContainer.appendChild(preview);
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading...";
  }

  try {
    // Upload image to backend (ensure backend stores it in 'public/uploads' and returns proper URL)
    const formData = new FormData();
    formData.append("productImage", image);

    const res = await fetch("http://localhost:5001/upload/products", {
      method: "POST",
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error("Image upload failed");
    const { imageUrl } = await res.json(); // This must be the accessible public path

    await addDoc(collection(db, "products"), {
      shopId: currentShopId,
      name,
      price,
      description,
      quantity,
      imageUrl, // ✅ save full accessible URL
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ownerId: auth.currentUser?.uid
    });

    e.target.reset();
    if (previewContainer) previewContainer.innerHTML = "";
    await loadAllProducts(currentShopId);
    alert("Product added successfully!");
  } catch (err) {
    console.error(err);
    alert(`Failed to add product: ${err.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add Product";
    }
  }
}

async function loadAllProducts(shopId) {
  const productsLoading = document.getElementById("products-loading");
  const productsContent = document.getElementById("products-content");
  const productsError = document.getElementById("products-error");
  const productList = document.getElementById("product-list");

  if (productsLoading) productsLoading.style.display = "block";
  if (productsContent) productsContent.style.display = "none";
  if (productsError) productsError.style.display = "none";
  if (productList) productList.innerHTML = "";

  try {
    const snapshot = await getDocs(
      query(collection(db, "products"), where("shopId", "==", shopId))
    );

    if (productList) {
      snapshot.forEach((doc) => {
        const p = doc.data();

        const imageUrl =
          p.imageUrl && typeof p.imageUrl === "string" && p.imageUrl.trim() !== ""
            ? p.imageUrl
            : "public/images/default-product.jpg";

        const outOfStock = p.quantity <= 0;

        const item = document.createElement("div");
        item.className = "col-md-3 mb-4";
        item.innerHTML = `
          <div class="card h-100 ${outOfStock ? 'border-danger' : ''}">
            <img src="${imageUrl}" class="card-img-top" alt="${p.name}"
                 style="height: 200px; object-fit: cover; ${outOfStock ? 'opacity: 0.5;' : ''}"
                 onerror="this.src='public/images/default-product.jpg';">
            <div class="card-body">
              <h5 class="card-title">${p.name}</h5>
              <p class="card-text">Price: ₹${p.price}</p>
              <p class="card-text">Stock: ${p.quantity}</p>
              ${outOfStock ? '<p class="text-danger fw-bold">Out of Stock</p>' : ''}
              <p class="card-text text-muted">${p.description}</p>
              <button class="btn btn-primary btn-sm mt-2 edit-product-btn" data-id="${doc.id}">Edit</button>
            </div>
          </div>
        `;
        productList.appendChild(item);
      });
    }

    if (productsLoading) productsLoading.style.display = "none";
    if (productsContent) productsContent.style.display = "block";
  } catch (error) {
    console.error("Error loading products:", error);
    if (productsLoading) productsLoading.style.display = "none";
    if (productsError) productsError.style.display = "block";
  }
}

async function loadOffers(shopId) {
  // Show loading state
  document.getElementById("offers-loading").style.display = "block";
  document.getElementById("offers-content").style.display = "none";
  
  const offerList = document.getElementById("offer-list");
  offerList.innerHTML = "";

  try {
    const snapshot = await getDocs(query(collection(db, "offers"), where("shopId", "==", shopId)));

    snapshot.forEach(doc => {
      const o = doc.data();
      const item = document.createElement("li");
      item.innerHTML = `${o.name} (${o.type}) - ${o.discount}% off`;
      offerList.appendChild(item);
    });

    // Hide loading state
    document.getElementById("offers-loading").style.display = "none";
    document.getElementById("offers-content").style.display = "block";
  } catch (error) {
    console.error("Error loading offers:", error);
    document.getElementById("offers-loading").style.display = "none";
    document.getElementById("offers-error").style.display = "block";
  }
}

document.addEventListener("click", async (e) => {
  if (e.target && e.target.classList.contains("edit-product-btn")) {
    const productId = e.target.getAttribute("data-id");
    if (!productId) return;

    // Fetch product data
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      alert("Product not found");
      return;
    }
    const productData = productSnap.data();

    // Create and show edit form modal
    let modal = document.getElementById("editProductModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "editProductModal";
      modal.className = "modal fade";
      modal.tabIndex = -1;
      modal.setAttribute("role", "dialog");
      modal.innerHTML = `
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form id="editProductForm">
              <div class="modal-header">
                <h5 class="modal-title">Edit Product</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label for="editProductName" class="form-label">Name</label>
                  <input type="text" class="form-control" id="editProductName" required>
                </div>
                <div class="mb-3">
                  <label for="editProductPrice" class="form-label">Price</label>
                  <input type="number" class="form-control" id="editProductPrice" min="0" step="0.01" required>
                </div>
                <div class="mb-3">
                  <label for="editProductQuantity" class="form-label">Quantity</label>
                  <input type="number" class="form-control" id="editProductQuantity" min="0" required>
                </div>
                <div class="mb-3">
                  <label for="editProductDescription" class="form-label">Description</label>
                  <textarea class="form-control" id="editProductDescription" rows="3" required></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="submit" class="btn btn-primary">Save changes</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // Fill form with product data
    document.getElementById("editProductName").value = productData.name || "";
    document.getElementById("editProductPrice").value = productData.price || 0;
    document.getElementById("editProductQuantity").value = productData.quantity || 0;
    document.getElementById("editProductDescription").value = productData.description || "";

    // Show modal using Bootstrap's modal API
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    // Handle form submission
    const form = document.getElementById("editProductForm");
    form.onsubmit = async (event) => {
      event.preventDefault();

      const updatedName = document.getElementById("editProductName").value.trim();
      const updatedPrice = parseFloat(document.getElementById("editProductPrice").value);
      const updatedQuantity = parseInt(document.getElementById("editProductQuantity").value);
      const updatedDescription = document.getElementById("editProductDescription").value.trim();

      if (!updatedName || isNaN(updatedPrice) || isNaN(updatedQuantity) || !updatedDescription) {
        alert("Please fill all fields correctly.");
        return;
      }

      try {
        await updateDoc(productRef, {
          name: updatedName,
          price: updatedPrice,
          quantity: updatedQuantity,
          description: updatedDescription,
          updatedAt: new Date()
        });
        alert("Product updated successfully!");
        bootstrapModal.hide();
        // Reload product list
        loadAllProducts(currentShopId);
      } catch (error) {
        console.error("Error updating product:", error);
        alert("Failed to update product. Please try again.");
      }
    };
  }
});
