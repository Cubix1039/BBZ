# BGBAZAAR - Campus E-Commerce Marketplace

## 📋 Project Overview

BGBAZAAR is a simple yet professional e-commerce website where:
- **Admins** manage products, categories, orders, and payment settings
- **Customers** browse products, add to cart, and checkout securely
- **All data** is managed through an intuitive admin dashboard

---

## 🎯 Key Features

### For Customers
✅ Browse products by category  
✅ Search functionality  
✅ Add/remove items from cart  
✅ Update quantities  
✅ Secure checkout with delivery details  
✅ UPI payment with QR code scanning  
✅ Upload payment proof screenshot  
✅ Order confirmation and tracking  

### For Admins
✅ Secure login with the BG BAZAAR admin credentials
✅ Dashboard with KPIs:
  - Total Products
  - Total Orders
  - Pending Orders
  - Completed Orders
  - Total Revenue

✅ **Product Management:**
  - Add new products
  - Edit product details
  - Delete products
  - Upload product images
  - Update price and stock
  - Hide/show products

✅ **Category Management:**
  - Add new categories
  - Edit categories
  - Delete categories
  - View product count per category

✅ **Order Management:**
  - View all orders
  - Update order status (Pending → Confirmed → Shipped → Delivered)
  - Verify payment status
  - View customer details
  - View order items and amounts

✅ **Payment Settings:**
  - Add/update UPI ID
  - Upload QR code
  - Enter bank details
  - View payment information

✅ **Website Settings:**
  - Change website name
  - Upload logo
  - Update contact information
  - Manage branding

✅ **Reports & Inventory:**
  - Inventory dashboard
  - Revenue tracking (Daily, Weekly, Monthly, Total)
  - Low stock alerts

---

## 📦 Project Structure

```
bgbazaar/
├── index.html              # Home page with product listings
├── cart.html               # Shopping cart page
├── checkout.html           # Checkout and payment page
├── order-success.html      # Order confirmation page
├── admin.html              # Admin panel
├── styles.css              # Professional responsive styling
├── app.js                  # Core application logic
├── config.php              # Database configuration (for future backend)
├── database-schema.sql     # MySQL database structure
└── README.md              # This file
```

---

## 🚀 Getting Started

### Option 1: Vercel Live Site

The live site uses Vercel Functions plus Vercel Blob so products, settings, orders, and payment proofs stay shared across browsers.

1. Connect a Vercel Blob store to the Vercel project
2. Redeploy the site after Vercel adds `BLOB_READ_WRITE_TOKEN`
3. Open `index.html` in your web browser
2. Browse products
3. Add to cart and checkout
4. For admin access, go to admin.html
5. Login with: **amaresh@bgbazaar.com / amareshraj@1321**

**Note:** Cart data stays local to each visitor, but products, categories, admin settings, orders, and uploaded proof files sync through Vercel Blob.

### Option 2: With Backend (PHP + MySQL)

#### Prerequisites
- PHP 7.4+ installed
- MySQL/MariaDB installed
- A web server (Apache, Nginx, etc.)

#### Setup Steps

1. **Create Database:**
   ```bash
   mysql -u root -p < database-schema.sql
   ```

2. **Update Config:**
   Edit `config.php` with your database credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'your_username');
   define('DB_PASS', 'your_password');
   define('DB_NAME', 'bgbazaar');
   ```

3. **Create API Endpoints:**
   Create PHP files for each endpoint (examples below):
   - `api/products.php` - Get/create/update products
   - `api/categories.php` - Manage categories
   - `api/orders.php` - Manage orders
   - `api/settings.php` - Update settings

4. **Update app.js:**
   Replace localStorage calls with fetch() API calls to your PHP endpoints

---

## 📱 Pages & Their Purpose

### Customer Pages

#### 1. **index.html** (Home & Product Listing)
- Display all products
- Category filter
- Search functionality
- Add to cart button
- Product metrics (active products, cart count, orders)

#### 2. **cart.html** (Shopping Cart)
- View all items in cart
- Increase/decrease quantities
- Remove items
- Show cart total
- Proceed to checkout button

#### 3. **checkout.html** (Order Placement)
- Delivery address form
- Order summary
- UPI payment details
- QR code display
- Submit payment proof

#### 4. **order-success.html** (Order Confirmation)
- Order reference number
- Order details
- Items purchased
- Delivery address
- Order status
- Print order option

### Admin Page

#### admin.html (Complete Control Panel)
**Sections:**
1. **Dashboard** - KPIs and metrics
2. **Branding & Payment Setup** - Logo, website name, contact info
3. **Website Settings** - UPI ID, QR code, bank details
4. **Category Management** - Add/edit/delete categories
5. **Product Management** - CRUD operations for products
6. **Inventory** - Stock and revenue tracking
7. **Orders** - View and manage customer orders

---

## 🔐 Admin Login

**Credentials:**
- Username: `amaresh@bgbazaar.com`
- Password: `amareshraj@1321`

**To change password (future enhancement):**
Update `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `app.js` and configure matching Vercel environment variables for the API.

