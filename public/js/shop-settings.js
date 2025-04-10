import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const shopInfoForm = document.getElementById('shop-info-form');
  const businessHoursForm = document.getElementById('business-hours-form');
  const notificationsForm = document.getElementById('notifications-form');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Load existing settings
      const shopDoc = await getDoc(doc(db, 'shops', user.uid));
      if (shopDoc.exists()) {
        const shopData = shopDoc.data();
        
        // Populate shop info form
        document.getElementById('shop-name').value = shopData.name || '';
        document.getElementById('shop-description').value = shopData.description || '';
        document.getElementById('shop-email').value = shopData.contactEmail || '';
        document.getElementById('shop-phone').value = shopData.phone || '';

        // Populate business hours
        if (shopData.businessHours) {
          document.getElementById('opening-time').value = shopData.businessHours.opening || '';
          document.getElementById('closing-time').value = shopData.businessHours.closing || '';
          document.getElementById('open-weekends').checked = shopData.businessHours.openWeekends || false;
        }

        // Populate notifications
        if (shopData.notifications) {
          document.getElementById('email-notifications').checked = shopData.notifications.email || false;
          document.getElementById('sms-notifications').checked = shopData.notifications.sms || false;
          document.getElementById('promo-notifications').checked = shopData.notifications.promo || false;
        }
      }

      // Save shop info
      shopInfoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await setDoc(doc(db, 'shops', user.uid), {
          name: document.getElementById('shop-name').value,
          description: document.getElementById('shop-description').value,
          contactEmail: document.getElementById('shop-email').value,
          phone: document.getElementById('shop-phone').value
        }, { merge: true });
        alert('Shop information updated successfully!');
      });

      // Save business hours
      businessHoursForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await setDoc(doc(db, 'shops', user.uid), {
          businessHours: {
            opening: document.getElementById('opening-time').value,
            closing: document.getElementById('closing-time').value,
            openWeekends: document.getElementById('open-weekends').checked
          }
        }, { merge: true });
        alert('Business hours updated successfully!');
      });

      // Save notifications
      notificationsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await setDoc(doc(db, 'shops', user.uid), {
          notifications: {
            email: document.getElementById('email-notifications').checked,
            sms: document.getElementById('sms-notifications').checked,
            promo: document.getElementById('promo-notifications').checked
          }
        }, { merge: true });
        alert('Notification preferences updated successfully!');
      });
    }
  });
});
