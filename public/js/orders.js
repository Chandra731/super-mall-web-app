import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let userId;

onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        loadOrders();
    } else {
        window.location.href = "login.html";
    }
});

// Function to load orders
async function loadOrders() {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    let ordersHTML = "";
    querySnapshot.forEach((doc) => {
        const order = doc.data();
        ordersHTML += `
            <div class="order">
                <h3>Order #${doc.id}</h3>
                <p>Status: ${order.status}</p>
                <p>Total: ₹${order.totalAmount}</p>
                <button onclick="reorder('${doc.id}')">🔄 Reorder</button>
            </div>
        `;
    });

    document.getElementById("ordersList").innerHTML = ordersHTML;
}

// Function to reorder previous orders
window.reorder = async function(orderId) {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) return;

    const orderData = orderSnap.data();
    const cartRef = doc(db, "cart", userId);
    await updateDoc(cartRef, {
        items: orderData.items,
        totalPrice: orderData.totalAmount
    });

    alert("Items added to cart!");
    window.location.href = "cart.html";
}