import { db } from './firebase-config.js';
import { collection, query, where, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

export async function fetchShopsProductsSalesReport(filter) {
  const { startDate, endDate } = getDateRange(filter);

  const shopsSnapshot = await getDocs(collection(db, 'shops'));
  const shops = [];
  for (const shopDoc of shopsSnapshot.docs) {
    const shopId = shopDoc.id;
    const shopData = shopDoc.data();

    const productsSnapshot = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
    const totalProducts = productsSnapshot.size;

    let totalSales = 0;
    const ordersQuery = query(
      collection(db, 'orders'),
      where('shopId', '==', shopId),
      where('orderDate', '>=', Timestamp.fromDate(startDate)),
      where('orderDate', '<=', Timestamp.fromDate(endDate))
    );
    const ordersSnapshot = await getDocs(ordersQuery);
    ordersSnapshot.forEach(orderDoc => {
      const orderData = orderDoc.data();
      totalSales += orderData.totalAmount || 0;
    });

    shops.push({
      shopName: shopData.name,
      totalProducts,
      totalSales: totalSales.toFixed(2)
    });
  }
  return shops;
}

function getDateRange(filter) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (filter) {
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }
  return { startDate, endDate };
}
