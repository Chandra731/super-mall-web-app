// Import Firebase modules
import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// Initialize AOS animations
AOS.init({
    duration: 1000,
    easing: 'ease-in-out',
    once: true,
    mirror: false,
});

// DOM elements
const greetingMessage = document.getElementById('greeting-message');
const loginButton = document.getElementById('login-btn');
const profileIcon = document.getElementById('profile-icon');
const logoutButton = document.getElementById('logout-btn');
const contactForm = document.getElementById('contact-form');

// Handle authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in
        greetingMessage.innerHTML = `Welcome, <strong>${user.displayName || user.email}</strong>!`;
        greetingMessage.style.display = 'block';
        profileIcon.style.display = 'block';
        loginButton.style.display = 'none';
        contactForm.style.display = 'block';
    } else {
        // User is not logged in
        greetingMessage.innerHTML = '';
        greetingMessage.style.display = 'none';
        profileIcon.style.display = 'none';
        loginButton.style.display = 'block';
        contactForm.style.display = 'none';
    }
});

// Logout functionality
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert('You have been logged out.');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error.message);
    }
});

// Handle Contact Form Submission
contactForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Get user details
    const user = auth.currentUser;

    if (!user) {
        alert('Please log in to submit the form.');
        return;
    }

    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    if (!name || !email || !message) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        // Add the message to Firestore
        await addDoc(collection(db, 'messages'), {
            userId: user.uid,
            name: name,
            email: email,
            message: message,
            timestamp: serverTimestamp()
        });

        alert('Your message has been sent successfully!');
        contactForm.reset();
    } catch (error) {
        alert('Error submitting message: ' + error.message);
    }
});

// Example content for shops, offers, and reviews
const exampleShops = [
    { name: "Shop 1", description: "Find the latest fashion trends at Shop 1.", image: "images/shop1.jpg" },
    { name: "Shop 2", description: "Discover a variety of electronics at Shop 2.", image: "images/shop2.jpg" },
    { name: "Shop 3", description: "Get your groceries at the best prices from Shop 3.", image: "images/shop3.jpg" }
];

const exampleOffers = [
    { title: "Offer 1", description: "Get 50% off on select items at Shop 1.", image: "images/offer1.jpg" },
    { title: "Offer 2", description: "Buy one get one free at Shop 2.", image: "images/offer2.jpg" },
    { title: "Offer 3", description: "Save 20% on your first purchase at Shop 3.", image: "images/offer3.jpg" }
];

const exampleReviews = [
    { name: "John Doe", rating: "⭐⭐⭐⭐⭐", text: "Amazing shopping experience! Will definitely visit again." },
    { name: "Jane Smith", rating: "⭐⭐⭐⭐", text: "Great variety of shops and excellent customer service." },
    { name: "Michael Brown", rating: "⭐⭐⭐⭐⭐", text: "Best deals and offers! Highly recommend ShopEase." }
];

// Function to render example content
function renderExampleContent() {
    const shopsList = document.querySelector('.shops-section .card-columns');
    const offersList = document.querySelector('.offers-section .card-columns');
    const reviewsList = document.querySelector('.reviews-section .card-columns');

    exampleShops.forEach(shop => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-aos', 'fade-up');
        card.innerHTML = `
            <img src="${shop.image}" class="card-img-top" alt="${shop.name}">
            <div class="card-body">
                <h5 class="card-title">${shop.name}</h5>
                <p class="card-text">${shop.description}</p>
            </div>
        `;
        shopsList.appendChild(card);
    });

    exampleOffers.forEach(offer => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-aos', 'fade-up');
        card.innerHTML = `
            <img src="${offer.image}" class="card-img-top" alt="${offer.title}">
            <div class="card-body">
                <h5 class="card-title">${offer.title}</h5>
                <p class="card-text">${offer.description}</p>
            </div>
        `;
        offersList.appendChild(card);
    });

    exampleReviews.forEach(review => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-aos', 'fade-up');
        card.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${review.name}</h5>
                <p class="card-text">${review.rating}</p>
                <p class="card-text">"${review.text}"</p>
            </div>
        `;
        reviewsList.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', renderExampleContent);