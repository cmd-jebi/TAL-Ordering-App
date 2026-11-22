/* ===== Tinamai at Lumpken – Ordering App ===== */

// 1. CONFIGURATION ----------------------------------------------------------
// Replace these with your real values. While they still say "YOUR_...",
// the site runs in DEMO MODE (orders are not sent anywhere, so you can test safely).
const SUPABASE_URL = "https://hrbdelmxgrktphoixoze.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYmRlbG14Z3JrdHBob2l4b3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MDY2MzEsImV4cCI6MjEwODQ4MjYzMX0.TzO6eZShelYDwRRh5hs3wNd_imsnROP5nj5LyKKfdUU";
const NOTIFY_ENDPOINT = "/.netlify/functions/notify-order";
const GCASH_NUMBER = "0967-497-0565"; // <- put your real GCash number here
// Put your GCash QR image at resources/gcash-qr.png (the picture you get from "My QR" in the GCash app).
// GCash reference numbers are 13 digits. Change this pattern if you also accept other wallets.
const GCASH_REF_PATTERN = /^\d{13}$/;

// 2. MENU -------------------------------------------------------------------
// To add a new item later, copy one block and change the details.
// PHOTOS: save your product pictures inside images/products/ using the file names below.
// If your file is .png or .webp instead of .jpg, just change the extension in the "image" line.
// If a photo is missing, the card automatically shows an emoji instead.
const MENU = [
    { id: 1, category: "tinamai", name: "Classic Tinamai", price: 49, serving: "4 pcs", image: "resources/classic-tinamai.png", emoji: "🥟", style: "original",
      description: "Traditional tinamai with savory seasoning and fresh ingredients." },
    { id: 2, category: "tinamai", name: "Spicy Tinamai (Chili-Garlic)", price: 59, serving: "4 pcs", image: "resources/spicy-tinamai.png", emoji: "🌶️", style: "spicy",
      description: "Tinamai with chili, garlic, and spicy seasoning." },
    { id: 3, category: "tinamai", name: "Cheesy Tinamai", price: 59, serving: "4 pcs", image: "resources/cheesy-tinamai.png", emoji: "🧀", style: "cheesy",
      description: "Tinamai filled with creamy and flavorful cheese." },
    { id: 4, category: "tinamai", name: "Tinamai with Rice", price: 59, serving: "4 pcs + rice", image: "resources/tinamai-with-rice.png", emoji: "🍚", style: "cheesy",
      description: "Savory tinamai served with steamed rice." },
    { id: 5, category: "lumpken", name: "Classic Lumpken", price: 39, serving: "5 pcs (cooked)", image: "resources/classic-lumpken.png", emoji: "🌯", style: "lumpken",
      description: "Finely minced chicken, carrots, and savory seasonings, wrapped and fried." },
    { id: 6, category: "lumpken", name: "Malunggay & Veggie Sneak", price: 39, serving: "6 pcs (cooked)", image: "resources/veggie-sneak-lumpken.png", emoji: "🥗", style: "lumpken",
      description: "Chicken with malunggay leaves and finely chopped vegetables." },
    { id: 7, category: "lumpken", name: "Curry Chicken", price: 39, serving: "5 pcs (cooked)", image: "resources/curry-lumpken.png", emoji: "🥔", style: "lumpken",
      description: "Ground chicken, diced potatoes, curry aromatics." },
    { id: 8, category: "lumpken", name: "Frozen Lumpken", price: 120, serving: "12 pcs (frozen)", image: "resources/frozen-lumpken.png", emoji: "❄️", style: "lumpken",
      description: "Pre-rolled and flash-frozen for air-frying or deep-frying at home (classic or veggie)."}
    
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
                    <div class="rating-line" data-rating-for="${item.id}">${ratingInner(item.id)}</div>
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
    prefillCheckout();
    toggleGCash();
    $("checkout-modal").classList.add("show");
}
function closeCheckout() {
    $("checkout-modal").classList.remove("show");
}
function toggleGCash() {
    $("gcash-box").hidden = $("payment-method").value !== "GCash";
    $("gcash-amount").textContent = peso(cartTotal());
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

    if (!$("privacy-consent").checked) return showError("Please tick the box to agree to the Privacy Notice.", $("privacy-consent"));
    const waitMs = 60000 - (Date.now() - Number(localStorage.getItem("tal_last_order") || 0));
    if (waitMs > 0) return showError(`Please wait ${Math.ceil(waitMs / 1000)} seconds before placing another order.`);
    const refEl = $("payment-ref");
    const reference = refEl.value.replace(/\s/g, "");
    if (payment === "GCash" && !GCASH_REF_PATTERN.test(reference)) {
        return showError("Enter the 13-digit reference number from your GCash receipt.", refEl);
    }

    const btn = $("submit-order-btn");
    btn.disabled = true;
    btn.textContent = "Placing order...";

    const order = {
        customer_name: name,
        phone,
        address: notes ? `${address} (Note: ${notes})` : address,
        payment_method: payment,
        items: cart,
        total_amount: cartTotal(),
        payment_reference: payment === "GCash" ? reference : null,
        user_id: currentUser ? currentUser.id : null
    };

    // A. Save to Supabase (the database record)
    let saved = false;
    let duplicateRef = false;
    let rateLimited = false;
    if (sb) {
        try {
            await saveOrder(order);
            saved = true;
        } catch (err) {
            if (err && err.code === "23505") duplicateRef = true;
            else if (err && /rate_limit/.test(err.message || "")) rateLimited = true;
            else console.error("[TAL] Supabase save FAILED:", err);
        }
    } else {
        console.error("[TAL] Order NOT saved to database (Supabase not configured):", order);
    }

    if (duplicateRef) {
        btn.disabled = false;
        btn.textContent = "Place Order";
        return showError("That reference number was already used on another order. Please check your receipt.", refEl);
    }
    
    if (rateLimited) {
        btn.disabled = false;
        btn.textContent = "Place Order";
        return showError("You've placed several orders recently. Please wait a while, or call us at +63 967 497 0565 if you need help.");
    }

    // B. Notify the kitchen on Discord (so an order is never lost if the database fails)
    const alerted = await sendDiscordAlert(order);

    btn.disabled = false;
    btn.textContent = "Place Order";

    if (!saved && !alerted) {
        return showError("Sorry, we couldn't place your order. Please try again or call +63 967 497 0565.");
    }

    // C. Success
    const orderedItems = cart.map(i => ({ id: i.id, name: i.name }));
    cart = [];
    updateCartUI();
    form.reset();
    toggleGCash();
    closeCheckout();
    showToast("🎉 Order placed! We'll contact you shortly.", 5000);
    queueFeedback(orderedItems, name);
    try { localStorage.setItem("tal_last_order", String(Date.now())); } catch { /* storage unavailable */ }
}

