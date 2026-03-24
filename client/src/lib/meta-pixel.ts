/**
 * Meta Pixel & Conversions API — Business SDK Style via Server-Side Proxy
 * 
 * CAPI METHOD: Server-Side Proxy (Business SDK-style class construction)
 *   Uses class-based ServerEvent, UserData, CustomData construction
 *   mimicking the facebook-nodejs-business-sdk pattern.
 *   Events are sent to a backend proxy server instead of directly to Graph API.
 *   Access token is stored server-side only.
 * 
 * PIXEL STATUS: Good — advanced matching, noscript, all events
 * 
 * STRENGTHS:
 * - EMQ: GOOD — sends em, ph, fn, ln, fbc, fbp, client_ua
 * - Impl Quality: GOOD — SDK-style class-based, proper structure
 * - Param Completeness: GOOD — most custom_data params present
 * - Data Freshness: GOOD — real-time
 * - Security: GOOD — access token stored server-side only
 * 
 * WEAKNESSES (intentional for demo):
 * - Dedup: NONE — NO event_id on pixel OR CAPI calls! Double-counting risk!
 * - Event Coverage: GOOD but Search event only fires pixel, not CAPI
 * - Privacy/DPO: FAIR — data_processing_options present but always empty array []
 * - Missing external_id, test_event_code
 */

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

const PIXEL_ID = '1684145446350033';

// CAPI Backend Proxy URL — access token is stored server-side only
const CAPI_PROXY_URL = 'https://demoshop-fpx9kus8.manus.space/api/capi/event';

// ============================================================
// Business SDK-style Classes (sent to server-side proxy)
// These mirror the facebook-nodejs-business-sdk API surface
// but serialize to JSON for the proxy endpoint.
// ============================================================

class UserData {
  private data: Record<string, unknown> = {};

  setEmail(email: string) { this.data.em = email; return this; }
  setPhone(phone: string) { this.data.ph = phone; return this; }
  setFirstName(fn: string) { this.data.fn = fn; return this; }
  setLastName(ln: string) { this.data.ln = ln; return this; }
  setCity(city: string) { this.data.ct = city; return this; }
  setState(state: string) { this.data.st = state; return this; }
  setZip(zip: string) { this.data.zp = zip; return this; }
  setFbc(fbc: string) { this.data.fbc = fbc; return this; }
  setFbp(fbp: string) { this.data.fbp = fbp; return this; }
  // GAP: Missing setExternalId() — should include for cross-device matching
  // GAP: Missing setCountry(), setDateOfBirth(), setGender()

  toJSON() { return this.data; }
}

class CustomData {
  private data: Record<string, unknown> = {};

  setValue(value: number) { this.data.value = value; return this; }
  setCurrency(currency: string) { this.data.currency = currency; return this; }
  setContentIds(ids: string[]) { this.data.content_ids = ids; return this; }
  setContentType(type: string) { this.data.content_type = type; return this; }
  setContentName(name: string) { this.data.content_name = name; return this; }
  setNumItems(num: number) { this.data.num_items = num; return this; }
  setStatus(status: string | boolean) { this.data.status = status; return this; }
  // GAP: Missing setOrderId() for purchase dedup
  // GAP: Missing setSearchString(), setContentCategory()

  toJSON() { return this.data; }
}

class ServerEvent {
  private data: Record<string, unknown> = {};

  setEventName(name: string) { this.data.event_name = name; return this; }
  setEventTime(time: number) { this.data.event_time = time; return this; }
  setEventSourceUrl(url: string) { this.data.event_source_url = url; return this; }
  setActionSource(source: string) { this.data.action_source = source; return this; }
  setUserData(userData: UserData) { this.data.user_data = userData.toJSON(); return this; }
  setCustomData(customData: CustomData) { this.data.custom_data = customData.toJSON(); return this; }
  setDataProcessingOptions(opts: string[]) { this.data.data_processing_options = opts; return this; }
  // CRITICAL GAP: No setEventId() method! Deduplication impossible!

  toJSON() { return this.data; }
}

/**
 * EventRequest — sends to server-side proxy instead of Graph API directly.
 * The server handles:
 * - SHA-256 hashing of PII (em, ph, fn, ln, ct, st, zp)
 * - IP address extraction from request headers
 * - User agent injection
 * - Secure access token storage
 * - Forwarding to Meta Graph API
 */
class EventRequest {
  private events: ServerEvent[] = [];

  setEvents(events: ServerEvent[]) { this.events = events; return this; }

  async execute(): Promise<unknown> {
    // Send each event to the server-side proxy
    // The proxy wraps it in the Graph API format with access_token
    for (const event of this.events) {
      const payload = event.toJSON();
      try {
        const response = await fetch(CAPI_PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        console.log(`[CAPI SDK Proxy] EventRequest response:`, result);
        return result;
      } catch (err) {
        console.error(`[CAPI SDK Proxy] EventRequest failed:`, err);
        throw err;
      }
    }
  }
}

// ============================================================
// HELPERS
// ============================================================

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

let storedUserData: Record<string, string> = {};

export function setUserData(data: { email?: string; phone?: string; firstName?: string; lastName?: string; city?: string; state?: string; zip?: string }) {
  if (data.email) storedUserData.em = data.email;
  if (data.phone) storedUserData.ph = data.phone;
  if (data.firstName) storedUserData.fn = data.firstName;
  if (data.lastName) storedUserData.ln = data.lastName;
  if (data.city) storedUserData.ct = data.city;
  if (data.state) storedUserData.st = data.state;
  if (data.zip) storedUserData.zp = data.zip;
}

// ============================================================
// PIXEL EVENTS — CRITICAL: No eventID option passed!
// ============================================================

function trackPixelEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    // CRITICAL GAP: No { eventID: ... } option — dedup impossible
    window.fbq('track', eventName, params || {});
    console.log(`[Meta Pixel] Tracked: ${eventName}`, params);
  }
}

