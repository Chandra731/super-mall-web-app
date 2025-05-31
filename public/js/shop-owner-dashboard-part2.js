let allProducts = []; // Store all loaded products for filtering

// Load all products and store them for filtering
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

    allProducts = [];
    snapshot.forEach((doc) => {
      const p = doc.data();
      p.id = doc.id;
      allProducts.push(p);
    });

    renderProductList(allProducts);

    if (productsLoading) productsLoading.style.display = "none";
    if (productsContent) productsContent.style.display = "block";
  } catch (error) {
    console.error("Error loading products:", error);
    if (productsLoading) productsLoading.style.display = "none";
    if (productsError) productsError.style.display = "block";
  }
}

// Render product list with optional filtering
function renderProductList(products) {
  const productList = document.getElementById("product-list");
  if (!productList) return;

  productList.innerHTML = "";

  products.forEach((p) => {
    const imageUrl =
      p.imageUrl && typeof p.imageUrl === "string" && p.imageUrl.trim() !== ""
        ? p.imageUrl
        : "public/images/default-product.jpg";

    const outOfStock = p.quantity <= 0;

    const item = document.createElement("div");
    item.className = "col-md-3 mb-4";
    item.innerHTML = `
      <div class="card h-100 ${outOfStock ? "border-danger" : ""}">
        <img
          src="${imageUrl}"
          class="card-img-top"
          alt="${p.name}"
          style="height: 200px; object-fit: cover; ${outOfStock ? "opacity: 0.5;" : ""}"
          onerror="this.src='public/images/default-product.jpg';"
        />
        <div class="card-body">
          <h5 class="card-title">${p.name}</h5>
          <p class="card-text">Price: ₹${p.price}</p>
          <p class="card-text">Stock: ${p.quantity}</p>
          ${outOfStock ? '<p class="text-danger fw-bold">Out of Stock</p>' : ""}
          <p class="card-text text-muted">${p.description}</p>
          <button class="btn btn-primary btn-sm mt-2 edit-product-btn" data-id="${p.id}">Edit</button>
        </div>
      </div>
    `;
    productList.appendChild(item);
  });
}

// Filter products by name based on search input
function filterProductsByName(searchTerm) {
  if (!searchTerm) {
    renderProductList(allProducts);
    return;
  }
  const filtered = allProducts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  renderProductList(filtered);
}

function initializeEventListenersMain() {
  const viewProductsBtn = document.getElementById("view-all-products");
  if (viewProductsBtn) {
    viewProductsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loadAllProducts(currentShopId);
    });
  }
  const productFilterInput = document.getElementById("product-filter");
  if (productFilterInput) {
    productFilterInput.addEventListener("input", (e) => {
      filterProductsByName(e.target.value);
    });
  }
  const viewOffersBtn = document.getElementById("view-all-offers");
  if (viewOffersBtn) viewOffersBtn.addEventListener("click", () => loadOffers(currentShopId));
  const viewOrdersBtn = document.getElementById("view-orders");
  if (viewOrdersBtn) viewOrdersBtn.addEventListener("click", () => loadOrders(currentShopId));
  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", (e) => {
      handleProductSubmit(e);
    });
  }
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
}

window.onload = () => {
  initializeEventListenersMain();
  initializeEventListenersReport();
};

