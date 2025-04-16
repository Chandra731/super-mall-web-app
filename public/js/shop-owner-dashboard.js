// shop-owner-dashboard.js
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged,
  signOut 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Get shop ID from authenticated user
let shopId;
onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      console.log("User ID:", user.uid); // Log user ID
      const shopQuery = query(collection(db, "shops"),
        where("ownerId", "==", user.uid),
        where("approved", "==", true));
      const shopSnapshot = await getDocs(shopQuery);
      
      if (!shopSnapshot.empty) {
        shopId = shopSnapshot.docs[0].id;
        loadDashboardMetrics();
        loadShopName();
      } else {
        console.warn("No approved shop found for user");
        // Optionally redirect to registration or show message
      }
    }
  } catch (error) {
    console.error("Error loading shop data:", error);
    alert("Error loading shop data. Please try again or contact support.");
  }
});

// ✅ 1. Dashboard Metrics
async function loadDashboardMetrics() {
  console.log("Loading dashboard metrics...");
  console.log("Current shopId:", shopId); // Log shopId
  
  // Safely handle missing elements
  const metricsLoading = document.getElementById("metrics-loading");
  const metricsContent = document.getElementById("metrics-content");
  
  if (metricsLoading && metricsContent) {
    metricsLoading.style.display = "block";
    metricsContent.style.display = "none";
  }
  
  try {
    if (!shopId) {
      throw new Error("shopId is not defined");
    }
    
    console.log("Querying orders for shop:", shopId);
    const ordersQuery = query(
      collection(db, "orders"),
      where("shopId", "==", shopId)
    );
    const ordersSnapshot = await getDocs(ordersQuery);

  let totalSales = 0;
  let totalOrders = 0;
  let customers = new Set();
  let productSales = {};

  ordersSnapshot.forEach(doc => {
    const data = doc.data();
    totalOrders++;
    if (data.status === "Delivered") {
      totalSales += data.total;
    }
    customers.add(data.customerId);

    data.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.name, quantity: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
    });
  });

  // Find Top Product
  let topProduct = Object.values(productSales).sort((a, b) => b.quantity - a.quantity)[0];

  document.getElementById("total-sales").textContent = `₹${totalSales}`;
  document.getElementById("total-orders").textContent = totalOrders;
  document.getElementById("customers-visited").textContent = customers.size;
  document.getElementById("top-product").textContent = topProduct?.name || "N/A";
  
  // Safely hide loading state
  const metricsLoading = document.getElementById("metrics-loading");
  const metricsContent = document.getElementById("metrics-content");
  const metricsError = document.getElementById("metrics-error");
  
  if (metricsLoading) metricsLoading.style.display = "none";
  if (metricsContent) metricsContent.style.display = "block";
  if (metricsError) metricsError.style.display = "none";
  } catch (error) {
    console.error("Error loading metrics:", error);
    const metricsLoading = document.getElementById("metrics-loading");
    const metricsError = document.getElementById("metrics-error");
    
    if (metricsLoading) metricsLoading.style.display = "none";
    if (metricsError) metricsError.style.display = "block";
  }
}

// 🔹 2. Predictive Charts
function renderCharts() {
  const ctx = document.getElementById("salesChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr"],
      datasets: [{
        label: "Sales",
        data: [1200, 2100, 1800, 2500],
        borderColor: "blue"
      }]
    },
    options: {
      responsive: true
    }
  });
}

// 🔹 3. Product Management
const productForm = document.getElementById("product-form");
if (productForm) {
  productForm.addEventListener("submit", handleProductSubmit);
}