// ============================================================
// CAPI — Business SDK Style via Server-Side Proxy (NO event_id!)
// Server handles hashing — frontend sends raw PII
// ============================================================

async function sendCAPIEvent(eventName: string, customData: CustomData) {
  const userData = new UserData();

  // fbc/fbp for identity matching
  const fbc = getCookie('_fbc');
  const fbp = getCookie('_fbp');
  if (fbc) userData.setFbc(fbc);
  if (fbp) userData.setFbp(fbp);

  // Send raw PII — server will hash these
  if (storedUserData.em) userData.setEmail(storedUserData.em);
  if (storedUserData.ph) userData.setPhone(storedUserData.ph);
  if (storedUserData.fn) userData.setFirstName(storedUserData.fn);
  if (storedUserData.ln) userData.setLastName(storedUserData.ln);
  if (storedUserData.ct) userData.setCity(storedUserData.ct);
  if (storedUserData.st) userData.setState(storedUserData.st);
  if (storedUserData.zp) userData.setZip(storedUserData.zp);

  const serverEvent = new ServerEvent()
    .setEventName(eventName)
    .setEventTime(Math.floor(Date.now() / 1000))
    // CRITICAL GAP: No .setEventId() — dedup impossible!
    .setEventSourceUrl(window.location.href)
    .setActionSource('website')
    .setUserData(userData)
    .setCustomData(customData)
    .setDataProcessingOptions([]); // WEAKNESS: Empty array — should be ['LDU'] for US users

  const request = new EventRequest()
    .setEvents([serverEvent]);

  await request.execute();
}

// ============================================================
// EVENT FUNCTIONS
// ============================================================

export function trackViewContent(productId: string, productName: string, value: number, currency: string) {
  trackPixelEvent('ViewContent', { content_ids: [productId], content_type: 'product', content_name: productName, value, currency });
  const cd = new CustomData().setContentIds([productId]).setContentType('product').setContentName(productName).setValue(value).setCurrency(currency);
  sendCAPIEvent('ViewContent', cd);
}

export function trackAddToCart(productId: string, productName: string, value: number, currency: string, quantity: number) {
  trackPixelEvent('AddToCart', { content_ids: [productId], content_type: 'product', content_name: productName, value, currency, num_items: quantity });
  const cd = new CustomData().setContentIds([productId]).setContentType('product').setContentName(productName).setValue(value).setCurrency(currency).setNumItems(quantity);
  sendCAPIEvent('AddToCart', cd);
}

export function trackInitiateCheckout(value: number, currency: string, numItems: number, contentIds?: string[]) {
  trackPixelEvent('InitiateCheckout', { value, currency, num_items: numItems, content_type: 'product', ...(contentIds ? { content_ids: contentIds } : {}) });
  const cd = new CustomData().setValue(value).setCurrency(currency).setNumItems(numItems).setContentType('product');
  if (contentIds) cd.setContentIds(contentIds);
  sendCAPIEvent('InitiateCheckout', cd);
}

export function trackPurchase(value: number, currency: string, contentIds?: string[], numItems?: number) {
  trackPixelEvent('Purchase', { value, currency, content_type: 'product', ...(contentIds ? { content_ids: contentIds } : {}), ...(numItems ? { num_items: numItems } : {}) });
  const cd = new CustomData().setValue(value).setCurrency(currency).setContentType('product');
  if (contentIds) cd.setContentIds(contentIds);
  if (numItems) cd.setNumItems(numItems);
  sendCAPIEvent('Purchase', cd);
}

export function trackLead(formType?: string) {
  trackPixelEvent('Lead', { content_name: formType || 'contact_form', value: 10.00, currency: 'USD' });
  const cd = new CustomData().setContentName(formType || 'contact_form').setValue(10.00).setCurrency('USD');
  sendCAPIEvent('Lead', cd);
}

export function trackCompleteRegistration(method?: string) {
  trackPixelEvent('CompleteRegistration', { content_name: method || 'email', value: 5.00, currency: 'USD', status: true });
  const cd = new CustomData().setContentName(method || 'email').setValue(5.00).setCurrency('USD').setStatus(true);
  sendCAPIEvent('CompleteRegistration', cd);
}

export function trackContact() {
  trackPixelEvent('Contact', { value: 15.00, currency: 'USD' });
  const cd = new CustomData().setValue(15.00).setCurrency('USD');
  sendCAPIEvent('Contact', cd);
}

// WEAKNESS: Search event NOT sent via CAPI — pixel only
export function trackSearch(query: string) {
  trackPixelEvent('Search', { search_string: query, content_category: 'products' });
  // GAP: No CAPI call for Search — only pixel fires
  console.log('[CAPI SDK Proxy] Search event not sent server-side');
}
