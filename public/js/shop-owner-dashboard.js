// shop-owner-dashboard.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 🧩 Import your Firebase config from separate file
import { firebaseConfig } from './firebase-config.js';

// 🔌 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 📍 SHOP ID (could be from auth or static for now)
const shopId = "my-shop-001";

// ✅ 1. Dashboard Metrics
async function loadDashboardMetrics() {
  const ordersSnapshot = await getDocs(query(collection(db, "orders"), where("shopId", "==", shopId)));

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
document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("product-name").value;
  const price = parseFloat(document.getElementById("product-price").value);
  const description = document.getElementById("product-description").value;
  const quantity = parseInt(document.getElementById("product-quantity").value);
  const image = document.getElementById("product-image").files[0];

  if (!image) return alert("Select an image");

  const formData = new FormData();
  formData.append("image", image);

  const uploadRes = await fetch("http://localhost:5000/upload", {
    method: "POST",
    body: formData,
  });

  const { imageUrl } = await uploadRes.json();

  await addDoc(collection(db, "products"), {
    shopId,
    name,
    price,
    description,
    quantity,
    imageUrl,
    createdAt: serverTimestamp()
  });

  alert("Product added!");
  e.target.reset();
  loadAllProducts();
});

// 🔹 4. View All Products
async function loadAllProducts() {
  const productList = document.getElementById("product-list");
  productList.innerHTML = "";

  const snapshot = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));

  snapshot.forEach(doc => {
    const p = doc.data();
    const item = document.createElement("div");
    item.classList.add("product-card");
    item.innerHTML = `
      <img src="${p.imageUrl}" width="80" />
      <h4>${p.name}</h4>
      <p>₹${p.price}</p>
      <p>Qty: ${p.quantity}</p>
      <p>${p.description}</p>
    `;
    productList.appendChild(item);
  });
}

document.getElementById("view-all-products").addEventListener("click", loadAllProducts);

// 🔹 5. Promotions / Offers
document.getElementById("offer-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("offer-name").value;
  const description = document.getElementById("offer-description").value;
  const discount = parseFloat(document.getElementById("offer-discount").value);
  const type = document.getElementById("offer-type").value;

  await addDoc(collection(db, "offers"), {
    shopId,
    name,
    description,
    type,
    discount,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: serverTimestamp()
  });

  alert("Offer created!");
  e.target.reset();
  loadOffers();
});

async function loadOffers() {
  const offerList = document.getElementById("offer-list");
  offerList.innerHTML = "";

  const snapshot = await getDocs(query(collection(db, "offers"), where("shopId", "==", shopId)));

  snapshot.forEach(doc => {
    const o = doc.data();
    const item = document.createElement("li");
    item.innerHTML = `${o.name} (${o.type}) - ${o.discount}% off`;
    offerList.appendChild(item);
  });
}

document.getElementById("view-all-offers").addEventListener("click", loadOffers);

// 🔹 6. Orders Section
async function loadOrders() {
  const orderList = document.getElementById("order-list");
  orderList.innerHTML = "";

  const snapshot = await getDocs(query(collection(db, "orders"), where("shopId", "==", shopId)));

  snapshot.forEach(docSnap => {
    const o = docSnap.data();
    const div = document.createElement("div");
    div.innerHTML = `
      <h4>Order: ${docSnap.id}</h4>
      <p>Customer: ${o.customerName}</p>
      <p>Total: ₹${o.total}</p>
      <select onchange="updateOrderStatus('${docSnap.id}', this.value)">
        <option value="Pending" ${o.status === "Pending" ? "selected" : ""}>Pending</option>
        <option value="Shipped" ${o.status === "Shipped" ? "selected" : ""}>Shipped</option>
        <option value="Delivered" ${o.status === "Delivered" ? "selected" : ""}>Delivered</option>
      </select>
    `;
    orderList.appendChild(div);
  });
}

window.updateOrderStatus = async function (orderId, newStatus) {
  await updateDoc(doc(db, "orders", orderId), { status: newStatus });
  alert("Order status updated");
};

document.getElementById("view-orders").addEventListener("click", loadOrders);

// 🔹 Get Shop Name
async function loadShopName() {
  const shopDoc = await getDoc(doc(db, "shops", shopId));
  if (shopDoc.exists()) {
    const shopName = shopDoc.data().name;
    document.getElementById("shop-name-display").textContent = shopName;
    document.getElementById("shop-name-nav").textContent = shopName;
  }
}

// 🔹 Handle Logout
document.getElementById("logout-btn").addEventListener("click", async (e) => {
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
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// 🚀 Load Metrics and Chart on Start
window.onload = () => {
  loadShopName();
  loadDashboardMetrics();
  renderCharts();
};