// Saves an order. If the database does not have the newer columns yet (see supabase-setup.sql),
// it retries with the original columns so customers can still order. The reference number is then
// kept inside the address text so it is never lost.
async function saveOrder(order) {
    const { error } = await sb.from("orders").insert([order]);
    if (!error) return;
    const missingColumn = error.code === "PGRST204" || error.code === "42703" || /column/i.test(error.message || "");
    if (!missingColumn) throw error;
    console.warn("[TAL] orders table is missing new columns; saving with the basic columns. Run supabase-setup.sql.");
    const { payment_reference, user_id, ...basic } = order;
    if (payment_reference) basic.address += ` (GCash ref: ${payment_reference})`;
    const retry = await sb.from("orders").insert([basic]);
    if (retry.error) throw retry.error;
}

async function sendDiscordAlert(order) {
    try {
        const res = await fetch(NOTIFY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_name: order.customer_name,
                phone: order.phone,
                address: order.address,
                payment_method: order.payment_method,
                payment_reference: order.payment_reference,
                items: order.items.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
                total_amount: order.total_amount
            })
        });
        return res.ok;
    } catch (e) {
        console.error("[TAL] Order alert failed:", e);
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

// 8. CONTENT YOU CAN EDIT: NEWS, TEAM, GALLERY -------------------------------
const NEWS = [
    { tag: "New", title: "Online ordering is open", text: "Order tinamai and lumpken from this website and pay by cash on delivery or GCash.", cta: "Order now", href: "#menu" },
    { tag: "New", title: "Tinamai with Rice for ₱59", text: "4 pcs of tinamai with steamed rice. A filling budget meal for students and workers.", cta: "See the menu", href: "#menu" },
    { tag: "Stock up", title: "Frozen Lumpken: 12 pcs for ₱120", text: "Pre-rolled and flash-frozen. Fry or air-fry it at home whenever you want it hot.", cta: "Add to order", href: "#menu" },
    { tag: "Coming soon", title: "More flavors on the way", text: "We are working on new tinamai and lumpken flavors. Follow our updates here.", soon: true }
];

// Add each partner's name (and optionally a photo path like "resources/team/maria.jpg").
// Cards with no name simply show the role.
const TEAM = [
    { role: "Business Manager", emoji: "📋", name: "Zed Mahomoc", photo: "resources/mahomoc-zed.jpg", desc: "Leads the business, plans our growth, and manages partnerships." },
    { role: "Production Head", emoji: "🧑‍🍳", name: "Jhane Andrea Dalisay", photo: "resources/dalisay-jhane-andrea.jpg", desc: "Oversees every batch of tinamai and lumpken, from ingredients to quality checks." },
    { role: "Accountant", emoji: "🧾", name: "Jb Galarido", photo: "resources/galarido-jb.jpg", desc: "Keeps the books, tracks costs and prices, and confirms payments." },
    { role: "Social Media Manager", emoji: "📣", name: "Stephanie Auxilian", photo: "resources/auxilian-stephanie.jpg", desc: "Runs our online pages and shares promotions, news, and photos." },
    { role: "Customer Support", emoji: "💬", name: "John Lennon Biong", photo: "resources/biong-jhon-Lennon.png", desc: "Answers your questions, confirms orders, and handles any concern." }
];

function renderNews() {
    $("news-grid").innerHTML = NEWS.map(n => `
        <article class="news-card">
            <span class="news-tag ${n.soon ? "soon" : ""}">${escapeHTML(n.tag)}</span>
            <h4>${escapeHTML(n.title)}</h4>
            <p>${escapeHTML(n.text)}</p>
            ${n.cta ? `<a class="btn btn-red" href="${escapeHTML(n.href || "#menu")}">${escapeHTML(n.cta)}</a>` : ""}
        </article>`).join("");
}

function renderTeam() {
    const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    $("team-grid").innerHTML = TEAM.map(m => `
        <article class="team-card">
            <div class="team-avatar" aria-hidden="true">${m.photo ? `<img src="${escapeHTML(m.photo)}" alt="">` : escapeHTML(m.name ? initials(m.name) : m.emoji)}</div>
            <h4>${escapeHTML(m.role)}</h4>
            ${m.name ? `<p class="team-name">${escapeHTML(m.name)}</p>` : ""}
            <p class="team-desc">${escapeHTML(m.desc)}</p>
        </article>`).join("");
}

const closeLightbox = () => $("lightbox").classList.remove("show");

// 9. ACCOUNTS (Supabase Auth) ---------------------------------------------
let currentUser = null;
const displayName = u => (u && u.user_metadata && u.user_metadata.full_name) || (u && u.email ? u.email.split("@")[0] : "");
const firstNameOf = n => String(n || "").trim().split(/\s+/)[0] || "";

function updateAuthUI() {
    const btn = $("auth-btn");
    btn.textContent = currentUser ? `Hi, ${firstNameOf(displayName(currentUser))}` : "Sign in";
    btn.setAttribute("aria-label", currentUser ? "Open your account" : "Sign in or sign up");
    $("acct-name").textContent = displayName(currentUser);
    $("acct-email").textContent = currentUser ? currentUser.email : "";
}

function showAuthTab(which) {
    const signin = which === "signin";
    $("signin-form").hidden = !signin;
    $("signup-form").hidden = signin;
    $("tab-signin").classList.toggle("active", signin);
    $("tab-signup").classList.toggle("active", !signin);
    $("tab-signin").setAttribute("aria-selected", signin);
    $("tab-signup").setAttribute("aria-selected", !signin);
    ["signin-error", "signup-error", "signup-info"].forEach(id => { $(id).hidden = true; });
}

function openAuth(tab = "signin") {
    $("auth-forms").hidden = !!currentUser;
    $("auth-account").hidden = !currentUser;
    if (!currentUser) showAuthTab(tab);
    $("auth-modal").classList.add("show");
}
const closeAuth = () => $("auth-modal").classList.remove("show");

function authError(id, msg) { const el = $(id); el.textContent = msg; el.hidden = false; }
function friendlyAuthMessage(err) {
    const m = (err && err.message) || "";
    if (/invalid login/i.test(m)) return "Wrong email or password.";
    if (/not confirmed/i.test(m)) return "Please confirm your email first. Check your inbox for our message.";
    if (/already registered|already been registered/i.test(m)) return "This email already has an account. Try signing in.";
    if (/rate limit|too many/i.test(m)) return "Too many attempts. Please wait a minute and try again.";
    return "Something went wrong. Please try again.";
}

async function handleSignIn(e) {
    e.preventDefault();
    $("signin-error").hidden = true;
    if (!sb) return authError("signin-error", "Accounts aren't available right now. You can still order as a guest.");
    const email = $("si-email").value.trim(), password = $("si-password").value;
    if (!email || !password) return authError("signin-error", "Enter your email and password.");
    const btn = $("signin-submit");
    btn.disabled = true; btn.textContent = "Signing in...";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = "Sign in";
    if (error) return authError("signin-error", friendlyAuthMessage(error));
    $("signin-form").reset();
    closeAuth();
    showToast("Signed in. Welcome back!");
}

async function handleSignUp(e) {
    e.preventDefault();
    ["signup-error", "signup-info"].forEach(id => { $(id).hidden = true; });
    if (!sb) return authError("signup-error", "Accounts aren't available right now. You can still order as a guest.");
    const name = $("su-name").value.trim(), phone = $("su-phone").value.trim();
    const email = $("su-email").value.trim(), password = $("su-password").value;
    if (!name) return authError("signup-error", "Please enter your full name.");
    if (phone && !isValidPHPhone(phone)) return authError("signup-error", "Enter a valid mobile number (e.g. 09171234567) or leave it blank.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return authError("signup-error", "Enter a valid email address.");
    if (password.length < 8) return authError("signup-error", "Your password needs at least 8 characters.");

    const btn = $("signup-submit");
    btn.disabled = true; btn.textContent = "Creating account...";
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name, phone }, emailRedirectTo: window.location.origin } });
    btn.disabled = false; btn.textContent = "Create account";
    if (error) return authError("signup-error", friendlyAuthMessage(error));
    // Supabase returns a user with no identities when the email is already registered
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        return authError("signup-error", "This email already has an account. Try signing in.");
    }
    $("signup-form").reset();
    if (data.session) { closeAuth(); showToast("Account created. Welcome!"); }
    else {
        $("signup-info").textContent = "Account created! Check your email and confirm your address, then sign in.";
        $("signup-info").hidden = false;
    }
}

async function handleSignOut() {
    if (sb) await sb.auth.signOut();
    currentUser = null;
    updateAuthUI();
    closeAuth();
    showToast("Signed out.");
}

function prefillCheckout() {
    if (!currentUser) return;
    const meta = currentUser.user_metadata || {};
    if (!$("cust-name").value) $("cust-name").value = meta.full_name || "";
    if (!$("cust-phone").value && meta.phone) $("cust-phone").value = meta.phone;
}

function initAuth() {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => { currentUser = data.session ? data.session.user : null; updateAuthUI(); });
    sb.auth.onAuthStateChange((_event, session) => { currentUser = session ? session.user : null; updateAuthUI(); });
}

// 10. RATINGS & FEEDBACK -------------------------------------------------------
// Ratings live in the Supabase "reviews" table (see supabase-setup.sql). If saving there fails,
// the rating is kept on this device only so the customer isn't blocked.
const LOCAL_REVIEWS_KEY = "tal_reviews_local";
const PENDING_KEY = "tal_pending_feedback";
let reviews = [];
let reviewStats = {};

function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } }

const starsHTML = avg => `<span class="stars" style="--pct:${Math.max(0, Math.min(100, avg / 5 * 100))}%" role="img" aria-label="${avg.toFixed(1)} out of 5 stars">★★★★★</span>`;

function ratingInner(id) {
    const s = reviewStats[id];
    if (!s) return '<span class="muted">No ratings yet</span>';
    return `${starsHTML(s.avg)} <strong>${s.avg.toFixed(1)}</strong> <span>(${s.count})</span>`;
}

function computeStats() {
    reviewStats = {};
    reviews.forEach(r => {
        const s = reviewStats[r.product_id] || (reviewStats[r.product_id] = { sum: 0, count: 0 });
        s.sum += r.rating; s.count += 1;
    });
    Object.values(reviewStats).forEach(s => { s.avg = s.sum / s.count; });
}

function refreshRatings() {
    document.querySelectorAll("[data-rating-for]").forEach(el => { el.innerHTML = ratingInner(Number(el.dataset.ratingFor)); });
}

function renderReviews() {
    const summary = $("reviews-summary"), list = $("reviews-list");
    if (reviews.length === 0) {
        summary.innerHTML = "";
        list.innerHTML = '<p class="reviews-empty">No reviews yet. Order something tasty and tell us how we did!</p>';
        return;
    }
    const avg = reviews.reduce((t, r) => t + r.rating, 0) / reviews.length;
    summary.innerHTML = `<div class="big">${avg.toFixed(1)}</div>${starsHTML(avg)}<div>from ${reviews.length} rating${reviews.length === 1 ? "" : "s"}</div>`;
    const withComments = reviews.filter(r => r.comment && r.comment.trim()).slice(0, 6);
    list.innerHTML = withComments.length ? withComments.map(r => {
        const item = MENU.find(m => m.id === r.product_id);
        return `<article class="review-card">
            ${starsHTML(r.rating)}
            ${item ? `<p class="about-item">${escapeHTML(item.name)}</p>` : ""}
            <p class="text">${escapeHTML(r.comment)}</p>
            <p class="who">${escapeHTML(r.customer_name || "Customer")}</p>
        </article>`;
    }).join("") : '<p class="reviews-empty">Customers have rated our products. Written comments will show up here.</p>';
}

async function loadReviews() {
    let remote = [];
    if (sb) {
        try {
            const { data, error } = await sb.from("reviews")
                .select("product_id,rating,comment,customer_name,created_at")
                .order("created_at", { ascending: false }).limit(500);
            if (error) throw error;
            remote = data || [];
        } catch (err) {
            console.error("[TAL] Could not load reviews (did you run supabase-setup.sql?):", err);
        }
    }
    reviews = remote.concat(readJSON(LOCAL_REVIEWS_KEY, []))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    computeStats();
    refreshRatings();
    renderReviews();
}

// Feedback popup -------------------------------------------------------------
let feedbackRatings = {};

function queueFeedback(items, customerName) {
    writeJSON(PENDING_KEY, { items, name: firstNameOf(customerName) });
    refreshRateButton();
    setTimeout(openFeedback, 800);
}
const getPending = () => readJSON(PENDING_KEY, null);
function refreshRateButton() { $("rate-last-btn").hidden = !getPending(); }

function openFeedback() {
    const pending = getPending();
    if (!pending || !pending.items || !pending.items.length) return;
    feedbackRatings = {};
    $("feedback-error").hidden = true;
    $("feedback-comment").value = "";
    $("feedback-items").innerHTML = pending.items.map(i => `
        <div class="feedback-row">
            <span class="fb-name">${escapeHTML(i.name)}</span>
            <span class="star-input" data-item="${i.id}">
                ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-value="${n}" aria-label="Rate ${escapeHTML(i.name)} ${n} out of 5" aria-pressed="false">★</button>`).join("")}
            </span>
        </div>`).join("");
    $("feedback-items").querySelectorAll(".star-input").forEach(group => {
        group.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
            const value = Number(b.dataset.value);
            feedbackRatings[group.dataset.item] = value;
            group.querySelectorAll("button").forEach(x => {
                const on = Number(x.dataset.value) <= value;
                x.classList.toggle("on", on);
                x.setAttribute("aria-pressed", Number(x.dataset.value) === value);
            });
        }));
    });
    $("feedback-modal").classList.add("show");
}
const closeFeedback = () => $("feedback-modal").classList.remove("show");

