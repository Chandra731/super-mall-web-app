// shop.js
import { db } from "./firebase.mjs";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const shopId = localStorage.getItem("shopId");
  const shopName = localStorage.getItem("shopName");
  const productList = document.getElementById("product-list");
  const searchInput = document.getElementById("search-input");
  const minPriceInput = document.getElementById("min-price");
  const maxPriceInput = document.getElementById("max-price");

  if (shopName) {
    document.getElementById("shop-name").textContent = shopName;
  }

  async function fetchProducts() {
    if (!shopId) {
      console.error("No shopId found in localStorage");
      return;
    }

    try {
      const q = query(collection(db, "products"), where("shopId", "==", shopId));
      const querySnapshot = await getDocs(q);
      const products = [];

      querySnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });

      displayProducts(products);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  }

  function displayProducts(products) {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const minPrice = parseFloat(minPriceInput.value);
    const maxPrice = parseFloat(maxPriceInput.value);

    const filtered = products.filter(product => {
      const nameMatch = product.productName.toLowerCase().includes(searchTerm);
      const price = parseFloat(product.productPrice);
      const minPass = isNaN(minPrice) || price >= minPrice;
      const maxPass = isNaN(maxPrice) || price <= maxPrice;
      return nameMatch && minPass && maxPass;
    });

    productList.innerHTML = "";

    if (filtered.length === 0) {
      const noData = document.createElement("li");
      noData.className = "list-group-item text-center";
      noData.textContent = "No products found.";
      productList.appendChild(noData);
      return;
    }

    filtered.forEach(product => {
      const li = document.createElement("li");
      li.className = "list-group-item";

      li.innerHTML = `
        <div class="d-flex align-items-center">
          <img src="${product.productImageUrls?.[0] || 'https://via.placeholder.com/80'}" alt="${product.productName}" class="mr-3" style="width: 80px; height: 80px; object-fit: cover;">
          <div>
            <h5 class="mb-1">${product.productName}</h5>
            <p class="mb-1">${product.productDescription}</p>
            <strong>₹${product.productPrice}</strong>
          </div>
        </div>
      `;

      productList.appendChild(li);
    });
  }

  searchInput.addEventListener("input", fetchProducts);
  minPriceInput.addEventListener("input", fetchProducts);
  maxPriceInput.addEventListener("input", fetchProducts);

  fetchProducts();
});
