import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const floorSelection = document.getElementById('floor-selection');
  const shopsContainer = document.getElementById('shops-container');
  const floorTitle = document.getElementById('floor-title');
  const shopsList = document.getElementById('shops-list');
  const backToFloors = document.getElementById('back-to-floors');
  const shopDetailsModal = new bootstrap.Modal(document.getElementById('shopDetailsModal'));
  const shopDetailsModalTitle = document.getElementById('shopDetailsModalTitle');
  const shopDetailsContent = document.getElementById('shopDetailsContent');

  // Handle floor selection
  floorSelection.addEventListener('click', async (e) => {
    const floorCard = e.target.closest('.floor-card');
    if (!floorCard) return;

    const floor = floorCard.dataset.floor;
    await loadShopsForFloor(floor);
  });

  // Back to floors button
  backToFloors.addEventListener('click', () => {
    shopsContainer.style.display = 'none';
    floorSelection.style.display = 'flex';
  });

  // Load shops for selected floor
  async function loadShopsForFloor(floor) {
    try {
      const q = query(collection(db, 'shops'), where('floor', '==', floor));
      const querySnapshot = await getDocs(q);
      
      shopsList.innerHTML = '';
      querySnapshot.forEach((doc) => {
        const shop = doc.data();
        const shopCard = createShopCard(shop, doc.id);
        shopsList.appendChild(shopCard);
      });

      // Update UI
      floorTitle.textContent = `${floor.charAt(0).toUpperCase() + floor.slice(1)} Floor Shops`;
      floorSelection.style.display = 'none';
      shopsContainer.style.display = 'block';
    } catch (error) {
      console.error('Error loading shops:', error);
      alert('Failed to load shops. Please try again.');
    }
  }

  // Create shop card element
  function createShopCard(shop, shopId) {
    const col = document.createElement('div');
    col.className = 'col-md-4';

    const card = document.createElement('div');
    card.className = 'card shop-card';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    // Shop logo
    if (shop.logoUrl) {
      const img = document.createElement('img');
      img.src = shop.logoUrl;
      img.alt = `${shop.name} logo`;
      img.className = 'shop-logo img-fluid mb-3 mx-auto d-block';
      cardBody.appendChild(img);
    }

    // Shop name
    const title = document.createElement('h3');
    title.className = 'card-title text-center';
    title.textContent = shop.name;
    cardBody.appendChild(title);

    // Shop category
    const category = document.createElement('p');
    category.className = 'text-muted text-center';
    category.textContent = shop.category;
    cardBody.appendChild(category);

    // Action buttons
    const btnGroup = document.createElement('div');
    btnGroup.className = 'd-flex justify-content-between mt-3';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-outline-primary';
    detailsBtn.textContent = 'Know More';
    detailsBtn.addEventListener('click', () => showShopDetails(shop));
    btnGroup.appendChild(detailsBtn);

    const productsBtn = document.createElement('button');
    productsBtn.className = 'btn btn-primary';
    productsBtn.textContent = 'See Products';
    productsBtn.addEventListener('click', () => {
      window.location.href = `shop.html?id=${shopId}`;
    });
    btnGroup.appendChild(productsBtn);

    cardBody.appendChild(btnGroup);
    card.appendChild(cardBody);
    col.appendChild(card);

    return col;
  }

  // Show shop details modal
  function showShopDetails(shop) {
    shopDetailsModalTitle.textContent = shop.name;
    
    let content = `
      <div class="row">
        <div class="col-md-4">
          ${shop.logoUrl ? `<img src="${shop.logoUrl}" class="img-fluid mb-3" alt="${shop.name} logo">` : ''}
        </div>
        <div class="col-md-8">
          <p><strong>Category:</strong> ${shop.category}</p>
          <p><strong>Floor:</strong> ${shop.floor}</p>
          <p><strong>Description:</strong> ${shop.description}</p>
          <p><strong>Contact:</strong> ${shop.contactEmail} | ${shop.phone}</p>
          <h4 class="mt-4">Business Hours</h4>
          <p>${shop.businessHours?.opening || '09:00'} - ${shop.businessHours?.closing || '21:00'}</p>
          <p>${shop.businessHours?.openWeekends ? 'Open' : 'Closed'} on weekends</p>
        </div>
      </div>
    `;
    
    shopDetailsContent.innerHTML = content;
    shopDetailsModal.show();
  }
});
