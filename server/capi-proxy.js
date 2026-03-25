/**
 * CAPI Proxy Server — Business SDK Style Implementation
 *
 * Server-side proxy that uses a class-based pattern inspired by the
 * Meta Business SDK (facebook-nodejs-business-sdk). Instead of raw
 * fetch calls to the Graph API, this implementation uses structured
 * classes: EventRequest, ServerEvent, UserData, CustomData.
 *
 * INTENTIONAL GAPS:
 *   - No event_id / deduplication support
 *   - No data_processing_options (LDU/CCPA)
 *   - Hashes PII but does NOT normalize phone numbers first
 *   - No batch endpoint
 *
 * Endpoints:
 *   POST /api/capi/event   — Send a single event
 *   GET  /api/capi/health  — Health check
 *
 * Environment variables:
 *   META_PIXEL_ID      — Your Meta Pixel ID
 *   META_ACCESS_TOKEN   — Conversions API system user token
 *   PORT               — Server port (default: 3001)
 */

const express = require("express");
const crypto = require("crypto");

const app = express();

// ─── Config ──────────────────────────────────────────────────────────────────
const PIXEL_ID = process.env.META_PIXEL_ID || "1684145446350033";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ─── Business SDK-Style Classes ──────────────────────────────────────────────

/**
 * Mirrors the Meta Business SDK's UserData class.
 * Accepts raw PII and hashes it with SHA-256.
 */
class UserData {
  constructor(data = {}) {
    this.em = data.em || "";
    this.ph = data.ph || "";
    this.fn = data.fn || "";
    this.ln = data.ln || "";
    this.external_id = data.external_id || "";
    this.fbp = data.fbp || "";
    this.fbc = data.fbc || "";
    this.client_ip_address = data.client_ip_address || "";
    this.client_user_agent = data.client_user_agent || "";
  }

  static _hash(value) {
    if (!value) return "";
    if (/^[a-f0-9]{64}$/.test(value)) return value;
    // GAP: Does not normalize phone numbers (strip non-digits, add country code)
    return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
  }

  toPayload() {
    const payload = {};
    if (this.em) payload.em = UserData._hash(this.em);
    if (this.ph) {
      // Normalize phone: strip non-digits before hashing
      const normalizedPhone = this.ph.replace(/\D/g, "");
      payload.ph = UserData._hash(normalizedPhone);
    }
    if (this.fn) payload.fn = UserData._hash(this.fn);
    if (this.ln) payload.ln = UserData._hash(this.ln);
    if (this.external_id) payload.external_id = UserData._hash(this.external_id);
    if (this.fbp) payload.fbp = this.fbp; // Not PII, no hashing
    if (this.fbc) payload.fbc = this.fbc;
    if (this.client_ip_address) payload.client_ip_address = this.client_ip_address;
    if (this.client_user_agent) payload.client_user_agent = this.client_user_agent;
    return payload;
  }
}

/**
 * Mirrors the Meta Business SDK's CustomData class.
 */
class CustomData {
  constructor(data = {}) {
    this.value = data.value;
    this.currency = data.currency;
    this.content_name = data.content_name;
    this.content_ids = data.content_ids;
    this.content_type = data.content_type;
    this.num_items = data.num_items;
    this.search_string = data.search_string;
  }

  toPayload() {
    const payload = {};
    if (this.value !== undefined) payload.value = this.value;
    if (this.currency) payload.currency = this.currency;
    if (this.content_name) payload.content_name = this.content_name;
    if (this.content_ids) payload.content_ids = this.content_ids;
    if (this.content_type) payload.content_type = this.content_type;
    if (this.num_items !== undefined) payload.num_items = this.num_items;
    if (this.search_string) payload.search_string = this.search_string;
    return payload;
  }
}

/**
 * Mirrors the Meta Business SDK's ServerEvent class.
 */
class ServerEvent {
  constructor(data = {}) {
    this.event_name = data.event_name;
    this.event_time = data.event_time || Math.floor(Date.now() / 1000);
    this.action_source = data.action_source || "website";
    this.event_source_url = data.event_source_url || "";
    this.user_data = data.user_data ? new UserData(data.user_data) : new UserData();
    this.custom_data = data.custom_data ? new CustomData(data.custom_data) : null;
    this.event_id = data.event_id || ""; // For pixel/CAPI deduplication
    this.data_processing_options = data.data_processing_options;
    this.data_processing_options_country = data.data_processing_options_country;
    this.data_processing_options_state = data.data_processing_options_state;
  }

  toPayload() {
    const payload = {
      event_name: this.event_name,
      event_time: this.event_time,
      action_source: this.action_source,
      event_source_url: this.event_source_url,
      user_data: this.user_data.toPayload(),
    };
    if (this.custom_data) {
      payload.custom_data = this.custom_data.toPayload();
    }
    // Event deduplication
    if (this.event_id) {
      payload.event_id = this.event_id;
    }
    // Data processing options (LDU / CCPA / GDPR compliance)
    if (this.data_processing_options) {
      payload.data_processing_options = this.data_processing_options;
      payload.data_processing_options_country = this.data_processing_options_country || 0;
      payload.data_processing_options_state = this.data_processing_options_state || 0;
    }
    return payload;
  }
}

/**
 * Mirrors the Meta Business SDK's EventRequest class.
 * Sends events to the Conversions API.
 */
class EventRequest {
  constructor(pixelId, accessToken) {
    this.pixelId = pixelId;
    this.accessToken = accessToken;
    this.events = [];
    this.apiVersion = GRAPH_API_VERSION;
  }

  addEvent(serverEvent) {
    this.events.push(serverEvent);
    return this;
  }

  async execute() {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.pixelId}/events`;
    const data = this.events.map((e) => e.toPayload());

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        access_token: this.accessToken,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Conversions API error");
    }

    return {
      events_received: result.events_received || data.length,
      messages: result.messages || [],
      fbtrace_id: result.fbtrace_id,
    };
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/** POST /api/capi/event — Send a single event using SDK-style classes */
app.post("/api/capi/event", async (req, res) => {
  try {
    const body = req.body;
    if (!body.event_name) {
      return res.status(400).json({ success: false, error: "event_name is required" });
    }

    // Enrich user_data with server-side signals
    const userData = body.user_data || {};
    userData.client_ip_address =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket.remoteAddress || "";
    userData.client_user_agent = req.headers["user-agent"] || "";

    // Build event using SDK-style classes
    const serverEvent = new ServerEvent({
      event_name: body.event_name,
      event_time: body.event_time,
      event_id: body.event_id, // For pixel/CAPI deduplication
      action_source: body.action_source,
      event_source_url: body.event_source_url || req.headers.referer || "",
      user_data: userData,
      custom_data: body.custom_data,
      data_processing_options: body.data_processing_options,
      data_processing_options_country: body.data_processing_options_country,
      data_processing_options_state: body.data_processing_options_state,
    });

    // Create and execute the event request
    const eventRequest = new EventRequest(PIXEL_ID, ACCESS_TOKEN);
    eventRequest.addEvent(serverEvent);
    const result = await eventRequest.execute();

    console.log(`[CAPI-SDK] Sent: ${body.event_name}`);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[CAPI-SDK] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/capi/health — Health check */
app.get("/api/capi/health", (_req, res) => {
  return res.json({
    status: "ok",
    pixel_id: PIXEL_ID,
    has_access_token: !!ACCESS_TOKEN,
    implementation: "business-sdk-style",
    graph_api_version: GRAPH_API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[CAPI-SDK Proxy] Running on http://localhost:${PORT}`);
});

module.exports = app;
