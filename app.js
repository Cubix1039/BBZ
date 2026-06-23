import { auth, db, ref, set, get, child, remove, onValue, update, push, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "./firebase.js";

const ADMIN_USERNAME = "amaresh@bgbazaar.com";
const ADMIN_PASSWORD = "amareshraj@1321";

const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz_T2L3EwFpU1Riz9Yg94OayYQy8oE_3_H_bNqFv8FfIbeA21fepmK0xG9zU0xG9zU/exec"; // Replace with your latest Apps Script Deploy Web App URL

const LOW_STOCK_THRESHOLD = 5;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_PDF_BYTES = 1.5 * 1024 * 1024;
const STORAGE_WARNING =
  "Browser storage is full. Use a smaller image or remove older orders before trying again.";
const DELIVERY_POINT_ADDRESS = "BGBAZAAR Office";
const DEFAULT_LOGO = "assets/bg-bazaar-logo.jpeg";
const DEFAULT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='675' viewBox='0 0 900 675'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop offset='0' stop-color='%23099aac'/%3E%3Cstop offset='1' stop-color='%23f59a1a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='675' rx='42' fill='%23f8fbff'/%3E%3Ccircle cx='720' cy='90' r='180' fill='%23fff4df'/%3E%3Ccircle cx='135' cy='560' r='150' fill='%23e0f7fb'/%3E%3Crect x='142' y='160' width='616' height='356' rx='34' fill='url(%23bg)' opacity='0.14'/%3E%3Cpath d='M260 405h380' stroke='%23099aac' stroke-width='24' stroke-linecap='round'/%3E%3Cpath d='M300 330h300' stroke='%23f59a1a' stroke-width='24' stroke-linecap='round'/%3E%3Ctext x='450' y='270' text-anchor='middle' font-family='Avenir Next, Segoe UI, Arial, sans-serif' font-size='54' font-weight='800' fill='%23058a99'%3EBG BAZAAR%3C/text%3E%3Ctext x='450' y='465' text-anchor='middle' font-family='Avenir Next, Segoe UI, Arial, sans-serif' font-size='24' font-weight='700' letter-spacing='5' fill='%2364758b'%3ECAMPUS ESSENTIALS%3C/text%3E%3C/svg%3E";
const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled"
];
const initialCategories = [
  { id: "cat-electronics", name: "Electronics", description: "Electronic devices and gadgets" },
  { id: "cat-fashion", name: "Fashion", description: "Clothing and accessories" },
  { id: "cat-home-kitchen", name: "Home & Kitchen", description: "Home appliances and kitchen essentials" },
  { id: "cat-beauty", name: "Beauty", description: "Beauty and personal care products" },
  { id: "cat-books", name: "Books", description: "Books and reading materials" },
  { id: "cat-sports", name: "Sports", description: "Sports and fitness equipment" }
];

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
  },
  {
    id: "prod-kitchen-storage-set",
    name: "Kitchen Storage Set",
    description: "Airtight containers for grains, snacks, and spices.",
    category: "Home & Kitchen",
    image: DEFAULT_IMAGE,
    price: 499,
    totalStock: 12,
    soldQuantity: 0,
    listed: true,
    showPublicQuantity: false,
    createdAt: new Date().toISOString()
  }
];

let categories = load("bgbazaar_categories", initialCategories);
let products = migrateProducts(load("bgbazaar_products", initialProducts));
let cart = load("bgbazaar_cart", []);
let orders = migrateOrders(load("bgbazaar_orders", []));
let settings = normalizeSettings(load("bgbazaar_settings", {
  siteName: "BG BAZAAR",
  logoUrl: DEFAULT_LOGO,
  contactPhone: "9117138483",
  contactEmail: "amaresh.r2030i@iimbg.ac.in",
  upiId: "payments@bgbazaar",
  qrImage: "",
  bankDetails: "Bank details will appear here after admin setup."
}));
let isAdminLoggedIn = sessionStorage.getItem("bgbazaar_admin") === "true";
let activeAdminPanel = "dashboardOverview";
let sharedBackendReady = false;
let isUserLoggedIn = false;
let currentUser = null;
let userData = null;
let userCart = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function load(key, fallback) {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}