async function submitFeedback(e) {
    e.preventDefault();
    const pending = getPending();
    const rated = Object.entries(feedbackRatings).filter(([, v]) => v > 0);
    if (!pending || rated.length === 0) {
        $("feedback-error").textContent = "Tap the stars to rate at least one item.";
        $("feedback-error").hidden = false;
        return;
    }
    const comment = $("feedback-comment").value.trim().slice(0, 300);
    const rows = rated.map(([id, rating], idx) => ({
        product_id: Number(id), rating,
        comment: idx === 0 && comment ? comment : null,
        customer_name: pending.name || null
    }));

    const btn = $("feedback-submit");
    btn.disabled = true; btn.textContent = "Sending...";
    let sent = false;
    if (sb) {
        try {
            let { error } = await sb.from("reviews").insert(rows.map(r => ({ ...r, user_id: currentUser ? currentUser.id : null })));
            if (error) ({ error } = await sb.from("reviews").insert(rows));
            if (error) throw error;
            sent = true;
        } catch (err) { console.error("[TAL] Saving feedback failed:", err); }
    }
    if (!sent) {
        const stamp = new Date().toISOString();
        writeJSON(LOCAL_REVIEWS_KEY, readJSON(LOCAL_REVIEWS_KEY, []).concat(rows.map(r => ({ ...r, created_at: stamp }))));
    }
    btn.disabled = false; btn.textContent = "Send feedback";
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    refreshRateButton();
    closeFeedback();
    showToast("Thank you for your feedback! 💛", 3000);
    loadReviews();
}