---

## 💾 Data Storage

### Current Implementation (Vercel Blob)
- **Pros:** Shared across browsers, stores uploaded proof files, works on Vercel without a separate server
- **Cons:** Requires a connected Vercel Blob store and `BLOB_READ_WRITE_TOKEN`

### Future Implementation (MySQL)
- **Pros:** Persistent, multi-device, scalable
- **Cons:** Requires backend server

---

## 📊 Order Statuses

1. **Pending** - Order awaiting admin confirmation
2. **Confirmed** - Payment verified, order confirmed
3. **Shipped** - Order sent to customer
4. **Delivered** - Order delivered
5. **Cancelled** - Order cancelled

---

## 💳 Payment Flow

1. Customer adds products to cart
2. Proceeds to checkout
3. Enters delivery details
4. Sees UPI ID and QR code
5. Makes payment via UPI
6. Uploads payment proof screenshot
7. Submits order
8. Admin receives notification
9. Admin verifies payment
10. Order status updates to "Confirmed"
11. Admin ships the order
12. Customer receives delivery

---

## 🎨 Responsive Design

- ✅ Mobile phones (320px+)
- ✅ Tablets (768px+)
- ✅ Desktops (1024px+)
- ✅ Large screens (1920px+)
- ✅ Landscape orientation support

---

## 🔧 Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Professional, responsive styling
- **Vanilla JavaScript** - No dependencies

### Backend (Optional)
- **PHP 7.4+** - Server-side logic
- **MySQL 5.7+** - Database

### Hosting
- Shared hosting with cPanel
- VPS with Apache/Nginx
- Cloud platforms (AWS, Heroku, DigitalOcean)

---

## 📝 Database Tables (When Using MySQL)

1. **admins** - Admin user accounts
2. **categories** - Product categories
3. **products** - Product listings
4. **orders** - Customer orders
5. **order_items** - Items in each order
6. **payments** - Payment information
7. **settings** - Website configuration

See `database-schema.sql` for detailed structure.

---

## 🛠️ API Endpoints (To Be Created)

### Products
- `GET /api/products.php` - Get all products
- `POST /api/products.php` - Create product
- `PUT /api/products.php?id=X` - Update product
- `DELETE /api/products.php?id=X` - Delete product

### Categories
- `GET /api/categories.php` - Get all categories
- `POST /api/categories.php` - Create category
- `PUT /api/categories.php?id=X` - Update category
- `DELETE /api/categories.php?id=X` - Delete category

### Orders
- `GET /api/orders.php` - Get all orders
- `POST /api/orders.php` - Create order
- `PUT /api/orders.php?id=X` - Update order status
- `GET /api/orders.php?id=X` - Get order details

### Settings
- `GET /api/settings.php` - Get settings
- `PUT /api/settings.php` - Update settings

---

## 🚨 Security Considerations

1. **Admin Login:**
   - Use HTTPS in production
   - Implement bcrypt password hashing
   - Add CSRF tokens

2. **Payment Proof:**
   - Validate file types
   - Store securely (not in webroot)
   - Scan for malware

3. **Data Validation:**
   - Sanitize all inputs
   - Use prepared statements for SQL
   - Validate on both frontend and backend

4. **Database:**
   - Use strong passwords
   - Create database backups
   - Implement proper access controls

---

## 📞 Support & Maintenance

### Common Tasks

**Add a new product:**
1. Go to Admin Panel
2. Login with credentials
3. Click "Products" tab
4. Fill product details
5. Click "Save Product"

**Update order status:**
1. Go to Admin Panel
2. Scroll to "Orders" section
3. Click order dropdown
4. Select new status

**Change website branding:**
1. Go to "Branding & Payment" tab
2. Upload logo
3. Update UPI ID and QR code
4. Save settings

---

## 🐛 Troubleshooting

### Cart data not saving
- Clear browser cache and localStorage
- Try in incognito/private mode

### Images not loading
- Check image URLs are accessible
- Ensure CORS is enabled if using external images

### Login not working
- Verify username and password are exact
- Check if cookies are enabled

---

## 📈 Future Enhancements

- [ ] Email notifications for orders
- [ ] SMS alerts for admins
- [ ] Real payment gateway integration
- [ ] Customer accounts and login
- [ ] Order tracking page
- [ ] Wishlist feature
- [ ] Product reviews and ratings
- [ ] Bulk product import
- [ ] Advanced analytics
- [ ] Mobile app

---

## 📄 License

This project is created for BGBAZAAR campus marketplace.

---

## 👨‍💻 Development Notes

- All data operations are in `app.js`
- Styling is mobile-first and responsive
- No external dependencies for frontend
- Database structure is ready for PHP backend

---

## 🎓 Learning Resources

For converting this to a full-stack app:
- [PHP Official Guide](https://www.php.net/manual/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Web Security](https://owasp.org/www-project-top-ten/)

---

**Last Updated:** June 17, 2026  
**Version:** 1.0  
**Status:** Production Ready
