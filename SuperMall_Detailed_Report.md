# SuperMall Project - Detailed Technical Report

## 1. Overview

SuperMall is a web-based e-commerce platform designed to facilitate shopping experiences through a modern Single Page Application (SPA) frontend, a Node.js backend, and Firebase as the primary database and hosting solution. The system integrates payment processing via Razorpay and includes an AI assistant powered by Dialogflow for conversational interactions.

---

## 2. Technology Stack

- **Backend:** Node.js with Express framework
- **Frontend:** JavaScript SPA using Firebase SDK v9 (modular)
- **Database:** Firebase Firestore (NoSQL document database)
- **Hosting:** Firebase Hosting serving the SPA and static assets
- **Payment Gateway:** Razorpay integration for secure payment processing
- **File Uploads:** Multer middleware for handling image uploads
- **API Documentation:** Swagger (OpenAPI) for backend API docs
- **Authentication:** Firebase Authentication
- **AI Assistant:** Dialogflow integration for chatbot functionality

---

## 3. Backend Architecture and Flow

- **Server Setup:** Express server running on port 5001.
- **Middleware:**
  - CORS enabled for cross-origin requests.
  - Rate limiting to prevent abuse (100 requests per 15 minutes per IP).
  - Request logging with timestamps and response times.
  - JSON body parsing.
- **Static File Serving:**
  - Serves frontend files from `public` directory.
  - Serves uploaded images from `uploads` directory.
- **File Uploads:**
  - Uses Multer to handle image uploads for shops, profiles, and products.
  - Upload directories are created if missing.
  - File cleanup job runs daily to delete files older than 30 days.
- **Payment Integration:**
  - Razorpay order creation endpoint (`/payment/create-order`) creates payment orders.
- **API Documentation:**
  - Swagger UI available at `/api-docs` for API exploration.
- **Error Handling:**
  - Middleware to catch upload errors and general server errors.
- **Development:**
  - Nodemon used for auto-restarting server on code changes during development.

## 9. User Roles and Their Functions

- **User:**
  - Can register, login, and manage their profile.
  - Browse shops and products.
  - Add products to cart and manage cart items.
  - Place orders and view order history.
  - Submit messages via contact form.
  - Interact with the AI assistant for shopping-related queries.

- **Shop Owner:**
  - Register and manage their shops.
  - Add, update, and delete products within their shops.
  - Manage promotional offers.
  - View sales metrics and orders related to their shops.
  - Interact with the AI assistant for shop management tasks.

- **Admin:**
  - Full access to all data and collections.
  - Approve or reject shop registrations.
  - Assign floors to shops.
  - Manage reported issues and complaints.
  - Oversee overall platform operations.
  - Interact with the AI assistant for administrative tasks.

These roles are enforced through Firestore security rules and reflected in the frontend UI and backend logic.

---

## 4. Database Design and Security

- **Firestore Collections:**
  - `users`: User profiles with role-based access.
  - `shops`: Shop details created and managed by shop owners.
  - `products`: Products linked to shops.
  - `orders`: User orders with status tracking.
  - `carts`: Subcollection under users for cart items.
  - `transactions`: Payment transactions linked to orders.
  - `offers`: Promotional offers managed by shop owners and admins.
- **Security Rules:**
  - Role-based access control for users, shop owners, and admins.
  - Users can read/write their own profiles and carts.
  - Shop owners can manage their shops, products, and view related orders.
  - Admins have full read/write access across collections.
  - Authenticated users can read shops, products, and offers.
- **Indexes:**
  - No custom composite indexes defined; default Firestore indexes used.

---

## 5. Frontend Architecture and Data Flow

- **Authentication:**
  - Firebase Authentication manages user login state.
  - UI updates dynamically based on auth state.
- **Main Modules:**
  - **Index.js:** Handles user authentication state, loads featured shops and current offers, manages contact form submissions.
  - **Shop.js:** Fetches and displays products for a shop, manages add to cart and product comparison features.
  - **Cart.js:** Loads cart items, allows quantity updates and deletions, prepares checkout summary.
  - **Orders.js:** Displays user order history with filtering by status and date.
  - **Payment.js:** Manages payment process using Razorpay, creates orders via backend, stores transactions in Firestore.
- **UI/UX:**
  - Uses Bootstrap for responsive design and modals.
  - SPA routing handled by Firebase Hosting rewrites.
  - Dynamic DOM manipulation for product lists, cart, orders, and offers.
- **Data Flow:**
  - Frontend communicates directly with Firestore for data reads/writes.
  - Payment flow involves backend API call to create Razorpay order, then frontend Razorpay checkout UI.
  - Cart and order data stored and updated in Firestore collections.

---

## 6. Dialogflow AI Assistant Integration

- **Backend:**
  - Uses `@google-cloud/dialogflow` client library.
  - API endpoint `/api/dialogflow` accepts user messages and returns chatbot responses.
  - Requires Google Cloud service account JSON and project ID configuration.
- **Frontend:**
  - Chat UI component sends user messages to backend endpoint.
  - Maintains session ID for conversation context.
- **Intents:**
  - Covers greetings, fallback, confirmations, clarifications.
  - User intents for browsing products, managing cart, checkout, viewing orders.
  - Shop owner intents for registering shops, adding/updating products, managing offers, viewing sales and orders.
  - Admin intents for approving shops, assigning floors, managing issues.
- **Entities:**
  - Custom entities for shop names and product names to enhance intent recognition.

---

## 7. Overall System Design and Data Flow

1. **User Interaction:**
   - Users access the SPA hosted on Firebase Hosting.
   - Authentication via Firebase Auth.
   - Users browse shops and products, add items to cart.
   - Cart management and checkout handled in frontend with Firestore as backend.
2. **Order and Payment:**
   - Orders created in Firestore.
   - Payment processed via Razorpay integration through backend.
   - Transactions recorded in Firestore with order status updates.
3. **Shop Owner and Admin:**
   - Shop owners manage shops, products, offers via frontend UI.
   - Admins have elevated permissions for managing shops, floors, and issues.
4. **AI Assistant:**
   - Dialogflow chatbot provides conversational interface for users and shop owners.
   - Backend API mediates communication with Dialogflow agent.
5. **File Management:**
   - Image uploads handled by backend with Multer.
   - Uploaded files served statically and cleaned up periodically.

---

## 8. Conclusion

SuperMall is a well-structured e-commerce platform leveraging modern cloud technologies and integrations. The use of Firebase for authentication, database, and hosting simplifies backend complexity while providing scalability. Razorpay integration ensures secure payment processing. The Dialogflow AI assistant adds an innovative conversational layer enhancing user experience. The modular frontend architecture with Firebase SDK enables responsive and dynamic user interactions. Overall, the system demonstrates a comprehensive full-stack solution for an online mall platform.