function save() {
  try {
    localStorage.setItem("bgbazaar_categories", JSON.stringify(categories));
    localStorage.setItem("bgbazaar_products", JSON.stringify(products));
    localStorage.setItem("bgbazaar_cart", JSON.stringify(cart));
    localStorage.setItem("bgbazaar_orders", JSON.stringify(orders));
    localStorage.setItem("bgbazaar_settings", JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Unable to save marketplace data:", error);
    return false;
  }
}

async function dbSave(path, data) {
  try {
    if (data.id) {
      await set(ref(db, path + "/" + data.id), data);
    } else {
      const newRef = push(ref(db, path));
      data.id = newRef.key;
      await set(newRef, data);
    }
    return data;
  } catch (error) {
    throw new Error("Failed to save data: " + error.message);
  }
}

async function dbGet(path) {
  const snapshot = await get(ref(db, path));
  return snapshot.exists() ? snapshot.val() : null;
}

async function dbGetAll(path) {
  const snapshot = await get(ref(db, path));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data || {});
}

async function dbDelete(path) {
  await remove(ref(db, path));
}

async function dbUpdate(path, data) {
  await update(ref(db, path), data);
  return data;
}

async function subscribeToCollection(path, callback) {
  onValue(ref(db, path), (snapshot) => {
    const data = snapshot.val();
    callback(data ? Object.values(data) : []);
  }, (error) => {
    console.error("Realtime subscription error:", error);
  });
}

async function saveUserData(uid, data) {
  await set(ref(db, `users/${uid}`), data);
  return data;
}

