import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let userId;

onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        loadCart();
    } else {
        window.location.href = "login.html";
    }
});

// Function to load cart items
async function loadCart() {
    const cartRef = doc(db, "cart", userId);
    const cartSnap = await getDoc(cartRef);

    if (!cartSnap.exists()) {
        document.getElementById("cartItems").innerHTML = "<p>Your cart is empty!</p>";
        return;
    }

    const cartData = cartSnap.data();
    let cartHTML = "";
    
    cartData.items.forEach(item => {
        cartHTML += `
            <div class="cart-item">
                <img src="${item.imageURL}" alt="${item.productName}">
                <h3>${item.productName}</h3>
                <p>₹${item.price} x ${item.quantity}</p>
                <button onclick="removeFromCart('${item.productId}')">❌ Remove</button>
            </div>
        `;
    });

    document.getElementById("cartItems").innerHTML = cartHTML;
    document.getElementById("totalPrice").innerText = `Total: ₹${cartData.totalPrice}`;
}

// Function to remove product from cart
window.removeFromCart = async function(productId) {
    const cartRef = doc(db, "cart", userId);
    const cartSnap = await getDoc(cartRef);

    if (!cartSnap.exists()) return;

    let cartData = cartSnap.data();
    cartData.items = cartData.items.filter(item => item.productId !== productId);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    await updateDoc(cartRef, cartData);
    alert("Item removed from cart!");
    loadCart();
}

// Function to proceed to checkout
window.checkout = async function() {
    const cartRef = doc(db, "cart", userId);
    const cartSnap = await getDoc(cartRef);

    if (!cartSnap.exists() || cartSnap.data().items.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const cartData = cartSnap.data();
    const orderData = {
        userId: userId,
        items: cartData.items,
        totalAmount: cartData.totalPrice,
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, "orders"), orderData);
    await deleteDoc(cartRef); // Clear cart after placing order

    alert("Order placed successfully!");
    window.location.href = "orders.html";
}