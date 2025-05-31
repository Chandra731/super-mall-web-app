import { auth, db } from './firebase-config.js';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  runTransaction,
  getDocs,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  const orderItemsList = document.getElementById('order-items-list');
  const orderTotalElem = document.getElementById('order-total');
  const paymentForm = document.getElementById('payment-form');
  const paymentMessage = document.getElementById('payment-message');

  let orderData = null;

  // Load order data from sessionStorage
  function loadOrderData() {
    const data = sessionStorage.getItem('orderData');
    if (!data) {
      alert('No order data found. Redirecting to cart.');
      window.location.href = 'cart.html';
      return null;
    }
    return JSON.parse(data);
  }

  // Render order summary
  function renderOrderSummary(order) {
    orderItemsList.innerHTML = '';
    order.items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.textContent = `${item.name} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`;
      orderItemsList.appendChild(li);
    });
    orderTotalElem.textContent = order.total.toFixed(2);
  }

  // Create Razorpay order by calling backend
  async function createRazorpayOrder(amount) {
    try {
      const response = await fetch('http://localhost:5001/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await response.json();
      if (data.success) {
        return data.order;
      } else {
        throw new Error('Failed to create Razorpay order');
      }
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Open Razorpay checkout
  async function openRazorpayCheckout(order, user, orderData, paymentMethod, paymentDetails) {
    return new Promise((resolve, reject) => {
      const options = {
        key: 'rzp_test_aInlr2JkOeUewn',
        amount: order.amount,
        currency: order.currency,
        name: "Divya's Super Mall",
        description: 'Test Transaction',
        order_id: order.id,
        handler: async function (response) {
          console.log('Razorpay payment handler called with response:', response);
          try {
            // On successful payment, store transaction in Firestore
            const transactionIds = await storeTransaction(user.uid, orderData, paymentMethod, {
              ...paymentDetails,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            console.log('Transaction stored with IDs:', transactionIds);
            resolve(transactionIds);
          } catch (error) {
            console.error('Error in payment handler:', error);
            reject(error);
          }
        },
        prefill: {
          email: user.email
        },
        theme: {
          color: '#3399cc'
        }
      };
      // Load Razorpay script dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const rzp = new Razorpay(options);
        rzp.open();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Razorpay SDK'));
      };
      document.body.appendChild(script);
    });
  }

  // Store transaction in Firestore, creating separate orders per shop
  async function storeTransaction(userId, order, paymentMethod, paymentDetails) {
    try {
      console.log('Storing transaction with data:', {
        userId,
        order,
        paymentMethod,
        paymentDetails
      });

      // Validate createdAt fields in order items
      if (order.items) {
        order.items.forEach(item => {
          if (item.createdAt == null) {
            item.createdAt = new Date();
          }
        });
      }

      // Group items by shopId
      const itemsByShop = {};
      for (const item of order.items) {
        if (!item.shopId) {
          throw new Error('Missing shopId in order item: ' + item.name);
        }
        if (!itemsByShop[item.shopId]) {
          itemsByShop[item.shopId] = [];
        }
        itemsByShop[item.shopId].push(item);
      }

      const transactionIds = [];

      // Create separate order and transaction documents per shop
      for (const shopId of Object.keys(itemsByShop)) {
        const shopItems = itemsByShop[shopId];
        const totalForShop = shopItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        // Get ownerId for the shop
        const shopDoc = await getDoc(doc(db, 'shops', shopId));
        const ownerId = shopDoc.exists() ? shopDoc.data().ownerId : null;

        // Create order document with ownerId
        const orderRef = await addDoc(collection(db, 'orders'), {
          userId,
          shopId,
          ownerId,
          items: shopItems,
          total: totalForShop,
          status: 'pending',
          createdAt: new Date()
        });
        const orderId = orderRef.id;

        // Create transaction document
        const transactionData = {
          userId,
          orderId,
          items: shopItems,
          total: totalForShop,
          paymentMethod,
          paymentDetails,
          status: 'completed',
          createdAt: new Date()
        };

        const transactionRef = await addDoc(collection(db, 'transactions'), transactionData);
        transactionIds.push(transactionRef.id);

        // Update order status to 'paid'
        const orderDocRef = doc(db, 'orders', orderId);
        await updateDoc(orderDocRef, { status: 'paid' });

        // Decrement product quantities atomically using runTransaction function
        for (const item of shopItems) {
          const productRef = doc(db, 'products', item.productId);
          await runTransaction(db, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
              throw new Error('Product does not exist: ' + item.productId);
            }
            const currentQuantity = productDoc.data().quantity || 0;
            const newQuantity = currentQuantity - item.quantity;
            if (newQuantity < 0) {
              throw new Error('Insufficient stock for product: ' + item.productId);
            }
            transaction.update(productRef, { quantity: newQuantity });
          });
        }
      }

      // Clear user's cart after successful payment using batch
      const cartItemsSnapshot = await getDocs(collection(db, 'carts', userId, 'items'));
      const batch = writeBatch(db);
      cartItemsSnapshot.forEach(docSnap => {
        batch.delete(doc(db, 'carts', userId, 'items', docSnap.id));
      });
      await batch.commit();

      return transactionIds;
    } catch (error) {
      console.error('Error storing transaction:', error);
      throw error;
    }
  }

  // Initialize
  orderData = loadOrderData();
  if (!orderData) return;
  renderOrderSummary(orderData);

  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    paymentMessage.style.display = 'none';

    // Since payment method selection is removed, pass a default value
    const method = 'razorpay';
    const paymentDetails = {};

    paymentMessage.textContent = 'Processing payment... Please wait.';

    try {
      const user = auth.currentUser;
      if (!user) {
        alert('User not authenticated. Please login again.');
        window.location.href = 'login.html';
        return;
      }

      // Create Razorpay order
      const razorpayOrder = await createRazorpayOrder(orderData.total);

      // Open Razorpay checkout
      const transactionIds = await openRazorpayCheckout(razorpayOrder, user, orderData, method, paymentDetails);

      console.log('Payment successful, transaction IDs:', transactionIds);
      paymentMessage.textContent = 'Payment successful! Transaction IDs: ' + transactionIds.join(', ');

      // Clear order data from sessionStorage
      sessionStorage.removeItem('orderData');

      // Redirect to orders page immediately after successful payment
      // Add a small delay to ensure Firestore update completes before redirect
      setTimeout(() => {
        console.log('Redirecting to orders.html');
        window.location.href = 'orders.html';
      }, 500);
    } catch (error) {
      console.error('Payment submission error:', error);
      paymentMessage.textContent = 'Payment failed. Please try again.';
    }
  });
});