async function getUserData(uid) {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

async function getUserCart(uid) {
  const snapshot = await get(ref(db, `users/${uid}/cart`));
  return snapshot.exists() ? snapshot.val() : [];
}

async function saveUserCart(uid, cartData) {
  await set(ref(db, `users/${uid}/cart`), cartData);
}

function mergeCarts(localCart, savedCart) {
  const merged = [...localCart];
  savedCart.forEach((savedItem) => {
    const existing = merged.find((item) => item.id === savedItem.id);
    if (existing) {
      existing.quantity = Math.max(existing.quantity, savedItem.quantity);
    } else {
      merged.push(savedItem);
    }
  });
  return merged;
}

async function loadUserCart(uid) {
  const savedCart = await getUserCart(uid);
  const localCart = load("bgbazaar_cart", []);
  cart = mergeCarts(localCart, savedCart);
}

async function syncCartToFirebase() {
  if (isUserLoggedIn && currentUser) {
    await saveUserCart(currentUser.uid, cart);
  }
}

async function saveCategory(category) {
  return dbSave("categories", category);
}

async function saveProduct(product) {
  return dbSave("products", product);
}

async function saveSettings(settingsData) {
  await set(ref(db, "settings"), settingsData);
  return settingsData;
}

async function saveOrder(order) {
  return dbSave("orders", order);
}

async function deleteCategory(id) {
  await dbDelete("categories/" + id);
}

async function deleteProduct(id) {
  await dbDelete("products/" + id);
}

async function deleteOrder(id) {
  await dbDelete("orders/" + id);
}

async function createOrder(order) {
  const productsData = await dbGetAll("products");
  const changedProducts = [];
  for (const item of order.items || []) {
    const product = productsData.find((p) => p.id === item.productId);
    if (!product) throw new Error(`${item.name || "A product"} is no longer available.`);
    const remaining = Number(product.totalStock || 0) - Number(product.soldQuantity || 0);
    if (remaining < Number(item.quantity || 0)) {
      throw new Error(`${product.name} does not have enough stock.`);
    }
    product.soldQuantity = Number(product.soldQuantity || 0) + Number(item.quantity || 0);
    changedProducts.push(product);
  }
  await Promise.all(changedProducts.map(saveProduct));
  const savedOrder = await saveOrder(order);
  return { order: savedOrder, products: changedProducts };
}

function applySharedState(data, includeOrders = false) {
  if (!data) return;
  if (Array.isArray(data.categories)) categories = data.categories;
  if (Array.isArray(data.products)) products = migrateProducts(data.products);
  if (data.settings) settings = normalizeSettings(data.settings);
  if (includeOrders && Array.isArray(data.orders)) orders = migrateOrders(data.orders);
  save();
  renderAll();
}

async function hydrateSharedState(includeOrders = isAdminLoggedIn) {
  try {
    const [categoriesData, productsData, settingsData, ordersData] = await Promise.all([
      dbGetAll("categories"),
      dbGetAll("products"),
      dbGet("settings"),
      includeOrders ? dbGetAll("orders") : Promise.resolve([])
    ]);
    applySharedState({
      categories: categoriesData,
      products: productsData,
      settings: settingsData,
      orders: ordersData
    }, includeOrders);
    sharedBackendReady = true;
  } catch (error) {
    sharedBackendReady = false;
    console.warn("Using local cache until Firebase is available:", error.message);
  }
}

async function persistShared(action, data, admin = true) {
  try {
    switch (action) {
      case "saveCategory": return await saveCategory(data);
      case "saveProduct": return await saveProduct(data);
      case "saveSettings": return await saveSettings(data);
      case "saveOrder": return await saveOrder(data);
      case "deleteCategory": return await deleteCategory(data.id);
      case "deleteProduct": return await deleteProduct(data.id);
      case "deleteOrder": return await deleteOrder(data.id);
      case "createOrder": return await createOrder(data);
      default: throw new Error("Unknown action: " + action);
    }
  } catch (error) {
    alert(error.message || "Operation failed. Please try again.");
    await hydrateSharedState(isAdminLoggedIn);
    throw error;
  }
}

function normalizeSettings(savedSettings) {
  const legacyLogo =
    !savedSettings.logoUrl ||
    savedSettings.logoUrl.startsWith("data:image/svg+xml") ||
    savedSettings.logoUrl.includes("BG%3C/text%3E%3Ctext");
  const legacySiteName = !savedSettings.siteName || savedSettings.siteName === "BGBAZAAR";
  const legacyPhone = !savedSettings.contactPhone || savedSettings.contactPhone === "+91 9876543210";
  const legacyEmail = !savedSettings.contactEmail || savedSettings.contactEmail === "contact@bgbazaar.com";
  return {
    siteName: legacySiteName ? "BG BAZAAR" : savedSettings.siteName,
    logoUrl: legacyLogo ? DEFAULT_LOGO : savedSettings.logoUrl,
    contactPhone: legacyPhone ? "9117138483" : savedSettings.contactPhone,
    contactEmail: legacyEmail ? "amaresh.r2030i@iimbg.ac.in" : savedSettings.contactEmail,
    upiId: savedSettings.upiId || "payments@bgbazaar",
    qrImage: savedSettings.qrImage || "",
    bankDetails: savedSettings.bankDetails || "Bank details will appear here after admin setup."
  };
}

function migrateProducts(savedProducts) {
  return savedProducts.map((item) => {
    const totalStock = Number(item.totalStock ?? item.quantity ?? 0);
    const soldQuantity = Number(item.soldQuantity ?? 0);
    const legacyImage = !item.image || item.image.includes("images.unsplash.com");
    return {
      id: item.id || crypto.randomUUID(),
      name: item.name || "Untitled product",
      description: item.description || "Product details available at BG BAZAAR.",
      category: item.category || "General",
      image: legacyImage ? DEFAULT_IMAGE : item.image,
      price: Number(item.price || 0),
      totalStock,
      soldQuantity: Math.min(soldQuantity, totalStock),
      listed: item.listed !== false,
      showPublicQuantity: item.showPublicQuantity === true,
      createdAt: item.createdAt || new Date().toISOString()
    };
  });
}

function migrateOrders(savedOrders) {
  return savedOrders.map((order, index) => {
    const createdAt = order.createdAt
      ? new Date(order.createdAt).toISOString()
      : new Date().toISOString();
    return {
      id: order.id || crypto.randomUUID(),
      orderNumber:
        order.orderNumber ||
        `BGB-${new Date(createdAt).getFullYear()}-${String(index + 1).padStart(6, "0")}`,
      buyerName: order.buyerName || "Unknown buyer",
      mobileNumber: order.mobileNumber || order.phone || "",
      emailAddress: order.emailAddress || order.email || "",
      deliveryLocation: order.deliveryLocation || order.address || DELIVERY_POINT_ADDRESS,
      notes: order.notes || "",
      totalAmount: Number(order.totalAmount ?? order.total ?? 0),
      status: order.status || "Payment Submitted",
      createdAt,
      items: (order.items || []).map((item) => ({
        productId: item.productId || item.id || "",
        name: item.name || "Product",
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice ?? item.price ?? 0),
        subtotal: Number(item.subtotal ?? (item.price || 0) * (item.quantity || 0))
      })),
      utrNumber: order.utrNumber || order.transactionId || "",
      paymentProofName: order.paymentProofName || "",
      paymentProofType: order.paymentProofType || "",
      paymentProofData: order.paymentProofData || "#",
      paymentSubmittedAt: order.paymentSubmittedAt || createdAt
    };
  });
}

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