// 11. INIT -------------------------------------------------------------------
$("cart-btn").addEventListener("click", openCart);
$("cart-close").addEventListener("click", closeCart);
$("overlay").addEventListener("click", closeCart);
$("checkout-btn").addEventListener("click", openCheckout);
$("checkout-close").addEventListener("click", closeCheckout);
$("checkout-modal").addEventListener("click", e => { if (e.target.id === "checkout-modal") closeCheckout(); });
$("payment-method").addEventListener("change", toggleGCash);
$("checkout-form").addEventListener("submit", submitOrder);
document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeCart(); closeCheckout(); closeAuth(); closeFeedback(); closeLightbox(); closeNav(); }
});

// Navigation (mobile menu)
const closeNav = () => { $("nav-links").classList.remove("open"); $("menu-toggle").setAttribute("aria-expanded", "false"); };
$("menu-toggle").addEventListener("click", () => {
    const open = $("nav-links").classList.toggle("open");
    $("menu-toggle").setAttribute("aria-expanded", open);
});
$("nav-links").addEventListener("click", e => { if (e.target.tagName === "A") closeNav(); });

// Accounts
$("auth-btn").addEventListener("click", () => openAuth("signin"));
$("auth-close").addEventListener("click", closeAuth);
$("auth-modal").addEventListener("click", e => { if (e.target.id === "auth-modal") closeAuth(); });
$("tab-signin").addEventListener("click", () => showAuthTab("signin"));
$("tab-signup").addEventListener("click", () => showAuthTab("signup"));
$("signin-form").addEventListener("submit", handleSignIn);
$("signup-form").addEventListener("submit", handleSignUp);
$("signout-btn").addEventListener("click", handleSignOut);

