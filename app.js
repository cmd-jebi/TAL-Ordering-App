/* ===== Tinamai at Lumpken – Ordering App ===== */

// 1. CONFIGURATION ----------------------------------------------------------
// Replace these with your real values. While they still say "YOUR_...",
// the site runs in DEMO MODE (orders are not sent anywhere, so you can test safely).
const SUPABASE_URL = "https://hrbdelmxgrktphoixoze.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYmRlbG14Z3JrdHBob2l4b3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MDY2MzEsImV4cCI6MjEwODQ4MjYzMX0.TzO6eZShelYDwRRh5hs3wNd_imsnROP5nj5LyKKfdUU";
const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1563874988308561961/pA03ZYMzrs4QSFQbDPmTGSPXdELMQv0ePxIKuM0_gwP5DawFBUXYiBR8b0ZHiN8pLoF6";
const GCASH_NUMBER = "0967-497-0565"; // <- put your real GCash number here

// 2. MENU -------------------------------------------------------------------
// To add a new item later, copy one block and change the details.
// PHOTOS: save your product pictures inside images/products/ using the file names below.
// If your file is .png or .webp instead of .jpg, just change the extension in the "image" line.
// If a photo is missing, the card automatically shows an emoji instead.
const MENU = [
    { id: 1, category: "tinamai", name: "Original Tinamai", price: 49, serving: "4 pcs", image: "resources/og-tinamai.jpg", emoji: "🥟", style: "original",
      description: "Traditional tinamai with savory seasoning and fresh ingredients." },
    { id: 2, category: "tinamai", name: "Spicy Tinamai (Chili-Garlic)", price: 59, serving: "4 pcs", image: "resources/spicy-tinamai.jpg", emoji: "🌶️", style: "spicy",
      description: "Tinamai with chili, garlic, and spicy seasoning." },
    { id: 3, category: "tinamai", name: "Cheesy Tinamai", price: 59, serving: "4 pcs", image: "resources/cheesy-tinamai.jpg", emoji: "🧀", style: "cheesy",
      description: "Tinamai filled with creamy and flavorful cheese." },
    { id: 4, category: "lumpken", name: "Classic Lumpken", price: 39, serving: "5 pcs (cooked)", image: "resources/lumpken.jpg", emoji: "🌯", style: "lumpken",
      description: "Finely minced chicken, carrots, and savory seasonings, wrapped and fried."}
];

// 3. SETUP ------------------------------------------------------------------
const isConfigured = v => v && !v.startsWith("YOUR_");
const sb = (isConfigured(SUPABASE_URL) && isConfigured(SUPABASE_ANON_KEY) && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!sb) {
    if (!window.supabase) console.error("[TAL] Supabase library did not load (blocked or offline). Orders will NOT be saved to the database.");
    else console.error("[TAL] SUPABASE_URL / SUPABASE_ANON_KEY are not set in app.js. Orders will NOT be saved to the database.");
}

let cart = loadCart();