async function handleProductSubmit(e) {
  e.preventDefault();

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
    });

    if (!res.ok) throw new Error("Image upload failed");
    const { imageUrl } = await res.json(); // This must be the accessible public path

    await addDoc(collection(db, "products"), {
      shopId,
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
    await loadAllProducts();
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


// 🔹 4. View All Products
async function loadAllProducts() {
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

        const item = document.createElement("div");
        item.className = "col-md-3 mb-4";
        item.innerHTML = `
          <div class="card h-100">
            <img src="${imageUrl}" class="card-img-top" alt="${p.name}"
                 style="height: 200px; object-fit: cover;"
                 onerror="this.src='public/images/default-product.jpg';">
            <div class="card-body">
              <h5 class="card-title">${p.name}</h5>
              <p class="card-text">Price: ₹${p.price}</p>
              <p class="card-text">Stock: ${p.quantity}</p>
              <p class="card-text text-muted">${p.description}</p>
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

// Initialize button event listeners when DOM is loaded
function initializeEventListeners() {
  const viewProductsBtn = document.getElementById("view-all-products");
  if (viewProductsBtn) {
    viewProductsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loadAllProducts();
    });
  }
}

// Call initialization when window loads
window.onload = () => {
  loadShopName();
  loadDashboardMetrics();
  renderCharts();
  initializeEventListeners(); // Add this line
};

// 🔹 5. Promotions / Offers
const offerForm = document.getElementById("offer-form");
if (offerForm) offerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("offer-name").value;
  const description = document.getElementById("offer-description").value;
  const discount = parseFloat(document.getElementById("offer-discount").value);
  const type = document.getElementById("offer-type").value;

  try {
    const offerRef = await addDoc(collection(db, "offers"), {
      shopId,
      name,
      description,
      type,
      discount: Number(discount),
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: serverTimestamp(),
      ownerId: auth.currentUser.uid
    });
    console.log("Offer created with ID: ", offerRef.id);
    alert("Offer created successfully!");
    e.target.reset();
    await loadOffers();
  } catch (error) {
    console.error("Error creating offer: ", error);
    alert("Failed to create offer: " + error.message);
  }
});

async function loadOffers() {
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

const viewOffersBtn = document.getElementById("view-all-offers");
if (viewOffersBtn) viewOffersBtn.addEventListener("click", loadOffers);

// 🔹 6. Orders Section
async function loadOrders() {
  // Show loading state
  document.getElementById("orders-loading").style.display = "block";
  document.getElementById("orders-content").style.display = "none";
  
  const orderList = document.getElementById("order-list");
  orderList.innerHTML = "";

  try {
    const snapshot = await getDocs(query(collection(db, "orders"), where("shopId", "==", shopId)));

    snapshot.forEach(docSnap => {
      const o = docSnap.data();
      const orderCard = document.createElement("div");
      orderCard.className = "col-md-4 mb-4";
      orderCard.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">Order #${docSnap.id}</h5>
            <p class="card-text">Customer: ${o.customerName}</p>
            <p class="card-text">Total: ₹${o.total}</p>
            <div class="form-group">
              <label>Status:</label>
              <select class="form-control" onchange="updateOrderStatus('${docSnap.id}', this.value)">
                <option value="Pending" ${o.status === "Pending" ? "selected" : ""}>Pending</option>
                <option value="Shipped" ${o.status === "Shipped" ? "selected" : ""}>Shipped</option>
                <option value="Delivered" ${o.status === "Delivered" ? "selected" : ""}>Delivered</option>
              </select>
            </div>
          </div>
        </div>
      `;
      orderList.appendChild(orderCard);
    });

    // Hide loading state
    document.getElementById("orders-loading").style.display = "none";
    document.getElementById("orders-content").style.display = "block";
  } catch (error) {
    console.error("Error loading orders:", error);
    document.getElementById("orders-loading").style.display = "none";
    document.getElementById("orders-error").style.display = "block";
  }
}

window.updateOrderStatus = async function (orderId, newStatus) {
  await updateDoc(doc(db, "orders", orderId), { status: newStatus });
  alert("Order status updated");
};

const viewOrdersBtn = document.getElementById("view-orders");
if (viewOrdersBtn) viewOrdersBtn.addEventListener("click", loadOrders);

// 🔹 Get Shop Name
async function loadShopName() {
  try {
    if (!shopId) {
      console.error("Shop ID not available");
      return;
    }
    
    const shopDoc = await getDoc(doc(db, "shops", shopId));
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

// 🔹 Handle Logout
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) logoutBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Error during logout. Please try again.");
  }
});

// 🔹 Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  if (anchor) {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  }
});

// 🚀 Initialize everything when window loads
window.onload = () => {
  loadShopName();
  loadDashboardMetrics();
  renderCharts();
  
  // Initialize all event listeners
  initializeEventListeners();
  
  // Initialize offers button if exists
  const viewOffersBtn = document.getElementById("view-all-offers");
  if (viewOffersBtn) viewOffersBtn.addEventListener("click", loadOffers);
  
  // Initialize orders button if exists
  const viewOrdersBtn = document.getElementById("view-orders");
  if (viewOrdersBtn) viewOrdersBtn.addEventListener("click", loadOrders);
  
  // Initialize product form if exists
  const productForm = document.getElementById("product-form");
  if (productForm) productForm.addEventListener("submit", handleProductSubmit);
  
  // Initialize offer form if exists
  const offerForm = document.getElementById("offer-form");
  if (offerForm) {
    offerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("offer-name").value;
      const description = document.getElementById("offer-description").value;
      const discount = parseFloat(document.getElementById("offer-discount").value);
      const type = document.getElementById("offer-type").value;

      try {
        const offerRef = await addDoc(collection(db, "offers"), {
          shopId,
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
        await loadOffers();
      } catch (error) {
        console.error("Error creating offer: ", error);
        alert("Failed to create offer: " + error.message);
      }
    });
  }
  
  // Initialize smooth scrolling for navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    if (anchor) {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth'
          });
        }
      });
    }
  });
};
