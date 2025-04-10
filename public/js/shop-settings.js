import { auth, db, storage } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

// Initialize shop settings
const initShopSettings = async (user) => {
  const shopDoc = await getDoc(doc(db, 'shops', user.uid));
  if (!shopDoc.exists()) {
    await setDoc(doc(db, 'shops', user.uid), {
      name: '',
      category: '',
      floor: '',
      description: '',
      contactEmail: '',
      phone: '',
      businessHours: {
        opening: '09:00',
        closing: '21:00',
        openWeekends: true
      },
      notifications: {
        email: true,
        sms: false,
        promo: true
      },
      createdAt: new Date(),
      lastUpdated: new Date()
    });
  }
  return shopDoc;
};

// Load shop settings
const loadShopSettings = (shopData) => {
  document.getElementById('shop-name').value = shopData.name || '';
  document.getElementById('shop-category').value = shopData.category || '';
  document.getElementById('shop-floor').value = shopData.floor || '';
  document.getElementById('shop-description').value = shopData.description || '';
  document.getElementById('shop-email').value = shopData.contactEmail || '';
  document.getElementById('shop-phone').value = shopData.phone || '';
  
  if (shopData.businessHours) {
    document.getElementById('opening-time').value = shopData.businessHours.opening || '09:00';
    document.getElementById('closing-time').value = shopData.businessHours.closing || '21:00';
    document.getElementById('open-weekends').checked = shopData.businessHours.openWeekends !== false;
  }
  
  if (shopData.notifications) {
    document.getElementById('email-notifications').checked = shopData.notifications.email !== false;
    document.getElementById('sms-notifications').checked = shopData.notifications.sms || false;
    document.getElementById('promo-notifications').checked = shopData.notifications.promo !== false;
  }
};

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
  const forms = {
    info: document.getElementById('shop-info-form'),
    hours: document.getElementById('business-hours-form'),
    notifications: document.getElementById('notifications-form')
  };

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const shopDoc = await initShopSettings(user);
      loadShopSettings(shopDoc.data());

      // Set up form handlers
      forms.info.addEventListener('submit', handleShopInfoSubmit);
      forms.hours.addEventListener('submit', handleBusinessHoursSubmit);
      forms.notifications.addEventListener('submit', handleNotificationsSubmit);
    }
  });
});

// Handle shop info form submission
const handleShopInfoSubmit = async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  const logoFile = document.getElementById('shop-logo').files[0];
  
  try {
    let logoUrl = '';
    if (logoFile) {
      const storageRef = ref(storage, `shop-logos/${user.uid}`);
      await uploadBytes(storageRef, logoFile);
      logoUrl = await getDownloadURL(storageRef);
    }

    await setDoc(doc(db, 'shops', user.uid), {
      name: document.getElementById('shop-name').value,
      category: document.getElementById('shop-category').value,
      floor: document.getElementById('shop-floor').value,
      description: document.getElementById('shop-description').value,
      contactEmail: document.getElementById('shop-email').value,
      phone: document.getElementById('shop-phone').value,
      logoUrl: logoUrl,
      lastUpdated: new Date()
    }, { merge: true });

    alert('Shop information updated successfully!');
  } catch (error) {
    console.error('Error saving shop info:', error);
    alert('Failed to save shop information. Please try again.');
  }
};

// Handle business hours form submission
const handleBusinessHoursSubmit = async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  
  try {
    await setDoc(doc(db, 'shops', user.uid), {
      businessHours: {
        opening: document.getElementById('opening-time').value,
        closing: document.getElementById('closing-time').value,
        openWeekends: document.getElementById('open-weekends').checked
      },
      lastUpdated: new Date()
    }, { merge: true });

    alert('Business hours updated successfully!');
  } catch (error) {
    console.error('Error saving business hours:', error);
    alert('Failed to save business hours. Please try again.');
  }
};

// Handle notifications form submission
const handleNotificationsSubmit = async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  
  try {
    await setDoc(doc(db, 'shops', user.uid), {
      notifications: {
        email: document.getElementById('email-notifications').checked,
        sms: document.getElementById('sms-notifications').checked,
        promo: document.getElementById('promo-notifications').checked
      },
      lastUpdated: new Date()
    }, { merge: true });

    alert('Notification preferences updated successfully!');
  } catch (error) {
    console.error('Error saving notifications:', error);
    alert('Failed to save notification preferences. Please try again.');
  }
};
