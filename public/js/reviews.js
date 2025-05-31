import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async function () {
  const reviewForm = document.getElementById('review-form');
  const reviewList = document.getElementById('review-list');
  const btnProductReviews = document.getElementById('btn-product-reviews');
  const btnMallReviews = document.getElementById('btn-mall-reviews');

  let currentReviewType = 'product'; // 'product' or 'mall'

  // Helper to fetch user names for userIds
  const fetchUserNames = async (userIds) => {
    const userNameMap = {};
    for (const userId of userIds) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userNameMap[userId] = userData.name || userData.email || 'Unknown User';
        } else {
          userNameMap[userId] = 'Unknown User';
        }
      } catch (error) {
        console.error('Error fetching user data for userId:', userId, error);
        userNameMap[userId] = 'Unknown User';
      }
    }
    return userNameMap;
  };

  const fetchReviews = async (type) => {
    // Fetch recent reviews ordered by timestamp descending, limit 10 for performance
    const reviewsQuery = query(
      collection(db, 'reviews'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    try {
      const reviewsSnapshot = await getDocs(reviewsQuery);

      reviewList.innerHTML = '';
      if (reviewsSnapshot.empty) {
        reviewList.innerHTML = '<p class="text-center">No reviews found.</p>';
        return;
      }

      // Filter reviews client-side based on type
      const filteredReviews = [];
      const userIdsSet = new Set();
      reviewsSnapshot.forEach(doc => {
        const review = doc.data();
        if (type === 'product' && review.productId && review.productId !== '') {
          filteredReviews.push(review);
          userIdsSet.add(review.userId);
        } else if (type === 'mall' && (!review.productId || review.productId === '')) {
          filteredReviews.push(review);
          userIdsSet.add(review.userId);
        }
      });

      // Limit to 3 reviews
      const limitedReviews = filteredReviews.slice(0, 3);

      if (limitedReviews.length === 0) {
        reviewList.innerHTML = '<p class="text-center">No reviews found.</p>';
        return;
      }

      // Fetch user names for userIds
      const userNameMap = await fetchUserNames(Array.from(userIdsSet));

      limitedReviews.forEach(review => {
        const userName = userNameMap[review.userId] || 'Unknown User';
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-4 mb-3';
        colDiv.innerHTML = "<div class=\"card\">\n          <div class=\"card-body\">\n            <h5 class=\"card-title\">" + userName + "</h5>\n            <p class=\"card-text\">" + '⭐'.repeat(review.rating) + "</p>\n            <p class=\"card-text\">\"" + review.review + "\"</p>\n          </div>\n        </div>";
        reviewList.appendChild(colDiv);
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      reviewList.innerHTML = '<p class="text-center text-danger">Failed to load reviews.</p>';
    }
  };

  btnProductReviews.addEventListener('click', () => {
    if (currentReviewType !== 'product') {
      currentReviewType = 'product';
      btnProductReviews.classList.add('active');
      btnMallReviews.classList.remove('active');
      fetchReviews('product');
      // Hide review form for product reviews (since submitted in orders page)
      reviewForm.style.display = 'none';
    }
  });

  btnMallReviews.addEventListener('click', () => {
    if (currentReviewType !== 'mall') {
      currentReviewType = 'mall';
      btnMallReviews.classList.add('active');
      btnProductReviews.classList.remove('active');
      fetchReviews('mall');
      // Show review form for mall reviews
      reviewForm.style.display = 'block';
    }
  });

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to submit a review.');
      return;
    }
    const userId = user.uid;
    const rating = document.getElementById('rating').value;
    const review = document.getElementById('review').value;

    try {
      await addDoc(collection(db, 'reviews'), {
        userId,
        productId: '', // empty for mall reviews
        rating,
        review,
        timestamp: new Date(),
      });
      alert('Review submitted successfully!');
      fetchReviews('mall');
      reviewForm.reset();
    } catch (error) {
      console.error('Error submitting review:', error.message);
      alert('Failed to submit review. Please try again.');
    }
  });

  document.getElementById('logout')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Initially load product reviews and hide form
      fetchReviews('product');
      reviewForm.style.display = 'none';
    } else {
      window.location.href = 'login.html';
    }
  });
});
