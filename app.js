// ============================================
// FIREBASE CONFIG & INITIALIZATION
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  update,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  startAfter,
  endBefore,
  limitToFirst
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadString
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Firebase config - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyD4TC6jnYlKjMw2Ot9VcHh0QGmoZdhIU48",
  authDomain: "amareshprj-msn.firebaseapp.com",
  projectId: "amareshprj-msn",
  storageBucket: "amareshprj-msn.firebasestorage.app",
  messagingSenderId: "96424898401",
  appId: "1:96424898401:web:ffd28c271d11c95f719f20",
  measurementId: "G-TNRTBJEXWK",
  databaseURL: "https://amareshprj-msn-default-rtdb.firebaseio.com"
};

const DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='675' viewBox='0 0 900 675'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop offset='0' stop-color='%23099aac'/%3E%3Cstop offset='1' stop-color='%23f59a1a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='675' rx='42' fill='%23f8fbff'/%3E%3Ccircle cx='720' cy='90' r='180' fill='%23fff4df'/%3E%3Ccircle cx='135' cy='560' r='150' fill='%23e0f7fb'/%3E%3Crect x='142' y='160' width='616' height='356' rx='34' fill='url(%23bg)' opacity='0.14'/%3E%3Cpath d='M260 405h380' stroke='%23099aac' stroke-width='24' stroke-linecap='round'/%3E%3Cpath d='M300 330h300' stroke='%23f59a1a' stroke-width='24' stroke-linecap='round'/%3E%3Ctext x='450' y='270' text-anchor='middle' font-family='Avenir Next, Segoe UI, Arial, sans-serif' font-size='54' font-weight='800' fill='%23058a99'%3EBG BAZAAR%3C/text%3E%3Ctext x='450' y='465' text-anchor='middle' font-family='Avenir Next, Segoe UI, Arial, sans-serif' font-size='24' font-weight='700' letter-spacing='5' fill='%2364758b'%3ECAMPUS ESSENTIALS%3C/text%3E%3C/svg%3E";

const INITIAL_CATEGORIES = [
  { id: "cat-electronics", name: "Electronics", description: "Electronic devices and gadgets" },
  { id: "cat-fashion", name: "Fashion", description: "Clothing and accessories" },
  { id: "cat-home-kitchen", name: "Home & Kitchen", description: "Home appliances and kitchen essentials" },
  { id: "cat-beauty", name: "Beauty", description: "Beauty and personal care products" },
  { id: "cat-books", name: "Books", description: "Books and reading materials" },
  { id: "cat-sports", name: "Sports", description: "Sports and fitness equipment" }
];

// ============================================
// STATE MANAGEMENT WITH CACHE
// ============================================
class AppState {
  constructor() {
    this.categories = [];
    this.products = [];
    this.cart = [];
    this.orders = [];
    this.settings = null;
    this.isUserLoggedIn = false;
    this.currentUser = null;
    this.userData = null;
    this.isInitialized = false;
    this.cache = {
      orders: { data: [], timestamp: 0, lastKey: null }
    };
    this.pagination = {
      orders: { page: 0, hasMore: true }
    };
    this.adminCredentials = {
      username: "amaresh@bgbazaar.com",
      password: "amareshraj@1321"
    };
  }

  get remainingStock() {
    return (product) => Math.max(Number(product.totalStock) - Number(product.soldQuantity), 0);
  }

  get stockStatus() {
    return (product) => {
      const remaining = this.remainingStock(product);
      if (remaining === 0) return "Out of Stock";
      if (remaining <= CONFIG.LOW_STOCK_THRESHOLD) return "Low Stock";
      return "Available";
    };
  }