// Feedback + lightbox
$("feedback-form").addEventListener("submit", submitFeedback);
$("feedback-close").addEventListener("click", closeFeedback);
$("feedback-later").addEventListener("click", closeFeedback);
$("feedback-modal").addEventListener("click", e => { if (e.target.id === "feedback-modal") closeFeedback(); });
$("rate-last-btn").addEventListener("click", openFeedback);
$("lightbox-close").addEventListener("click", closeLightbox);
$("lightbox").addEventListener("click", e => { if (e.target.id === "lightbox") closeLightbox(); });

// If the GCash QR image is missing, say so instead of showing a broken picture
$("gcash-qr").addEventListener("error", e => {
    e.target.hidden = true;
    const note = document.createElement("p");
    note.className = "muted small";
    note.textContent = "QR code unavailable. Please send your payment to the account number below.";
    e.target.after(note);
});

$("gcash-number").textContent = GCASH_NUMBER;
$("year").textContent = new Date().getFullYear();
renderMenu();
updateCartUI();
renderNews();
renderTeam();
updateAuthUI();
initAuth();
refreshRateButton();
loadReviews();

// ===== Privacy Notice popup =====
document.addEventListener("click", e => {
    const link = e.target.closest("[data-open-privacy]");
    if (!link) return;
    e.preventDefault();
    $("privacy-modal").classList.add("show");
});
const closePrivacy = () => $("privacy-modal").classList.remove("show");
$("privacy-close").addEventListener("click", closePrivacy);
$("privacy-ok").addEventListener("click", closePrivacy);
$("privacy-modal").addEventListener("click", e => { if (e.target.id === "privacy-modal") closePrivacy(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closePrivacy(); });
