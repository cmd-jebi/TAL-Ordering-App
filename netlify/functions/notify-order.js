// Netlify Function: sends new-order alerts to Discord.
// The Discord webhook URL lives in a Netlify environment variable (DISCORD_WEBHOOK_URL),
// so it never appears in the website's public code.

const PHONE_PATTERN = /^(09|\+639|639)\d{9}$/;
const GCASH_REF_PATTERN = /^\d{13}$/;

// Best-effort limit per visitor address: 5 requests per 10 minutes.
// (Netlify may run several copies of this function, so this slows spam down but is not airtight.)
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
function tooManyRequests(ip) {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 500) {
        for (const [key, times] of hits) if (!times.some(t => now - t < WINDOW_MS)) hits.delete(key);
    }
    return recent.length > MAX_PER_WINDOW;
}

const text = (value, max) => String(value == null ? "" : value).trim().slice(0, max);
const peso = n => Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const reply = (statusCode, body) => ({
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
});

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });
    if ((event.body || "").length > 10000) return reply(413, { error: "Request too large" });

    const headers = event.headers || {};
    const ip = headers["x-nf-client-connection-ip"] || (headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
    if (tooManyRequests(ip)) return reply(429, { error: "Too many orders. Please wait a few minutes." });

    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) {
        console.error("DISCORD_WEBHOOK_URL is not set in Netlify environment variables.");
        return reply(500, { error: "Notifications are not configured" });
    }

    let order;
    try { order = JSON.parse(event.body); }
    catch { return reply(400, { error: "Invalid JSON" }); }

    // ---- Validate: only real-looking orders get through ----
    const name = text(order.customer_name, 100);
    const phone = text(order.phone, 20);
    const address = text(order.address, 400);
    const payment = text(order.payment_method, 10);
    const reference = text(order.payment_reference, 20);

    if (!name || !address) return reply(400, { error: "Missing name or address" });
    if (!PHONE_PATTERN.test(phone.replace(/[\s-]/g, ""))) return reply(400, { error: "Invalid phone number" });
    if (payment !== "COD" && payment !== "GCash") return reply(400, { error: "Invalid payment method" });
    if (payment === "GCash" && !GCASH_REF_PATTERN.test(reference)) return reply(400, { error: "Invalid GCash reference" });

    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length < 1 || items.length > 20) return reply(400, { error: "Invalid items" });

    let computedTotal = 0;
    const lines = [];
    for (const i of items) {
        const qty = Number(i.qty), price = Number(i.price);
        if (!Number.isInteger(qty) || qty < 1 || qty > 99 || !(price >= 0 && price <= 10000)) {
            return reply(400, { error: "Invalid item" });
        }
        computedTotal += qty * price;
        lines.push(`• ${text(i.name, 60)} x${qty} (₱${peso(price * qty)})`);
    }
    if (Math.abs(computedTotal - Number(order.total_amount)) > 0.01) {
        return reply(400, { error: "Total does not match items" });
    }

    // ---- Build the Discord message ----
    const message = {
        allowed_mentions: { parse: [] },   // stops @everyone / @role pings
        embeds: [{
            title: "🔔 NEW ORDER RECEIVED!",
            color: 14051112,
            fields: [
                { name: "Customer Name", value: name, inline: true },
                { name: "Phone Number", value: phone, inline: true },
                { name: "Payment Method", value: payment, inline: true },
                ...(payment === "GCash" ? [{ name: "GCash Reference No.", value: reference, inline: true }] : []),
                { name: "Delivery Address", value: address },
                { name: "Items Ordered", value: lines.join("\n").slice(0, 1000) },
                { name: "Total Amount", value: `**₱${peso(computedTotal)}**` }
            ],
            timestamp: new Date().toISOString()
        }]
    };

    try {
        const res = await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message)
        });
        if (!res.ok) {
            console.error("Discord rejected the message:", res.status);
            return reply(502, { error: "Discord rejected the message" });
        }
        return reply(200, { ok: true });
    } catch (err) {
        console.error("Could not reach Discord:", err);
        return reply(502, { error: "Could not reach Discord" });
    }
};
