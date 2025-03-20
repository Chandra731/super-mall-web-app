import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to load pending products
async function loadPendingProducts() {
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);

    let productListHTML = "";
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        productListHTML += `
            <div class="product-card">
                <img src="${product.imageURL}" alt="${product.productName}" />
                <h3>${product.productName}</h3>
                <p>Price: ₹${product.price}</p>
                <p>Store: ${product.shopName} (Floor: ${product.floor})</p>
                <button onclick="approveProduct('${doc.id}')">✅ Approve</button>
                <button onclick="rejectProduct('${doc.id}')">❌ Reject</button>
            </div>
        `;
    });

    document.getElementById("pendingProducts").innerHTML = productListHTML;
}

// Function to approve a product
async function approveProduct(productId) {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, { status: "approved" });
    alert("Product Approved!");
    loadPendingProducts();
}

// Function to reject a product
async function rejectProduct(productId) {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, { status: "rejected" });
    alert("Product Rejected!");
    loadPendingProducts();
}

// Function to load users
async function loadUsers() {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);

    let userListHTML = "";
    querySnapshot.forEach((doc) => {
        const user = doc.data();
        userListHTML += `
            <tr>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.storeName || 'N/A'}</td>
                <td>${user.status}</td>
                <td>
                    <button onclick="suspendUser('${doc.id}')">🚫 Suspend</button>
                    <button onclick="deleteUser('${doc.id}')">🗑️ Delete</button>
                </td>
            </tr>
        `;
    });

    document.getElementById("userList").innerHTML = userListHTML;
}

// Function to suspend a user
async function suspendUser(userId) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { status: "suspended" });
    alert("User Suspended!");
    loadUsers();
}

// Function to delete a user
async function deleteUser(userId) {
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
    alert("User Deleted!");
    loadUsers();
}

// Function to load store performance chart
async function loadStorePerformanceChart() {
    // Fetch data from Firestore and populate the chart
    const salesData = [12000, 18000, 15000, 22000, 17000]; // Example data
    new Chart(document.getElementById("storePerformanceChart"), {
        type: "bar",
        data: {
            labels: ["Store 1", "Store 2", "Store 3", "Store 4", "Store 5"],
            datasets: [{
                label: "Sales (₹)",
                data: salesData,
                backgroundColor: ["#4CAF50", "#FF9800", "#F44336", "#2196F3", "#9C27B0"]
            }]
        }
    });
}

// Function to load floor analysis chart
async function loadFloorAnalysisChart() {
    // Fetch data from Firestore and populate the chart
    const floorData = [5, 8, 3, 2]; // Example data
    new Chart(document.getElementById("floorAnalysisChart"), {
        type: "pie",
        data: {
            labels: ["Floor 1", "Floor 2", "Floor 3", "Floor 4"],
            datasets: [{
                label: "Active Stores",
                data: floorData,
                backgroundColor: ["#4CAF50", "#FF9800", "#F44336", "#2196F3"]
            }]
        }
    });
}

// Function to load sales report chart
async function loadSalesReportChart() {
    // Fetch data from Firestore and populate the chart
    const salesData = [50000, 60000, 70000, 80000, 90000]; // Example data
    new Chart(document.getElementById("salesReportChart"), {
        type: "line",
        data: {
            labels: ["January", "February", "March", "April", "May"],
            datasets: [{
                label: "Total Sales (₹)",
                data: salesData,
                borderColor: "#4CAF50",
                fill: false
            }]
        }
    });
}

// Load data on page load
window.onload = () => {
    loadPendingProducts();
    loadUsers();
    loadStorePerformanceChart();
    loadFloorAnalysisChart();
    loadSalesReportChart();
};