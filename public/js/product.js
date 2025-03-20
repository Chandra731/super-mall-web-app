import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to add a new product
async function addProduct() {
    const user = auth.currentUser;
    if (!user) {
        alert("Please log in first!");
        return;
    }

    const shopOwnerId = user.uid; // Get shop owner's ID
    const shopName = document.getElementById("shopName").value;
    const floor = document.getElementById("floor").value;
    const mallLocation = document.getElementById("mallLocation").value;
    const productName = document.getElementById("productName").value;
    const category = document.getElementById("category").value;
    const price = parseFloat(document.getElementById("price").value);
    const stock = parseInt(document.getElementById("stock").value);
    const description = document.getElementById("description").value;
    const imageURL = document.getElementById("imageURL").value;  // This will be uploaded via Firebase Storage

    try {
        await addDoc(collection(db, "products"), {
            shopOwnerId,
            shopName,
            floor,
            mallLocation,
            productName,
            category,
            price,
            stock,
            imageURL,
            description,
            status: "pending", // Admin needs to approve
            createdAt: new Date().toISOString()
        });

        alert("Product added successfully! Waiting for admin approval.");
        window.location.reload();
    } catch (error) {
        alert("Error adding product: " + error.message);
    }
}

// Function to load products
async function loadProducts() {
    const user = auth.currentUser;
    if (!user) {
        alert("Please log in first!");
        return;
    }

    const productsRef = collection(db, "products");
    const q = query(productsRef, where("shopOwnerId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    let productListHTML = "";
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        productListHTML += `
            <div class="product-card">
                <img src="${product.imageURL}" alt="${product.productName}" />
                <h3>${product.productName}</h3>
                <p>Price: ₹${product.price}</p>
                <p>Stock: ${product.stock}</p>
                <p>Status: ${product.status}</p>
                <button onclick="editProduct('${doc.id}')">Edit</button>
                <button onclick="deleteProduct('${doc.id}')">Delete</button>
            </div>
        `;
    });

    document.getElementById("productList").innerHTML = productListHTML;
}

// Function to delete a product
window.deleteProduct = async function(productId) {
    try {
        await deleteDoc(doc(db, "products", productId));
        alert("Product deleted successfully!");
        loadProducts();
    } catch (error) {
        alert("Error deleting product: " + error.message);
    }
}

// Call this function on page load
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("shopName").value = "Nike Store"; // Replace with actual shop name
        document.getElementById("floor").value = 2; // Replace with actual floor
        document.getElementById("mallLocation").value = "Second Floor - A12"; // Replace with actual mall location
        loadProducts();
    }
});