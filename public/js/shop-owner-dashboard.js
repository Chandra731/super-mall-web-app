import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, setDoc, getDoc, query, where, getDocs, collection, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const productForm = document.getElementById('product-form');
  const productIdInput = document.getElementById('product-id');
  const productNameInput = document.getElementById('product-name');
  const productPriceInput = document.getElementById('product-price');
  const productDescriptionInput = document.getElementById('product-description');
  const productImageInput = document.getElementById('product-image');
  const productList = document.getElementById('product-list');
  const deleteProductButton = document.getElementById('delete-product');
  const salesChartCtx = document.getElementById('analyticsChart').getContext('2d');
  const productPerformanceDiv = document.getElementById('productPerformance');

  let currentProductId = null;

  // Initialize sales chart
  const salesChart = new Chart(salesChartCtx, {
    type: 'line',
    data: {
      labels: [], // Dates will be added here
      datasets: [{
        label: 'Sales',
        data: [], // Sales data will be added here
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // Load and render product performance using D3.js
  const renderProductPerformance = (data) => {
    const width = 400;
    const height = 300;
    const svg = d3.select(productPerformanceDiv)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.productName))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.sales)])
      .nice()
      .range([height, 0]);

    svg.append('g')
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.productName))
      .attr('y', d => y(d.sales))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.sales))
      .attr('fill', 'steelblue');

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y));
  };

  // Fetch and render sales data
  const fetchSalesData = async () => {
    const salesData = []; // Fetch sales data from Firestore
    salesChart.data.labels = salesData.map(d => d.date);
    salesChart.data.datasets[0].data = salesData.map(d => d.sales);
    salesChart.update();
  };

  // Fetch and render product performance data
  const fetchProductPerformanceData = async () => {
    const performanceData = []; // Fetch product performance data from Firestore
    renderProductPerformance(performanceData);
  };

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productName = productNameInput.value;
    const productPrice = productPriceInput.value;
    const productDescription = productDescriptionInput.value;
    const productImages = productImageInput.files;

    const userId = auth.currentUser.uid;
    const shopQuery = query(collection(db, 'shops'), where('userId', '==', userId), where('approved', '==', true));
    const shopSnapshot = await getDocs(shopQuery);
    if (!shopSnapshot.empty) {
      const shop = shopSnapshot.docs[0].data().shopId;

      let productId;
      if (currentProductId) {
        productId = currentProductId;
      } else {
        productId = doc(collection(db, 'products')).id;
      }

      const formData = new FormData();
      Array.from(productImages).forEach(image => {
        formData.append('images', image);
      });

      try {
        // Upload images to local storage (Node.js server)
        const response = await fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorResponse = await response.json();
          throw new Error(errorResponse.error);
        }

        const result = await response.json();

        const productData = {
          productId: productId,
          shopId: shop,
          productName: productName,
          productPrice: productPrice,
          productDescription: productDescription,
          productImageUrls: result.imageUrls // Store image URLs in Firestore
        };

        await setDoc(doc(db, 'products', productId), productData);
        currentProductId = null;
        productForm.reset();
        loadProducts();
      } catch (error) {
        alert(error.message);
      }
    }
  });

  const loadProducts = async () => {
    productList.innerHTML = '';
    const userId = auth.currentUser.uid;
    const shopQuery = query(collection(db, 'shops'), where('userId', '==', userId), where('approved', '==', true));
    const shopSnapshot = await getDocs(shopQuery);
    if (!shopSnapshot.empty) {
      const shop = shopSnapshot.docs[0].data().shopId;
      const productQuery = query(collection(db, 'products'), where('shopId', '==', shop));
      const productSnapshot = await getDocs(productQuery);
      productSnapshot.forEach(doc => {
        const product = doc.data();
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.setAttribute('data-aos', 'fade-up');
        listItem.innerHTML = `
          <h4>${product.productName}</h4>
          <p>Price: $${product.productPrice}</p>
          <p>${product.productDescription}</p>
          ${product.productImageUrls.map(url => `<img src="${url}" alt="${product.productName}" class="img-fluid mb-2" style="max-width: 200px;">`).join('')}
          <button class="btn btn-primary" onclick="editProduct('${product.productId}')">Edit</button>
        `;
        productList.appendChild(listItem);
      });
    }
  };

  window.editProduct = async (productId) => {
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (productDoc.exists()) {
      const product = productDoc.data();
      currentProductId = product.productId;
      productIdInput.value = product.productId;
      productNameInput.value = product.productName;
      productPriceInput.value = product.productPrice;
      productDescriptionInput.value = product.productDescription;
      document.getElementById('product-image-preview').src = product.productImageUrls[0];
    }
  };

  deleteProductButton.addEventListener('click', async () => {
    if (currentProductId) {
      try {
        await deleteDoc(doc(db, 'products', currentProductId));
        currentProductId = null;
        productForm.reset();
        loadProducts();
      } catch (error) {
        alert(error.message);
      }
    }
  });

  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      loadProducts();
      fetchSalesData();
      fetchProductPerformanceData();
    }
  });
});