  get cartTotal() {
    return this.cart.reduce((total, item) => {
      const product = this.products.find(p => p.id === item.id);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  get cartRows() {
    return this.cart
      .map(item => {
        const product = this.products.find(p => p.id === item.id);
        return product ? { ...item, product } : null;
      })
      .filter(Boolean);
  }

  isCacheValid(cacheKey) {
    const cache = this.cache[cacheKey];
    if (!cache) return false;
    return Date.now() - cache.timestamp < CONFIG.CACHE_DURATION;
  }

  getCachedData(cacheKey) {
    const cache = this.cache[cacheKey];
    return this.isCacheValid(cacheKey) ? cache.data : null;
  }

  setCachedData(cacheKey, data, lastKey = null) {
    this.cache[cacheKey] = {
      data,
      timestamp: Date.now(),
      lastKey
    };
  }
}

const state = new AppState();

// ============================================
// FIREBASE DATA ACCESS LAYER
// ============================================
class FirebaseDataService {
  // Generic CRUD operations
  static async save(path, data) {
    const refPath = ref(db, path);
    if (data.id) {
      await set(ref(db, `${path}/${data.id}`), data);
      return data;
    } else {
      const newRef = push(refPath);
      data.id = newRef.key;
      await set(newRef, data);
      return data;
    }
  }

  static async get(path) {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : null;
  }

  static async getAll(path, options = {}) {
    const { limit = null, orderBy = null, startAt = null, endAt = null } = options;
    let dbRef = ref(db, path);
    
    if (orderBy) {
      let queryRef = query(ref(db, path), orderByChild(orderBy));
      if (startAt) queryRef = query(queryRef, startAfter(startAt));
      if (endAt) queryRef = query(queryRef, endBefore(endAt));
      if (limit) queryRef = query(queryRef, limitToFirst(limit));
      dbRef = queryRef;
    } else if (limit) {
      dbRef = query(ref(db, path), limitToLast(limit));
    }
    
    const snapshot = await get(dbRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data);
  }

  static async getPaginated(path, pageSize = CONFIG.MAX_ORDERS_PER_PAGE, lastKey = null) {
    let dbRef = query(ref(db, path), orderByChild('createdAt'));
    if (lastKey) {
      dbRef = query(dbRef, startAfter(lastKey));
    }
    dbRef = query(dbRef, limitToFirst(pageSize + 1));
    
    const snapshot = await get(dbRef);
    if (!snapshot.exists()) return { items: [], hasMore: false };
    
    const data = snapshot.val();
    const items = Object.values(data);
    const hasMore = items.length > pageSize;
    const resultItems = hasMore ? items.slice(0, -1) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    
    return {
      items: resultItems,
      hasMore,
      lastKey: lastItem ? lastItem.createdAt : null
    };
  }

  static async getByUser(path, userId, options = {}) {
    const { limit = null, orderBy = null } = options;
    let dbRef = query(ref(db, path), orderByChild('userId'), equalTo(userId));
    if (limit) dbRef = query(dbRef, limitToLast(limit));
    const snapshot = await get(dbRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data);
  }

  static async delete(path) {
    await remove(ref(db, path));
  }

  static async update(path, data) {
    await update(ref(db, path), data);
    return data;
  }

  static subscribe(path, callback, options = {}) {
    const { orderBy = null, equalTo = null, limit = null } = options;
    let dbRef = ref(db, path);
    
    if (orderBy && equalTo) {
      dbRef = query(dbRef, orderByChild(orderBy), equalTo(equalTo));
    }
    if (limit) {
      dbRef = query(dbRef, limitToLast(limit));
    }
    
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      callback(data ? Object.values(data) : []);
    }, (error) => {
      console.error("Realtime subscription error:", error);
    });
    return unsubscribe;
  }

  // ============================================
  // FIREBASE STORAGE OPERATIONS
  // ============================================
  static async uploadFile(file, path, metadata = {}) {
    try {
      const storagePath = storageRef(storage, path);
      const uploadTask = await uploadBytes(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        ...metadata
      });
      const downloadURL = await getDownloadURL(uploadTask.ref);
      return {
        url: downloadURL,
        path: path,
        metadata: uploadTask.metadata
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  static async uploadImage(file, path, maxDimension = 1400, quality = 0.78) {
    // Optimize image before upload
    const optimizedDataUrl = await this.optimizeImage(file, maxDimension, quality);
    const blob = await this.dataUrlToBlob(optimizedDataUrl);
    const optimizedFile = new File([blob], file.name, { type: blob.type });
    
    return this.uploadFile(optimizedFile, path);
  }

  static async uploadProof(file, orderId) {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const extension = isPdf ? 'pdf' : 'jpg';
    const fileName = `proofs/${orderId}.${extension}`;
    
    if (isPdf) {
      if (file.size > CONFIG.MAX_PDF_BYTES) {
        throw new Error("PDF payment proof must be smaller than 1.5 MB.");
      }
      return this.uploadFile(file, fileName);
    } else {
      return this.uploadImage(file, fileName, 1400, 0.76);
    }
  }

  static async uploadLogo(file) {
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    if (isSvg && file.size > 500 * 1024) {
      throw new Error("SVG logo must be smaller than 500 KB.");
    }
    const fileName = `logos/${Date.now()}_${file.name}`;
    if (isSvg) {
      return this.uploadFile(file, fileName);
    } else {
      return this.uploadImage(file, fileName, 512, 0.82);
    }
  }

  static async uploadQR(file) {
    const fileName = `qrs/${Date.now()}_${file.name}`;
    return this.uploadImage(file, fileName, 900, 0.84);
  }

  static async deleteFile(path) {
    try {
      const fileRef = storageRef(storage, path);
      await deleteObject(fileRef);
      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  // Helper: Optimize image to data URL
  static optimizeImage(file, maxDimension = 1400, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Helper: Convert data URL to Blob
  static dataUrlToBlob(dataUrl) {
    return new Promise((resolve, reject) => {
      try {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        resolve(new Blob([u8arr], { type: mime }));
      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper: Check if file is accepted
  static acceptedProofFile(file) {
    if (!file) return false;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const extAllowed = /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
    return allowed.includes(file.type) || extAllowed;
  }

  // User operations
  static async saveUserData(uid, data) {
    await set(ref(db, `users/${uid}`), data);
    return data;
  }

  static async getUserData(uid) {
    const snapshot = await get(ref(db, `users/${uid}`));
    return snapshot.exists() ? snapshot.val() : null;
  }

  static async getUserCart(uid) {
    const snapshot = await get(ref(db, `users/${uid}/cart`));
    return snapshot.exists() ? snapshot.val() : [];
  }

  static async saveUserCart(uid, cartData) {
    await set(ref(db, `users/${uid}/cart`), cartData);
  }

  // Order operations with stock management and file upload
  static async createOrder(order, proofFile) {
    // Upload proof file first
    let proofData = null;
    if (proofFile) {
      proofData = await this.uploadProof(proofFile, order.id);
    }
    
    // Get current products
    const products = await this.getAll("products");
    const changedProducts = [];

    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error(`${item.name || "A product"} is no longer available.`);
      }
      const remaining = Number(product.totalStock) - Number(product.soldQuantity);
      if (remaining < Number(item.quantity)) {
        throw new Error(`${product.name} does not have enough stock.`);
      }
      product.soldQuantity = Number(product.soldQuantity) + Number(item.quantity);
      changedProducts.push(product);
    }

    // Update order with proof URL
    if (proofData) {
      order.paymentProofData = proofData.url;
      order.paymentProofPath = proofData.path;
      order.paymentProofName = proofFile.name;
      order.paymentProofType = proofFile.type;
    }

    // Save products and order
    await Promise.all(changedProducts.map(p => this.save("products", p)));
    const savedOrder = await this.save("orders", order);
    
    return { order: savedOrder, products: changedProducts };
  }

  // Optimized order fetching for users
  static async getUserOrders(uid, limit = 20) {
    return this.getByUser("orders", uid, { limit, orderBy: "userId" });
  }

  // Optimized product fetching with pagination
  static async getProductsPaginated(pageSize = 20, lastKey = null) {
    return this.getPaginated("products", pageSize, lastKey);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}

function generateOrderNumber() {
  const year = new Date().getFullYear();
  return `BGB-${year}-${String(Date.now()).slice(-6)}`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function isImageProof(order) {
  const type = order.paymentProofType || '';
  return type.startsWith("image/") || /^data:image\//i.test(order.paymentProofData || "");
}

// ============================================
// RENDER FUNCTIONS
// ============================================
class Renderer {
  static renderShared() {
    $$("#siteLogo, #heroLogo").forEach(logo => {
      logo.src = state.settings?.logoUrl || CONFIG.DEFAULT_LOGO;
    });
    $$("#siteName").forEach(node => {
      node.textContent = state.settings?.siteName || "BG BAZAAR";
    });
    $$("#navCartCount").forEach(node => {
      node.textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    });
    
    const activeMetric = $("#activeProductsMetric");
    const cartMetric = $("#cartItemsMetric");
    const ordersMetric = $("#ordersMetric");
    if (activeMetric) activeMetric.textContent = state.products.filter(p => p.listed).length;
    if (cartMetric) cartMetric.textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (ordersMetric) ordersMetric.textContent = state.orders.length;
  }

  static renderUserStatus() {
    const userLoginSection = $("#userLoginSection");
    const userLoggedInSection = $("#userLoggedInSection");
    const loggedInUserEmail = $("#loggedInUserEmail");

    if (userLoginSection) userLoginSection.classList.toggle("hidden", state.isUserLoggedIn);
    if (userLoggedInSection) userLoggedInSection.classList.toggle("hidden", !state.isUserLoggedIn);
    if (loggedInUserEmail && state.isUserLoggedIn) {
      loggedInUserEmail.textContent = state.userData?.email || '-';
    }
  }

  static renderFilters() {
    const categoryFilter = $("#categoryFilter");
    if (!categoryFilter) return;
    const previous = categoryFilter.value || "all";
    const categoryNames = state.categories.map(c => c.name).sort();
    categoryFilter.innerHTML = `
      <option value="all">All categories</option>
      ${categoryNames.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}
    `;
    categoryFilter.value = categoryNames.includes(previous) ? previous : "all";
  }

  static renderShop() {
    const productGrid = $("#productGrid");
    if (!productGrid) return;
    const query = ($("#searchInput")?.value || "").trim().toLowerCase();
    const category = $("#categoryFilter")?.value || "all";

    const visible = state.products.filter(item => {
      const remaining = state.remainingStock(item);
      const matchesQuery = item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
      const matchesCategory = category === "all" || item.category === category;
      return item.listed && remaining > 0 && matchesQuery && matchesCategory;
    });

    productGrid.innerHTML = visible.length
      ? visible.map(item => {
          const remaining = state.remainingStock(item);
          const cartQuantity = state.cart.find(cartItem => cartItem.id === item.id)?.quantity || 0;
          const stockClass = remaining === 0 ? "out" : remaining <= CONFIG.LOW_STOCK_THRESHOLD ? "low" : "";
          const publicStock = item.showPublicQuantity
            ? `<span class="stock ${stockClass}">Stock left: ${remaining}</span>`
            : `<span class="stock ${stockClass}">${state.stockStatus(item)}</span>`;
          const purchaseControl = cartQuantity
            ? `<div class="product-quantity-controls" aria-label="${escapeHtml(item.name)} quantity in cart">
                <button class="qty-btn" type="button" data-card-minus="${item.id}" aria-label="Remove one ${escapeHtml(item.name)}">-</button>
                <strong>${cartQuantity}</strong>
                <button class="qty-btn" type="button" data-card-plus="${item.id}" ${cartQuantity >= remaining ? "disabled" : ""} aria-label="Add one ${escapeHtml(item.name)}">+</button>
              </div>`
            : `<button class="primary-btn" type="button" data-add="${item.id}" ${remaining === 0 ? "disabled" : ""}>Add to cart</button>`;
          return `
            <article class="product-card">
              <img src="${escapeHtml(item.image || DEFAULT_IMAGE)}" alt="${escapeHtml(item.name)}">
              <div class="product-body">
                <div>
                  <p class="eyebrow">${escapeHtml(item.category)}</p>
                  <h3>${escapeHtml(item.name)}</h3>
                </div>
                <p class="muted">${escapeHtml(item.description)}</p>
                <div class="product-meta">
                  <span class="price">${money(item.price)}</span>
                  ${publicStock}
                </div>
                ${purchaseControl}
              </div>
            </article>
          `;
        }).join("")
      : `<div class="empty">No listed products match the selected filters.</div>`;
  }

  static renderCart() {
    const cartList = $("#cartList");
    const rows = state.cartRows;
    const cartTotalNode = $("#cartTotal");
    const paymentAmount = $("#paymentAmount");
    if (cartTotalNode) cartTotalNode.textContent = money(state.cartTotal);
    if (paymentAmount) paymentAmount.textContent = money(state.cartTotal);

    if (cartList) {
      cartList.innerHTML = rows.length
        ? rows.map(row => {
            const subtotal = row.product.price * row.quantity;
            return `
              <article class="cart-item">
                <div>
                  <strong>${escapeHtml(row.product.name)}</strong>
                  <p class="muted">Qty ${row.quantity} x ${money(row.product.price)} = ${money(subtotal)}</p>
                  <p class="muted">${state.remainingStock(row.product)} available</p>
                </div>
                <div class="cart-controls">
                  <button class="qty-btn" type="button" data-minus="${row.id}">-</button>
                  <strong>${row.quantity}</strong>
                  <button class="qty-btn" type="button" data-plus="${row.id}">+</button>
                  <button class="ghost-btn" type="button" data-remove="${row.id}">Remove</button>
                </div>
              </article>
            `;
          }).join("")
        : `<div class="empty">Your cart is empty.</div>`;
    }

    this.renderPaymentUI(rows);
    this.fillCheckoutForm();
  }

  static renderPaymentUI(rows) {
    const checkoutSummary = $("#checkoutCartSummary");
    if (checkoutSummary) {
      checkoutSummary.innerHTML = rows.length
        ? `
          <h3>Order summary</h3>
          ${rows.map(row => `<p>${escapeHtml(row.product.name)} x ${row.quantity} <strong>${money(row.product.price * row.quantity)}</strong></p>`).join("")}
        `
        : `<div class="empty">Your cart is empty. Add items before payment submission.</div>`;
    }

    const upiQr = $("#upiQr");
    const upiLabel = $("#upiLabel");
    const secondaryPaymentBox = $("#secondaryPaymentBox");
    const secondaryUpiQr = $("#secondaryUpiQr");
    const secondaryUpiLabel = $("#secondaryUpiLabel");
    if (upiQr) upiQr.src = state.settings?.qrImage || CONFIG.DEFAULT_LOGO;
    if (upiLabel) upiLabel.textContent = `${state.settings?.upiId} - ${money(state.cartTotal)}`;
    if (secondaryPaymentBox) {
      const hasSecondaryQr = Boolean(state.settings?.secondaryQrImage);
      secondaryPaymentBox.classList.toggle("hidden", !hasSecondaryQr);
      if (secondaryUpiQr) secondaryUpiQr.src = state.settings?.secondaryQrImage || CONFIG.DEFAULT_LOGO;
      if (secondaryUpiLabel) {
        secondaryUpiLabel.textContent = `${state.settings?.secondaryUpiId || state.settings?.upiId} - ${money(state.cartTotal)}`;
      }
    }
  }

  static fillCheckoutForm() {
    const buyerNameInput = $("#buyerName");
    const phoneInput = $("#phone");
    const emailInput = $("#email");
    const locationInput = $("#location");

    if (locationInput) locationInput.value = CONFIG.DELIVERY_POINT_ADDRESS;
    if (state.isUserLoggedIn && state.userData) {
      if (buyerNameInput) buyerNameInput.value = state.userData.name || "";
      if (phoneInput) phoneInput.value = state.userData.phone || "";
      if (emailInput) emailInput.value = state.userData.email || "";
    }
  }

  static renderUserOrders() {
    const userOrderHistory = $("#userOrderHistory");
    const userOrdersList = $("#userOrdersList");
    
    if (!userOrderHistory || !userOrdersList) return;
    
    if (state.isUserLoggedIn && state.currentUser) {
      userOrderHistory.classList.remove("hidden");
      
      // Only show user's orders
      const userOrders = state.orders.filter(order => order.userId === state.currentUser.uid);
      
      userOrdersList.innerHTML = userOrders.length
        ? userOrders.slice(0, 20).reverse().map(order => {
            const itemsSummary = (order.items || []).map(item => escapeHtml(item.name)).join(", ");
            return `
              <div style="padding: 12px; border: 1px solid var(--line); border-radius: 6px; background: #fff;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <strong>${escapeHtml(order.orderNumber)}</strong>
                  <span class="status-pill ${order.status === "Cancelled" ? "cancelled" : order.status === "Pending" ? "pending" : ""}">${escapeHtml(order.status)}</span>
                </div>
                <p style="margin: 4px 0; font-size: 14px;">${itemsSummary}</p>
                <p style="margin: 4px 0; color: var(--brand); font-weight: 600;">${money(order.totalAmount)}</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: var(--muted);">${new Date(order.createdAt).toLocaleString("en-IN")}</p>
                ${order.paymentProofData ? `<a href="${escapeHtml(order.paymentProofData)}" target="_blank" style="font-size: 12px; color: var(--brand);">View Payment Proof</a>` : ''}
              </div>
            `;
          }).join("")
        : `<div class="muted">No past orders found.</div>`;
    } else {
      userOrderHistory.classList.add("hidden");
    }
  }

  static renderAll() {
    this.renderShared();
    this.renderUserStatus();
    this.renderFilters();
    this.renderShop();
    this.renderCart();
    this.renderUserOrders();
    // Other render methods...
  }
}

// ============================================
// EVENT HANDLERS
// ============================================
class EventManager {
  static initialize() {
    // Cart actions
    $("#productGrid")?.addEventListener("click", async (event) => {
      const { add, cardPlus, cardMinus } = event.target.dataset;
      if (add) await this.addToCart(add);
      if (cardPlus) await this.changeCartQuantity(cardPlus, 1);
      if (cardMinus) await this.changeCartQuantity(cardMinus, -1);
    });

    $("#cartList")?.addEventListener("click", async (event) => {
      const { plus, minus, remove } = event.target.dataset;
      if (plus) await this.changeCartQuantity(plus, 1);
      if (minus) await this.changeCartQuantity(minus, -1);
      if (remove) {
        state.cart = state.cart.filter(item => item.id !== remove);
        if (state.isUserLoggedIn && state.currentUser) {
          await FirebaseDataService.saveUserCart(state.currentUser.uid, state.cart);
        }
        Renderer.renderAll();
      }
    });

    // Payment form submission with file upload
    $("#paymentForm")?.addEventListener("submit", this.handlePaymentSubmit.bind(this));

    // User authentication
    $("#userLoginForm")?.addEventListener("submit", this.handleUserLogin.bind(this));
    $("#userRegisterForm")?.addEventListener("submit", this.handleUserRegister.bind(this));
    $("#userLogoutBtn")?.addEventListener("click", this.handleUserLogout.bind(this));

    // Clear cart
    $("#clearCartBtn")?.addEventListener("click", () => {
      state.cart = [];
      Renderer.renderAll();
    });

    // Search inputs
    ["#searchInput", "#categoryFilter"].forEach(selector => {
      const control = $(selector);
      control?.addEventListener("input", () => {
        Renderer.renderFilters();
        Renderer.renderShop();
      });
      control?.addEventListener("change", () => {
        Renderer.renderFilters();
        Renderer.renderShop();
      });
    });
  }

  static async addToCart(id) {
    const product = state.products.find(item => item.id === id);
    if (!product || state.remainingStock(product) < 1) return;
    const existing = state.cart.find(item => item.id === id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + 1, state.remainingStock(product));
    } else {
      state.cart.push({ id, quantity: 1 });
    }
    if (state.isUserLoggedIn && state.currentUser) {
      await FirebaseDataService.saveUserCart(state.currentUser.uid, state.cart);
    }
    Renderer.renderAll();
  }

  static async changeCartQuantity(id, amount) {
    const product = state.products.find(item => item.id === id);
    const existing = state.cart.find(item => item.id === id);
    if (!product || !existing) return;
    existing.quantity += amount;
    if (existing.quantity <= 0) {
      state.cart = state.cart.filter(item => item.id !== id);
    } else {
      existing.quantity = Math.min(existing.quantity, state.remainingStock(product));
    }
    if (state.isUserLoggedIn && state.currentUser) {
      await FirebaseDataService.saveUserCart(state.currentUser.uid, state.cart);
    }
    Renderer.renderAll();
  }

  static async handlePaymentSubmit(event) {
    event.preventDefault();
    const paymentForm = event.currentTarget;
    const checkoutMessage = $("#checkoutMessage");
    const submitButton = $("#submitOrderBtn");
    const rows = state.cartRows;

    checkoutMessage.classList.remove("error");
    checkoutMessage.textContent = "";
    if (!rows.length) {
      checkoutMessage.textContent = "Add at least one product before checkout.";
      checkoutMessage.classList.add("error");
      return;
    }

    const form = new FormData(paymentForm);
    const proof = form.get("paymentProof");
    if (!FirebaseDataService.acceptedProofFile(proof)) {
      checkoutMessage.textContent = "Upload payment proof as JPG, JPEG, PNG, WebP, or PDF.";
      checkoutMessage.classList.add("error");
      return;
    }

    const unavailable = rows.find(row => row.quantity > state.remainingStock(row.product));
    if (unavailable) {
      checkoutMessage.textContent = `${unavailable.product.name} does not have enough stock.`;
      checkoutMessage.classList.add("error");
      Renderer.renderAll();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting Order...";
    checkoutMessage.textContent = "Processing payment proof...";

    try {
      const now = new Date().toISOString();
      const orderNumber = generateOrderNumber();
      const order = {
        id: crypto.randomUUID(),
        orderNumber,
        userId: state.currentUser?.uid || 'guest',
        buyerName: form.get("buyerName").trim(),
        mobileNumber: form.get("phone").trim(),
        emailAddress: form.get("email").trim(),
        deliveryLocation: CONFIG.DELIVERY_POINT_ADDRESS,
        notes: "",
        totalAmount: state.cartTotal,
        status: "Pending",
        createdAt: now,
        items: rows.map(row => ({
          productId: row.id,
          name: row.product.name,
          quantity: row.quantity,
          unitPrice: row.product.price,
          subtotal: row.product.price * row.quantity
        })),
        utrNumber: form.get("utrNumber").trim(),
        paymentProofName: proof.name,
        paymentProofType: proof.type,
        paymentProofData: null, // Will be filled by createOrder
        paymentProofPath: null,
        paymentSubmittedAt: now
      };

      checkoutMessage.textContent = "Uploading payment proof and saving order...";
      
      // Create order with proof upload
      const result = await FirebaseDataService.createOrder(order, proof);
      const savedOrder = result?.order || order;
      const changedProducts = result?.products || [];

      state.products = state.products.map(product => {
        const changedProduct = changedProducts.find(item => item.id === product.id);
        return changedProduct || product;
      });
      state.orders = [...state.orders.filter(item => item.id !== savedOrder.id), savedOrder];
      state.cart = [];

      // Google Sheets integration
      this.syncToGoogleSheets(savedOrder);

      paymentForm.reset();
      checkoutMessage.textContent = `Order ${savedOrder.orderNumber} submitted. Redirecting...`;
      Renderer.renderAll();
      setTimeout(() => {
        window.location.href = "order-success.html";
      }, 1200);
    } catch (error) {
      checkoutMessage.textContent = error.message || "Order submission failed. Please try again.";
      checkoutMessage.classList.add("error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Order";
    }
  }

  static syncToGoogleSheets(order) {
    try {
      const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxWj9qFOi8s_avwd1YNku81LVVing5-eBDCRHJJZqU9AYpi4tt_T1_-ZyhKTwIgsVWBVw/exec";
      const itemsSummary = order.items.map(item => 
        `${item.name} x ${item.quantity} @ Rs. ${item.unitPrice}`
      ).join("; ");

      const csvRow = `"${order.orderNumber}","${new Date().toLocaleString("en-IN")}","${order.buyerName}","${order.mobileNumber}","${order.emailAddress}","${order.deliveryLocation}","${itemsSummary}","${order.totalAmount}","Pending","${order.utrNumber || ""}","${order.paymentProofName}","${new Date().toLocaleString("en-IN")}"\n`;

      fetch(GOOGLE_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        body: csvRow
      });
    } catch (error) {
      console.error("Google Sheet sync failed:", error);
    }
  }

  static async handleUserLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = $("#userLoginMessage");
    const email = form.get("userEmail").trim();
    const password = form.get("userPassword").trim();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      state.currentUser = userCredential.user;
      const savedUserData = await FirebaseDataService.getUserData(state.currentUser.uid);
      state.userData = savedUserData || { email: state.currentUser.email };
      
      // Load user's cart
      const savedCart = await FirebaseDataService.getUserCart(state.currentUser.uid);
      state.cart = this.mergeCarts(state.cart, savedCart);
      
      // Load only user's orders (optimized)
      const userOrders = await FirebaseDataService.getUserOrders(state.currentUser.uid);
      state.orders = userOrders;
      
      state.isUserLoggedIn = true;
      event.currentTarget.reset();
      Renderer.renderAll();
    } catch (error) {
      state.isUserLoggedIn = false;
      state.currentUser = null;
      state.userData = null;
      message.textContent = error.message || "Login failed. Please try again.";
    }
  }

  static async handleUserRegister(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = $("#userRegisterMessage");
    const name = form.get("registerName").trim();
    const email = form.get("registerEmail").trim();
    const password = form.get("registerPassword").trim();
    const phone = form.get("registerPhone").trim();
    const address = form.get("registerAddress").trim();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      state.currentUser = userCredential.user;
      state.userData = {
        uid: state.currentUser.uid,
        name,
        email,
        phone,
        address
      };
      await FirebaseDataService.saveUserData(state.currentUser.uid, state.userData);
      state.cart = [];
      await FirebaseDataService.saveUserCart(state.currentUser.uid, state.cart);
      state.isUserLoggedIn = true;
      event.currentTarget.reset();
      Renderer.renderAll();
    } catch (error) {
      state.isUserLoggedIn = false;
      state.currentUser = null;
      state.userData = null;
      message.textContent = error.message || "Registration failed. Please try again.";
    }
  }

  static async handleUserLogout() {
    try {
      if (state.isUserLoggedIn && state.currentUser) {
        await FirebaseDataService.saveUserCart(state.currentUser.uid, state.cart);
      }
      await signOut(auth);
      state.isUserLoggedIn = false;
      state.currentUser = null;
      state.userData = null;
      state.cart = [];
      state.orders = [];
      Renderer.renderAll();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  static mergeCarts(localCart, savedCart) {
    const merged = [...localCart];
    savedCart.forEach(savedItem => {
      const existing = merged.find(item => item.id === savedItem.id);
      if (existing) {
        existing.quantity = Math.max(existing.quantity, savedItem.quantity);
      } else {
        merged.push(savedItem);
      }
    });
    return merged;
  }

  static async initializeData() {
    try {
      // Load only essential data initially
      const [categories, products, settings] = await Promise.all([
        FirebaseDataService.getAll("categories"),
        FirebaseDataService.getAll("products"),
        FirebaseDataService.get("settings")
      ]);

      state.categories = categories.length ? categories : INITIAL_CATEGORIES;
      state.products = products.length ? products : [];
      state.settings = settings || {};

      // Seed initial data if empty
      if (!categories.length) {
        await Promise.all(INITIAL_CATEGORIES.map(c => FirebaseDataService.save("categories", c)));
      }
      if (!products.length) {
        const initialProducts = [
          {
            id: "prod-daily-grocery-pack",
            name: "Daily Grocery Pack",
            description: "Rice, pulses, spices, and essentials for everyday cooking.",
            category: "Home & Kitchen",
            image: DEFAULT_IMAGE,
            price: 699,
            totalStock: 18,
            soldQuantity: 0,
            listed: true,
            showPublicQuantity: false,
            createdAt: new Date().toISOString()
          },
          {
            id: "prod-cotton-tshirt",
            name: "Cotton T-shirt",
            description: "Soft cotton regular-fit T-shirt for daily wear.",
            category: "Fashion",
            image: DEFAULT_IMAGE,
            price: 349,
            totalStock: 25,
            soldQuantity: 0,
            listed: true,
            showPublicQuantity: false,
            createdAt: new Date().toISOString()
          }
        ];
        await Promise.all(initialProducts.map(p => FirebaseDataService.save("products", p)));
        state.products = initialProducts;
      }

      state.isInitialized = true;
    } catch (error) {
      console.error("Error initializing data:", error);
      state.isInitialized = false;
    }
  }
}

// ============================================
// REALTIME LISTENERS (OPTIMIZED)
// ============================================
function setupRealtimeListeners() {
  // Auth state listener
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      state.currentUser = user;
      const savedUserData = await FirebaseDataService.getUserData(user.uid);
      state.userData = savedUserData || { email: user.email };
      const savedCart = await FirebaseDataService.getUserCart(user.uid);
      state.cart = EventManager.mergeCarts(state.cart, savedCart);
      
      // Load only user's orders
      const userOrders = await FirebaseDataService.getUserOrders(user.uid);
      state.orders = userOrders;
      
      state.isUserLoggedIn = true;
    } else {
      state.isUserLoggedIn = false;
      state.currentUser = null;
      state.userData = null;
      state.orders = [];
    }
    Renderer.renderAll();
  });

  // Real-time data subscriptions (only for essential data)
  const listeners = [
    { path: "categories", handler: (data) => { state.categories = data || []; Renderer.renderAll(); } },
    { path: "products", handler: (data) => { state.products = data || []; Renderer.renderAll(); }},
    { path: "settings", handler: (data) => { state.settings = data || {}; Renderer.renderAll(); }}
  ];

  // Only subscribe to orders if user is logged in
  let ordersUnsubscribe = null;
  
  // Re-subscribe to orders when user changes
  onAuthStateChanged(auth, (user) => {
    if (ordersUnsubscribe) {
      ordersUnsubscribe();
      ordersUnsubscribe = null;
    }
    
    if (user) {
      // Subscribe only to this user's orders
      ordersUnsubscribe = FirebaseDataService.subscribe(
        "orders", 
        (data) => {
          state.orders = data.filter(order => order.userId === user.uid) || [];
          Renderer.renderAll();
        },
        { orderBy: "userId", equalTo: user.uid }
      );
    }
  });

  listeners.forEach(({ path, handler }) => {
    FirebaseDataService.subscribe(path, handler);
  });
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  await EventManager.initializeData();
  EventManager.initialize();
  Renderer.renderAll();
  setupRealtimeListeners();
}

// Handle DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { state, Renderer, EventManager, FirebaseDataService };