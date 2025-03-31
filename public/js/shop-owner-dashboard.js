import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, setDoc, getDoc, query, where, getDocs, collection, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function () {
  const productForm = document.getElementById('product-form');
  const productIdInput = document.getElementById('product-id');
  const productNameInput = document.getElementById('product-name');
  const productPriceInput = document.getElementById('product-price');
  const productDescriptionInput = document.getElementById('product-description');
  const productImageInput = document.getElementById('product-image');
  const productImagePreview = document.getElementById('product-image-preview');
  const productList = document.getElementById('product-list');
  const deleteProductButton = document.getElementById('delete-product');
  let currentProductId = null;

  /** Handles Adding & Updating Products */
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productName = productNameInput.value.trim();
    const productPrice = productPriceInput.value.trim();
    const productDescription = productDescriptionInput.value.trim();
    const productImage = productImageInput.files[0];

    if (!productName || !productPrice || !productDescription) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error("User not logged in.");

      const shopQuery = query(collection(db, 'shops'), where('userId', '==', userId), where('approved', '==', true));
      const shopSnapshot = await getDocs(shopQuery);
      
      if (!shopSnapshot.empty) {
        const shop = shopSnapshot.docs[0].data().shopId;
        let productId = currentProductId || doc(collection(db, 'products')).id;
        let productImageUrl = productImagePreview ? productImagePreview.src : ''; // Keep existing image if no new upload

        /** Upload new image if selected */
        if (productImage) {
          const formData = new FormData();
          formData.append('productImage', productImage);

          const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          productImageUrl = result.imageUrl;
        }

        /** Prepare product data */
        const productData = {
          productId,
          shopId: shop,
          productName,
          productPrice,
          productDescription,
          productImageUrl
        };

        await setDoc(doc(db, 'products', productId), productData);
        currentProductId = null;
        productForm.reset();
        if (productImagePreview) productImagePreview.src = ''; // Clear preview
        loadProducts();
      }
    } catch (error) {
      console.error("Error adding/updating product:", error);
      alert(error.message);
    }
  });

  /** Loads Products */
  const loadProducts = async () => {
    productList.innerHTML = '';
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const shopQuery = query(collection(db, 'shops'), where('userId', '==', userId), where('approved', '==', true));
    const shopSnapshot = await getDocs(shopQuery);
    
    if (!shopSnapshot.empty) {
      const shop = shopSnapshot.docs[0].data().shopId;
      const productQuery = query(collection(db, 'products'), where('shopId', '==', shop));
      const productSnapshot = await getDocs(productQuery);

      if (productSnapshot.empty) {
        productList.innerHTML = '<p>No products available.</p>';
        return;
      }

      productSnapshot.forEach(doc => {
        const product = doc.data();
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
          <h4>${product.productName}</h4>
          <p>Price: $${product.productPrice}</p>
          <p>${product.productDescription}</p>
          <img src="${product.productImageUrl || 'default-placeholder.jpg'}" alt="${product.productName}" class="img-fluid">
          <button class="btn btn-primary" onclick="editProduct('${product.productId}')">Edit</button>
        `;
        productList.appendChild(listItem);
      });
    }
  };

  /** Handles Editing Products */
  window.editProduct = async (productId) => {
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (productDoc.exists()) {
      const product = productDoc.data();
      currentProductId = product.productId;
      productIdInput.value = product.productId;
      productNameInput.value = product.productName;
      productPriceInput.value = product.productPrice;
      productDescriptionInput.value = product.productDescription;

      // Ensure preview exists before setting src
      if (productImagePreview) {
        productImagePreview.src = product.productImageUrl || 'default-placeholder.jpg';
      }
    }
  };

  /** Handles Product Deletion */
  deleteProductButton.addEventListener('click', async () => {
    if (currentProductId) {
      try {
        await deleteDoc(doc(db, 'products', currentProductId));
        currentProductId = null;
        productForm.reset();
        if (productImagePreview) productImagePreview.src = ''; // Clear preview
        loadProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        alert(error.message);
      }
    }
  });

  /** Handles Logout */
  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  /** Ensures User is Logged In */
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      loadProducts();
    }
  });
});