const $ = id => document.getElementById(id);
const peso = n => Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 4. RENDER MENU ------------------------------------------------------------
function renderMenu() {
    ["tinamai", "lumpken"].forEach(cat => {
        const grid = $("grid-" + cat);
        const cards = MENU.filter(i => i.category === cat).map(item => `
            <article class="menu-card">
                <div class="card-visual ${item.style}">
                    ${item.image ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy">` : `<span aria-hidden="true">${item.emoji}</span>`}
                    ${item.badge ? `<span class="badge">${escapeHTML(item.badge)}</span>` : ""}
                </div>
                <div class="card-body">
                    <h4>${escapeHTML(item.name)}</h4>
                    <p class="card-desc">${escapeHTML(item.description)}</p>
                    <div class="card-meta">
                        <span class="serving">${escapeHTML(item.serving)}</span>
                        <span class="price">₱${item.price}${item.note ? ` <small>(${escapeHTML(item.note)})</small>` : ""}</span>
                    </div>
                    <button class="btn btn-red" type="button" data-add="${item.id}">Add to Order</button>
                </div>
            </article>
        `).join("");

        grid.innerHTML = cards + `
            <article class="menu-card coming-soon">
                <div class="big">✨</div>
                <h4>More ${cat === "tinamai" ? "Tinamai" : "Lumpken"} Flavors</h4>
                <p>Coming soon!</p>
            </article>`;
    });

    document.querySelectorAll("[data-add]").forEach(btn =>
        btn.addEventListener("click", () => addToCart(Number(btn.dataset.add))));

    // If a photo is missing or fails to load, show the emoji instead
    document.querySelectorAll(".card-visual img").forEach(img =>
        img.addEventListener("error", () => {
            const item = MENU.find(i => i.name === img.alt);
            const span = document.createElement("span");
            span.setAttribute("aria-hidden", "true");
            span.textContent = item ? item.emoji : "🥟";
            img.replaceWith(span);
        }));
}

// 5. CART -------------------------------------------------------------------
function loadCart() {
    try { return JSON.parse(localStorage.getItem("tal_cart")) || []; }
    catch { return []; }
}
function saveCart() {
    try { localStorage.setItem("tal_cart", JSON.stringify(cart)); } catch { /* storage unavailable */ }
}

function addToCart(id) {
    const item = MENU.find(i => i.id === id);
    if (!item) return;
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    updateCartUI();
    showToast(`Added ${item.name}`);
    const btn = $("cart-btn");
    btn.classList.add("bump");
    setTimeout(() => btn.classList.remove("bump"), 200);
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

const cartTotal = () => cart.reduce((sum, i) => sum + i.price * i.qty, 0);

function updateCartUI() {
    saveCart();
    const count = cart.reduce((sum, i) => sum + i.qty, 0);
    $("cart-count").textContent = count;
    $("cart-total").textContent = peso(cartTotal());
    $("modal-total").textContent = peso(cartTotal());
    $("checkout-btn").disabled = cart.length === 0;

    if (cart.length === 0) {
        $("cart-items").innerHTML = '<p class="empty-msg">Your cart is empty.<br>Add something tasty! 🥟</p>';
        return;
    }

    $("cart-items").innerHTML = cart.map(i => `
        <div class="cart-row">
            <div>
                <div class="cart-row-name">${escapeHTML(i.name)}</div>
                <div class="cart-row-price">₱${i.price} each</div>
            </div>
            <div class="qty">
                <button type="button" data-qty="${i.id}" data-delta="-1" aria-label="Decrease quantity">−</button>
                <span>${i.qty}</span>
                <button type="button" data-qty="${i.id}" data-delta="1" aria-label="Increase quantity">+</button>
            </div>
            <div class="line-total">₱${peso(i.price * i.qty)}</div>
        </div>
    `).join("");

    document.querySelectorAll("[data-qty]").forEach(btn =>
        btn.addEventListener("click", () => changeQty(Number(btn.dataset.qty), Number(btn.dataset.delta))));
}

function openCart() {
    $("cart-drawer").classList.add("open");
    $("overlay").classList.add("show");
}
function closeCart() {
    $("cart-drawer").classList.remove("open");
    $("overlay").classList.remove("show");
}

// 6. CHECKOUT ---------------------------------------------------------------
function openCheckout() {
    if (cart.length === 0) return;
    closeCart();
    $("modal-total").textContent = peso(cartTotal());
    $("form-error").hidden = true;
    $("checkout-modal").classList.add("show");
}
function closeCheckout() {
    $("checkout-modal").classList.remove("show");
}
function toggleGCash() {
    $("gcash-box").hidden = $("payment-method").value !== "GCash";
}

// Accepts 09XXXXXXXXX, +639XXXXXXXXX or 639XXXXXXXXX (spaces/dashes allowed)
function isValidPHPhone(value) {
    return /^(09|\+639|639)\d{9}$/.test(value.replace(/[\s-]/g, ""));
}

function showError(msg, field) {
    const el = $("form-error");
    el.textContent = msg;
    el.hidden = false;
    if (field) { field.classList.add("invalid"); field.focus(); }
}

async function submitOrder(event) {
    event.preventDefault();
    const form = $("checkout-form");
    form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
    $("form-error").hidden = true;

    const nameEl = $("cust-name"), phoneEl = $("cust-phone"), addressEl = $("cust-address");
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const address = addressEl.value.trim();
    const notes = $("cust-notes").value.trim();
    const payment = $("payment-method").value;

    if (!name) return showError("Please enter your full name.", nameEl);
    if (!isValidPHPhone(phone)) return showError("Please enter a valid mobile number (e.g. 09171234567).", phoneEl);
    if (!address) return showError("Please enter your delivery address.", addressEl);
    if (cart.length === 0) return showError("Your cart is empty.");

    const btn = $("submit-order-btn");
    btn.disabled = true;
    btn.textContent = "Placing order...";

    const order = {
        customer_name: name,
        phone,
        address: notes ? `${address} (Note: ${notes})` : address,
        payment_method: payment,
        items: cart,
        total_amount: cartTotal()
    };

    // A. Save to Supabase (the database record)
    let saved = false;
    if (sb) {
        try {
            const { error } = await sb.from("orders").insert([order]);
            if (error) throw error;
            saved = true;
        } catch (err) {
            console.error("[TAL] Supabase save FAILED:", err);
        }
    } else {
        console.error("[TAL] Order NOT saved to database (Supabase not configured):", order);
    }

    // B. Notify the kitchen on Discord (so an order is never lost if the database fails)
    const alerted = await sendDiscordAlert(order);

    btn.disabled = false;
    btn.textContent = "Place Order";

    if (!saved && !alerted) {
        return showError("Sorry, we couldn't place your order. Please try again or call +63 967 497 0565.");
    }

    // C. Success
    cart = [];
    updateCartUI();
    form.reset();
    toggleGCash();
    closeCheckout();
    showToast("🎉 Order placed! We'll contact you shortly.", 5000);
}

async function sendDiscordAlert(order) {
    if (!isConfigured(DISCORD_WEBHOOK_URL)) return false;

    const itemList = order.items.map(i => `• ${i.name} x${i.qty} (₱${i.price * i.qty})`).join("\n");
    const message = {
        embeds: [{
            title: "🔔 NEW ORDER RECEIVED!",
            color: 14051112,
            fields: [
                { name: "Customer Name", value: order.customer_name, inline: true },
                { name: "Phone Number", value: order.phone, inline: true },
                { name: "Payment Method", value: order.payment_method, inline: true },
                { name: "Delivery Address", value: order.address },
                { name: "Items Ordered", value: itemList },
                { name: "Total Amount", value: `**₱${peso(order.total_amount)}**` }
            ],
            timestamp: new Date().toISOString()
        }]
    };

    try {
        const res = await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message)
        });
        return res.ok;
    } catch (e) {
        console.error("[TAL] Discord alert failed:", e);
        return false;
    }
}

// 7. TOAST ------------------------------------------------------------------
let toastTimer;
function showToast(text, ms = 1800) {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

// 8. INIT -------------------------------------------------------------------
$("cart-btn").addEventListener("click", openCart);
$("cart-close").addEventListener("click", closeCart);
$("overlay").addEventListener("click", closeCart);
$("checkout-btn").addEventListener("click", openCheckout);
$("checkout-close").addEventListener("click", closeCheckout);
$("checkout-modal").addEventListener("click", e => { if (e.target.id === "checkout-modal") closeCheckout(); });
$("payment-method").addEventListener("change", toggleGCash);
$("checkout-form").addEventListener("submit", submitOrder);
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeCart(); closeCheckout(); } });

$("gcash-number").textContent = GCASH_NUMBER;
$("year").textContent = new Date().getFullYear();
renderMenu();
updateCartUI();
