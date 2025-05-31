import { auth, db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const shopFunctions = {
  comparisonProducts: [],
  allProducts: [],

  createComparisonModal: function () {
    const modal = document.createElement('div');
    modal.id = 'comparisonModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Product Comparison</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body" id="comparisonContent">
            <p>No products selected for comparison</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  addToCart: async function (product) {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please login to add items to cart");
        return;
      }

      // Check if product already in cart
      const cartRef = collection(db, 'carts', user.uid, 'items');
      const q = query(cartRef, where('productId', '==', product.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert("This product is already in your cart");
        return;
      }

      // Add new item to cart
      await addDoc(cartRef, {
        productId: product.id,
        quantity: 1,
        addedAt: new Date(),
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl
      });

      const toast = document.createElement('div');
      toast.className = 'alert alert-success position-fixed';
      toast.style.top = '20px';
      toast.style.right = '20px';
      toast.style.zIndex = '9999';
      toast.textContent = `Added ${product.name} to cart!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      this.updateCartCount();
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  },

  updateCartCount: async function () {
    try {
      const user = auth.currentUser;
      if (!user) {
        document.querySelectorAll('.cart-count').forEach(el => {
          el.style.display = 'none';
        });
        return;
      }

      const cartRef = collection(db, 'carts', user.uid, 'items');
      const querySnapshot = await getDocs(cartRef);
      const count = querySnapshot.size;

      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count ? 'inline-block' : 'none';
      });
    } catch (error) {
      console.error("Error updating cart count:", error);
    }
  },

  fetchProducts: async function (shopId) {
    try {
      const snapshot = await getDocs(
        query(collection(db, "products"), where("shopId", "==", shopId))
      );
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.error("Error loading products:", error);
      return [];
    }
  },

  renderProducts: function (products) {
    const productList = document.getElementById("product-list");
    productList.innerHTML = products.map(product => `
      <li class="list-group-item" data-product-id="${product.id}">
        <div class="d-flex align-items-center">
          <img src="${product.imageUrl || 'placeholder.jpg'}" 
               class="mr-3" style="width: 80px; height: 80px; object-fit: cover;"
               alt="${product.name || 'Product image'}">
          <div class="flex-grow-1">
            <h5>${product.name || "Unnamed Product"}</h5>
            <p>${product.description || ""}</p>
            <strong>₹${product.price || "0"}</strong>
          </div>
          <div class="btn-group ml-2" role="group">
            <button class="btn btn-primary add-to-cart" title="Add to Cart">
              <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
            <button class="btn btn-outline-secondary compare-btn" title="Compare">
              <i class="fas fa-balance-scale"></i>
            </button>
          </div>
        </div>
      </li>
    `).join('');

    // Add event listeners
    productList.querySelectorAll('li').forEach(li => {
      const productId = li.getAttribute('data-product-id');
      const product = products.find(p => p.id === productId);

      li.querySelector('.add-to-cart').addEventListener('click', () => {
        this.addToCart(product);
      });

      li.querySelector('.compare-btn').addEventListener('click', () => {
        this.addToComparison(product);
      });
    });
  },

  filterProducts: function () {
    const searchInputElem = document.getElementById('search-input');
    const minPriceElem = document.getElementById('min-price');
    const maxPriceElem = document.getElementById('max-price');

    if (!searchInputElem || !minPriceElem || !maxPriceElem) {
      console.error("Filter input elements not found");
      return;
    }

    const searchInput = searchInputElem.value.toLowerCase();
    const minPriceInput = parseFloat(minPriceElem.value);
    const maxPriceInput = parseFloat(maxPriceElem.value);

    const filtered = this.allProducts.filter(product => {
      const name = product.name || "";
      const price = product.price || 0;
      const matchesName = name.toLowerCase().includes(searchInput);
      const matchesMinPrice = isNaN(minPriceInput) ? true : price >= minPriceInput;
      const matchesMaxPrice = isNaN(maxPriceInput) ? true : price <= maxPriceInput;
      return matchesName && matchesMinPrice && matchesMaxPrice;
    });

    this.renderProducts(filtered);
  },

  addToComparison: function (product) {
    if (this.comparisonProducts.some(p => p.id === product.id)) {
      alert("This product is already selected for comparison");
      return;
    }

    this.comparisonProducts.push(product);

    const toast = document.createElement('div');
    toast.className = 'alert alert-info position-fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.textContent = `Added ${product.name} to comparison (${this.comparisonProducts.length}/2)`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);

    if (this.comparisonProducts.length >= 2) {
      const compareBtn = document.getElementById('compareBtn');
      if (compareBtn) {
        compareBtn.style.display = 'block';
        compareBtn.onclick = () => this.showComparison();
      }
    }
  },

  showComparison: function () {
    const modalContent = document.getElementById('comparisonContent');
    modalContent.innerHTML = `
      <div class="row">
        ${this.comparisonProducts.map(product => `
          <div class="col-md-6">
            <h4>${product.name}</h4>
            <img src="${product.imageUrl}" class="img-fluid mb-3" alt="${product.name}">
            <p><strong>Price:</strong> ₹${product.price}</p>
            <p>${product.description || 'No description available'}</p>
          </div>
        `).join('')}
      </div>
    `;
    $('#comparisonModal').modal('show');
  },

  init: async function () {
    const self = this;
    const shopId = new URLSearchParams(window.location.search).get("id");
    if (!shopId) {
      document.getElementById("shop-name").textContent = "Shop Not Found";
      return;
    }

    this.createComparisonModal();
    this.allProducts = await this.fetchProducts(shopId);
    this.updateCartCount();
    this.renderProducts(this.allProducts);

    // Add filter event listeners with correct 'this' context
    const searchInputElem = document.getElementById('search-input');
    const minPriceElem = document.getElementById('min-price');
    const maxPriceElem = document.getElementById('max-price');

    if (searchInputElem) {
      searchInputElem.addEventListener('input', function() {
        self.filterProducts();
      });
    } else {
      console.error("Search input element not found");
    }

    if (minPriceElem) {
      minPriceElem.addEventListener('input', function() {
        self.filterProducts();
      });
    } else {
      console.error("Min price input element not found");
    }

    if (maxPriceElem) {
      maxPriceElem.addEventListener('input', function() {
        self.filterProducts();
      });
    } else {
      console.error("Max price input element not found");
    }
  }
};

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  const compareBtn = document.createElement('button');
  compareBtn.id = 'compareBtn';
  compareBtn.className = 'btn btn-info position-fixed';
  compareBtn.style.bottom = '20px';
  compareBtn.style.right = '20px';
  compareBtn.style.display = 'none';
  compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i> Compare Products';
  document.body.appendChild(compareBtn);

  shopFunctions.init();
});