function remainingStock(product) {
  return Math.max(Number(product.totalStock) - Number(product.soldQuantity), 0);
}

function stockStatus(product) {
  const remaining = remainingStock(product);
  if (remaining === 0) return "Out of Stock";
  if (remaining <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "Available";
}

function getCartRows() {
  return cart
    .map((entry) => {
      const product = products.find((item) => item.id === entry.id);
      return product ? { ...entry, product } : null;
    })
    .filter(Boolean);
}

function cartTotal() {
  return getCartRows().reduce(
    (total, row) => total + row.product.price * row.quantity,
    0
  );
}

function orderTotal(order) {
  return Number(order.totalAmount ?? order.total ?? 0);
}

function isDeliveredOrder(order) {
  return order.status === "Delivered";
}

function generateOrderNumber() {
  const year = new Date().getFullYear();
  return `BGB-${year}-${String(orders.length + 1).padStart(6, "0")}`;
}

function acceptedProofFile(file) {
  if (!file) return false;
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const extAllowed = /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
  return allowed.includes(file.type) || extAllowed;
}

function isImageProof(order) {
  return (
    (order.paymentProofType || "").startsWith("image/") ||
    /^data:image\//i.test(order.paymentProofData || "")
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function proofFileName(orderNumber, proofType) {
  const extension = proofType === "application/pdf" ? "pdf" : "jpg";
  return `${orderNumber}.${extension}`;
}

function buildOrdersCsv() {
  const headers = [
    "Order Number",
    "Created At",
    "Buyer Name",
    "Mobile Number",
    "Email Address",
    "Delivery Point Address",
    "Items",
    "Total Amount",
    "Order Status",
    "UTR Number",
    "Payment Proof File",
    "Payment Submitted At"
  ];
  const rows = orders.map((order) => [
    order.orderNumber,
    new Date(order.createdAt).toLocaleString("en-IN"),
    order.buyerName,
    order.mobileNumber,
    order.emailAddress,
    order.deliveryLocation || DELIVERY_POINT_ADDRESS,
    order.items
      .map((item) => `${item.name} x ${item.quantity} @ ${money(item.unitPrice)}`)
      .join("; "),
    orderTotal(order),
    order.status,
    order.utrNumber,
    order.paymentProofName || proofFileName(order.orderNumber, order.paymentProofType),
    order.paymentSubmittedAt ? new Date(order.paymentSubmittedAt).toLocaleString("en-IN") : ""
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function sendToGoogleSheets(csvText) {
  fetch(GOOGLE_WEB_APP_URL, {
    method: "POST",
    body: csvText
  })
  .then(r => r.text())
  .then(m => console.log("Sheet Sync Status:", m))
  .catch(e => console.error("Sheet Sync Error:", e));
}

function downloadOrdersCsv() {
  if (!orders.length) {
    alert("No orders available to export.");
    return;
  }
  const csvData = buildOrdersCsv();
  sendToGoogleSheets(csvData);

  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bgbazaar-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openPaymentProof(orderId) {
  const order = orders.find((item) => item.id === orderId);
  if (!order || !order.paymentProofData || order.paymentProofData === "#") {
    alert("No payment proof is available for this order.");
    return;
  }

  const preview = window.open("", "_blank");
  if (!preview) {
    alert("Please allow pop-ups to open the payment proof preview.");
    return;
  }

  const safeTitle = escapeHtml(`Payment Proof - ${order.orderNumber}`);
  const proofMarkup = isImageProof(order)
    ? `<img src="${escapeHtml(order.paymentProofData)}" alt="${safeTitle}">`
    : `<iframe src="${escapeHtml(order.paymentProofData)}" title="${safeTitle}"></iframe>`;

  preview.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${safeTitle}</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #0f172a;
            color: #fff;
            font-family: Arial, sans-serif;
          }
          main {
            width: min(100% - 32px, 1100px);
            display: grid;
            gap: 16px;
            padding: 24px 0;
          }
          h1 {
            margin: 0;
            font-size: 22px;
          }
          img,
          iframe {
            width: 100%;
            height: min(82vh, 820px);
            object-fit: contain;
            border: 0;
            border-radius: 14px;
            background: #fff;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>${safeTitle}</h1>
          ${proofMarkup}
        </main>
      </body>
    </html>
  `);
  preview.document.close();
}

function printOrderDetails(orderId) {
  const order = orders.find((item) => item.id === orderId);
  if (!order) {
    alert("Order details are not available.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print order details.");
    return;
  }

  const items = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${item.quantity}</td>
          <td>${money(item.unitPrice)}</td>
          <td>${money(item.subtotal)}</td>
        </tr>`
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(order.orderNumber)} Order Details</title>
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #0f172a; font: 12px/1.45 Arial, sans-serif; }
          h1 { margin: 0 0 6px; font-size: 22px; }
          h2 { margin: 14px 0 8px; font-size: 14px; }
          p { margin: 3px 0; }
          .header { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 2px solid #0797a8; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
          .card { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { padding: 7px; border-bottom: 1px solid #e2e8f0; text-align: left; }
          th { color: #64748b; background: #f8fafc; font-size: 11px; text-transform: uppercase; }
          .total { margin-top: 12px; color: #0797a8; text-align: right; font-size: 18px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>BG BAZAAR Order Details</h1>
            <p><strong>Order:</strong> ${escapeHtml(order.orderNumber)}</p>
            <p><strong>Date:</strong> ${escapeHtml(new Date(order.createdAt).toLocaleString("en-IN"))}</p>
            <p><strong>UTR:</strong> ${escapeHtml(order.utrNumber || "Not provided")}</p>
          </div>
          <div>
            <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
            <p><strong>Total:</strong> ${money(orderTotal(order))}</p>
          </div>
        </div>
        <div class="grid">
          <div class="card">
            <h2>Customer</h2>
            <p><strong>Name:</strong> ${escapeHtml(order.buyerName)}</p>
            <p><strong>Mobile:</strong> ${escapeHtml(order.mobileNumber)}</p>
            <p><strong>Email:</strong> ${escapeHtml(order.emailAddress)}</p>
          </div>
          <div class="card">
            <h2>Pickup</h2>
            <p><strong>Pickup Point:</strong></p>
            <p>${escapeHtml(order.deliveryLocation || DELIVERY_POINT_ADDRESS)}</p>
          </div>
        </div>
        <h2>Items</h2>
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
          <tbody>${items}</tbody>
        </table>
        <div class="total">Total: ${money(orderTotal(order))}</div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function renderShared() {
  $$("#siteLogo, #heroLogo").forEach((logo) => {
    logo.src = settings.logoUrl || DEFAULT_LOGO;
  });
  $$("#siteName").forEach((node) => {
    node.textContent = settings.siteName || "BG BAZAAR";
  });
  $$("#navCartCount").forEach((node) => {
    node.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  });
  const activeMetric = $("#activeProductsMetric");
  const cartMetric = $("#cartItemsMetric");
  const ordersMetric = $("#ordersMetric");
  if (activeMetric) activeMetric.textContent = products.filter((item) => item.listed).length;
  if (cartMetric) cartMetric.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (ordersMetric) ordersMetric.textContent = orders.length;
}

function renderUserStatus() {
  const userLoginSection = $("#userLoginSection");
  const userLoggedInSection = $("#userLoggedInSection");
  const loggedInUserEmail = $("#loggedInUserEmail");

  if (userLoginSection) userLoginSection.classList.toggle("hidden", isUserLoggedIn);
  if (userLoggedInSection) userLoggedInSection.classList.toggle("hidden", !isUserLoggedIn);
  if (loggedInUserEmail && isUserLoggedIn) loggedInUserEmail.textContent = userData?.email || '-';
}

function fillCheckoutForm() {
  const buyerNameInput = $("#buyerName") || document.getElementsByName("buyerName")[0];
  const phoneInput = $("#phone") || document.getElementsByName("phone")[0];
  const emailInput = $("#email") || document.getElementsByName("email")[0];
  const locationInput = $("#location") || document.getElementsByName("location")[0];

  if (locationInput) locationInput.value = DELIVERY_POINT_ADDRESS;
  
  if (isUserLoggedIn && userData) {
    if (buyerNameInput) buyerNameInput.value = userData.name || "";
    if (phoneInput) phoneInput.value = userData.phone || "";
    if (emailInput) emailInput.value = userData.email || "";
  }
}

function renderFilters() {
  const categoryFilter = $("#categoryFilter");
  if (!categoryFilter) return;
  const previous = categoryFilter.value || "all";
  const categoryNames = categories.map(c => c.name).sort();
  categoryFilter.innerHTML =
    `<option value="all">All categories</option>` +
    categoryNames
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
  categoryFilter.value = categoryNames.includes(previous) ? previous : "all";
}

function renderProductCategorySelect(preferredCategory = "") {
  const categorySelect = $("#productCategorySelect");
  if (!categorySelect) return;

  const currentCategory = preferredCategory || categorySelect.value;
  const categoryNames = categories.map((category) => category.name).sort();
  const legacyOption =
    currentCategory && !categoryNames.includes(currentCategory)
      ? `<option value="${escapeHtml(currentCategory)}">${escapeHtml(currentCategory)} (Archived)</option>`
      : "";

  categorySelect.innerHTML =
    `<option value="">${categoryNames.length ? "Select a category" : "Create a category first"}</option>` +
    legacyOption +
    categoryNames
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
  categorySelect.value = currentCategory;
}

function renderCategories() {
  renderProductCategorySelect();
  const categoriesList = $("#categoriesList");
  if (!categoriesList || !isAdminLoggedIn) return;

  categoriesList.innerHTML = categories.length
    ? categories
        .map((category) => {
          const productCount = products.filter(p => p.category === category.name).length;
          return `
            <div style="padding: 12px; background: #fff; border: 1px solid var(--line); border-radius: 6px; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; margin-bottom: 10px;">
              <div>
                <strong>${escapeHtml(category.name)}</strong>
                <p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">${productCount} products</p>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="ghost-btn" type="button" data-edit-category="${category.id}" style="padding: 6px 10px; font-size: 12px;">Edit</button>
                <button class="danger-btn" type="button" data-delete-category="${category.id}" style="padding: 6px 10px; font-size: 12px;">Delete</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty">No categories yet.</div>`;
}

function fillCategoryForm(id) {
  const categoryForm = $("#categoryForm");
  const category = categories.find((c) => c.id === id);
  if (!categoryForm || !category) return;
  categoryForm.elements.categoryId.value = category.id;
  categoryForm.elements.categoryName.value = category.name;
  categoryForm.elements.categoryDescription.value = category.description || "";
  $("#saveCategoryBtn").textContent = "Update Category";
  showAdminPanel("categorySetup");
  categoryForm.elements.categoryName.focus();
}

function resetCategoryForm() {
  const categoryForm = $("#categoryForm");
  if (!categoryForm) return;
  categoryForm.reset();
  categoryForm.elements.categoryId.value = "";
  $("#saveCategoryBtn").textContent = "Add Category";
}

function renderShop() {
  const productGrid = $("#productGrid");
  if (!productGrid) return;
  const query = ($("#searchInput")?.value || "").trim().toLowerCase();
  const category = $("#categoryFilter")?.value || "all";

  const visible = products.filter((item) => {
    const remaining = remainingStock(item);
    const matchesQuery =
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    const matchesCategory = category === "all" || item.category === category;
    return item.listed && remaining > 0 && matchesQuery && matchesCategory;
  });

  productGrid.innerHTML = visible.length
    ? visible
        .map((item) => {
          const remaining = remainingStock(item);
          const cartQuantity = cart.find((cartItem) => cartItem.id === item.id)?.quantity || 0;
          const stockClass = remaining === 0 ? "out" : remaining <= LOW_STOCK_THRESHOLD ? "low" : "";
          const publicStock = item.showPublicQuantity
            ? `<span class="stock ${stockClass}">Stock left: ${remaining}</span>`
            : `<span class="stock ${stockClass}">${stockStatus(item)}</span>`;
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
        })
        .join("")
    : `<div class="empty">No listed products match the selected filters.</div>`;
}

function renderCart() {
  const cartList = $("#cartList");
  const rows = getCartRows();
  const cartTotalNode = $("#cartTotal");
  const paymentAmount = $("#paymentAmount");
  if (cartTotalNode) cartTotalNode.textContent = money(cartTotal());
  if (paymentAmount) paymentAmount.textContent = money(cartTotal());

  if (cartList) {
    cartList.innerHTML = rows.length
      ? rows
          .map((row) => {
            const subtotal = row.product.price * row.quantity;
            return `
            <article class="cart-item">
              <div>
                <strong>${escapeHtml(row.product.name)}</strong>
                <p class="muted">Qty ${row.quantity} x ${money(row.product.price)} = ${money(subtotal)}</p>
                <p class="muted">${remainingStock(row.product)} available</p>
              </div>
              <div class="cart-controls">
                <button class="qty-btn" type="button" data-minus="${row.id}">-</button>
                <strong>${row.quantity}</strong>
                <button class="qty-btn" type="button" data-plus="${row.id}">+</button>
                <button class="ghost-btn" type="button" data-remove="${row.id}">Remove</button>
              </div>
            </article>
          `;
          })
          .join("")
      : `<div class="empty">Your cart is empty.</div>`;
  }

  const checkoutSummary = $("#checkoutCartSummary");
  if (checkoutSummary) {
    checkoutSummary.innerHTML = rows.length
      ? `
        <h3>Order summary</h3>
        ${rows
          .map(
            (row) =>
              `<p>${escapeHtml(row.product.name)} x ${row.quantity} <strong>${money(row.product.price * row.quantity)}</strong></p>`
          )
          .join("")}
      `
      : `<div class="empty">Your cart is empty. Add items before checking out.</div>`;
  }
}

function renderAll() {
  renderShared();
  renderFilters();
  renderCategories();
  renderShop();
  renderCart();
  renderUserStatus();
}

// Global initialization logic block
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  fillCheckoutForm();

  // -------------------------------------------------------------
  // REAL-TIME AUTO CHECKOUT ATTACHMENT HOOK
  // -------------------------------------------------------------
  const checkoutForm = document.getElementById("paymentForm");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
      // Allow form validation checking before firing background hook
      if (!checkoutForm.checkValidity()) return;

      try {
        const clean = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
        const fData = new FormData(checkoutForm);

        // Map cart structural strings for product summaries
        const itemsSummaryString = getCartRows()
          .map((r) => `${r.product.name} x ${r.quantity} @ ${money(r.product.price)}`)
          .join("; ");

        const calculatedTotal = money(cartTotal());
        const generatedOrderNo = `BGB-${new Date().getFullYear()}-${String(orders.length + 1).padStart(6, "0")}`;

        // Construct a structured spreadsheet text row matching columns A-L
        const liveCsvRow = `${clean(generatedOrderNo)},${clean(new Date().toLocaleString("en-IN"))},${clean(fData.get('buyerName'))},${clean(fData.get('phone'))},${clean(fData.get('email'))},${clean(fData.get('location') || DELIVERY_POINT_ADDRESS)},${clean(itemsSummaryString)},${clean(calculatedTotal)},"Payment Submitted",${clean(fData.get('utrNumber'))},${clean(generatedOrderNo + '.jpg')},${clean(new Date().toLocaleString("en-IN"))}\n`;

        // Direct background injection fetch hook to Apps Script
        fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          mode: "no-cors",
          body: liveCsvRow
        });
        console.log("Realtime checkout background post processed.");
      } catch (err) {
        console.error("Sheets automatic checkout capture hook crashed:", err);
      }
    });
  }

  // Intercept Admin Download CSV button
  const downloadBtn = document.getElementById("downloadCsvBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      downloadOrdersCsv();
    });
  }
});

// Setup continuous Firebase syncing for Admin Dashboard instances
onValue(ref(db, "orders"), (snapshot) => {
  const data = snapshot.val();
  if (data) {
    orders = migrateOrders(Object.values(data));
    renderAll();
  }
});