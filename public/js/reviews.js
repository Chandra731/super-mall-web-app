import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const reviewForm = document.getElementById('review-form');
  const reviewList = document.getElementById('review-list');

  const fetchReviews = async () => {
    const reviewsQuery = query(collection(db, 'reviews'), orderBy('timestamp', 'desc'));
    const reviewsSnapshot = await getDocs(reviewsQuery);

    reviewList.innerHTML = '';
    reviewsSnapshot.forEach(doc => {
      const review = doc.data();
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item';
      listItem.innerHTML = `
        <h4>Product ID: ${review.productId}</h4>
        <p>Rating: ${review.rating}</p>
        <p>Review: ${review.review}</p>
        <p>Written by: ${review.userId}</p>
        <p>On: ${new Date(review.timestamp.toDate()).toLocaleString()}</p>
      `;
      reviewList.appendChild(listItem);
    });
  };

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = auth.currentUser.uid;
    const productId = document.getElementById('product-id').value;
    const rating = document.getElementById('rating').value;
    const review = document.getElementById('review').value;

    try {
      await addDoc(collection(db, 'reviews'), {
        userId,
        productId,
        rating,
        review,
        timestamp: new Date(),
      });
      alert('Review submitted successfully!');
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error.message);
    }
  });

  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchReviews();
    } else {
      window.location.href = 'login.html';
    }
  });
});