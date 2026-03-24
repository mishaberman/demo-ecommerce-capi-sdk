/**
 * Meta Pixel & Conversions API — Meta Business SDK Style Implementation
 * 
 * CAPI METHOD: Simulated Meta Business SDK (facebook-nodejs-business-sdk pattern)
 *   Uses class-based ServerEvent, UserData, CustomData construction
 *   Mimics the SDK's EventRequest pattern but runs client-side
 * 
 * PIXEL STATUS: Good — advanced matching, noscript, all events
 * 
 * CAPI STATUS: Functional but improvable
 * CAPI GAPS:
 * 1. Running client-side instead of actual server-side SDK
 * 2. Not using actual facebook-nodejs-business-sdk package
 * 3. No async request feature (SDK supports EventRequestAsync)
 * 4. No concurrent batching (SDK supports batch_size + concurrent workers)
 * 5. No custom HTTP service interface override
 * 6. Missing external_id for cross-device matching
 * 7. fbc/fbp cookies read but not validated for format
 * 8. API version hardcoded to v18.0 — should use SDK's default latest
 * 9. No test_event_code support for debugging
 * 10. Hashing done manually — real SDK handles normalization + hashing automatically
 */

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

const PIXEL_ID = '1684145446350033';
const ACCESS_TOKEN = 'EAAEDq1LHx1gBRPAEq5cUOKS5JrrvMif65SN8ysCUrX5t0SUZB3ETInM6Pt71VHea0bowwEehinD0oZAeSmIPWivziiVu0FuEIcsmgvT3fiqZADKQDiFgKdsugONbJXELgvLuQxHT0krELKt3DPhm0EyUa44iXu8uaZBZBddgVmEnFdNMBmsWmYJdOT17DTitYKwZDZD';

// ============================================================
// Business SDK-style Classes (simulated client-side)
// In real implementation, these come from facebook-nodejs-business-sdk
// ============================================================

class UserData {
  private data: Record<string, unknown> = {};

  setEmail(email: string) { this.data.em = [email]; return this; }
  setPhone(phone: string) { this.data.ph = [phone]; return this; }
  setFirstName(fn: string) { this.data.fn = [fn]; return this; }
  setLastName(ln: string) { this.data.ln = [ln]; return this; }
  setCity(city: string) { this.data.ct = [city]; return this; }
  setState(state: string) { this.data.st = [state]; return this; }
  setZip(zip: string) { this.data.zp = [zip]; return this; }
  setClientIpAddress(ip: string) { this.data.client_ip_address = ip; return this; }
  setClientUserAgent(ua: string) { this.data.client_user_agent = ua; return this; }
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
  setSearchString(query: string) { this.data.search_string = query; return this; }
  setContentCategory(cat: string) { this.data.content_category = cat; return this; }
  setStatus(status: string | boolean) { this.data.status = status; return this; }
  // GAP: Missing setOrderId() for purchase dedup

  toJSON() { return this.data; }
}

class ServerEvent {
  private data: Record<string, unknown> = {};

  setEventName(name: string) { this.data.event_name = name; return this; }
  setEventTime(time: number) { this.data.event_time = time; return this; }
  setEventId(id: string) { this.data.event_id = id; return this; }
  setEventSourceUrl(url: string) { this.data.event_source_url = url; return this; }
  setActionSource(source: string) { this.data.action_source = source; return this; }
  setUserData(userData: UserData) { this.data.user_data = userData.toJSON(); return this; }
  setCustomData(customData: CustomData) { this.data.custom_data = customData.toJSON(); return this; }
  // GAP: Missing setDataProcessingOptions()
  // GAP: Missing setOptOut()

  toJSON() { return this.data; }
}

class EventRequest {
  private pixelId: string;
  private events: ServerEvent[] = [];
  private accessToken: string;
  // GAP: No test_event_code support
  // GAP: No namespace_id support
  // GAP: No upload_tag support

  constructor(accessToken: string, pixelId: string) {
    this.accessToken = accessToken;
    this.pixelId = pixelId;
  }

  setEvents(events: ServerEvent[]) { this.events = events; return this; }

  // GAP: Should use EventRequestAsync for non-blocking
  // GAP: No concurrent batching support
  async execute(): Promise<unknown> {
    const payload = {
      data: this.events.map(e => e.toJSON()),
      access_token: this.accessToken,
      // GAP: Missing test_event_code field
    };

    const endpoint = `https://graph.facebook.com/v18.0/${this.pixelId}/events`;
    // GAP: API version hardcoded — real SDK uses latest automatically

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log(`[CAPI SDK] EventRequest response:`, result);
      return result;
    } catch (err) {
      console.error(`[CAPI SDK] EventRequest failed:`, err);
      // GAP: No retry logic — real SDK has retry built in
      throw err;
    }
  }
}

// ============================================================
// HELPERS
// ============================================================

function generateEventId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

async function hashValue(value: string): Promise<string> {
  // GAP: Manual hashing — real SDK normalizes + hashes automatically
  const normalized = value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
  // GAP: Cookie value not validated for correct format (fb.X.XXXX.XXXX)
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
// PIXEL EVENTS
// ============================================================

export function trackPixelEvent(eventName: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window !== 'undefined' && window.fbq) {
    const eventParams = { ...params };
    if (eventId) eventParams.eventID = eventId;
    window.fbq('track', eventName, eventParams);
    console.log(`[Meta Pixel] Tracked: ${eventName}`, eventParams);
  }
}

export function trackCustomEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, params);
  }
}

// ============================================================
// CAPI — Business SDK Style
// ============================================================

async function sendCAPIEvent(eventName: string, customData: CustomData, eventId: string) {
  const userData = new UserData()
    .setClientUserAgent(navigator.userAgent);

  // Read cookies
  const fbc = getCookie('_fbc');
  const fbp = getCookie('_fbp');
  if (fbc) userData.setFbc(fbc);
  if (fbp) userData.setFbp(fbp);
  // GAP: Missing client_ip_address — can't get accurately client-side
  // GAP: Missing external_id

  // Hash and set stored PII
  if (storedUserData.em) userData.setEmail(await hashValue(storedUserData.em));
  if (storedUserData.ph) userData.setPhone(await hashValue(storedUserData.ph));
  if (storedUserData.fn) userData.setFirstName(await hashValue(storedUserData.fn));
  if (storedUserData.ln) userData.setLastName(await hashValue(storedUserData.ln));
  if (storedUserData.ct) userData.setCity(await hashValue(storedUserData.ct));
  if (storedUserData.st) userData.setState(await hashValue(storedUserData.st));
  if (storedUserData.zp) userData.setZip(await hashValue(storedUserData.zp));

  const serverEvent = new ServerEvent()
    .setEventName(eventName)
    .setEventTime(Math.floor(Date.now() / 1000))
    .setEventId(eventId)
    .setEventSourceUrl(window.location.href)
    .setActionSource('website')
    .setUserData(userData)
    .setCustomData(customData);
  // GAP: No setDataProcessingOptions()

  const request = new EventRequest(ACCESS_TOKEN, PIXEL_ID)
    .setEvents([serverEvent]);
  // GAP: Should use EventRequestAsync for non-blocking
  // GAP: No concurrent batching

  await request.execute();
}

// ============================================================
// EVENT FUNCTIONS
// ============================================================

export function trackViewContent(productId: string, productName: string, value: number, currency: string) {
  const eventId = generateEventId();
  trackPixelEvent('ViewContent', { content_ids: [productId], content_type: 'product', content_name: productName, value, currency }, eventId);
  const cd = new CustomData().setContentIds([productId]).setContentType('product').setContentName(productName).setValue(value).setCurrency(currency);
  sendCAPIEvent('ViewContent', cd, eventId);
}

export function trackAddToCart(productId: string, productName: string, value: number, currency: string, quantity: number) {
  const eventId = generateEventId();
  trackPixelEvent('AddToCart', { content_ids: [productId], content_type: 'product', content_name: productName, value, currency, num_items: quantity }, eventId);
  const cd = new CustomData().setContentIds([productId]).setContentType('product').setContentName(productName).setValue(value).setCurrency(currency).setNumItems(quantity);
  sendCAPIEvent('AddToCart', cd, eventId);
}

export function trackInitiateCheckout(value: number, currency: string, numItems: number, contentIds?: string[]) {
  const eventId = generateEventId();
  trackPixelEvent('InitiateCheckout', { value, currency, num_items: numItems, content_type: 'product', ...(contentIds ? { content_ids: contentIds } : {}) }, eventId);
  const cd = new CustomData().setValue(value).setCurrency(currency).setNumItems(numItems).setContentType('product');
  if (contentIds) cd.setContentIds(contentIds);
  sendCAPIEvent('InitiateCheckout', cd, eventId);
}

export function trackPurchase(value: number, currency: string, contentIds?: string[], numItems?: number) {
  const eventId = generateEventId();
  trackPixelEvent('Purchase', { value, currency, content_type: 'product', ...(contentIds ? { content_ids: contentIds } : {}), ...(numItems ? { num_items: numItems } : {}) }, eventId);
  const cd = new CustomData().setValue(value).setCurrency(currency).setContentType('product');
  if (contentIds) cd.setContentIds(contentIds);
  if (numItems) cd.setNumItems(numItems);
  sendCAPIEvent('Purchase', cd, eventId);
}

export function trackLead(formType?: string) {
  const eventId = generateEventId();
  trackPixelEvent('Lead', { content_name: formType || 'contact_form', value: 10.00, currency: 'USD' }, eventId);
  const cd = new CustomData().setContentName(formType || 'contact_form').setValue(10.00).setCurrency('USD');
  sendCAPIEvent('Lead', cd, eventId);
}

export function trackCompleteRegistration(method?: string) {
  const eventId = generateEventId();
  trackPixelEvent('CompleteRegistration', { content_name: method || 'email', value: 5.00, currency: 'USD', status: true }, eventId);
  const cd = new CustomData().setContentName(method || 'email').setValue(5.00).setCurrency('USD').setStatus(true);
  sendCAPIEvent('CompleteRegistration', cd, eventId);
}

export function trackContact() {
  const eventId = generateEventId();
  trackPixelEvent('Contact', { value: 15.00, currency: 'USD' }, eventId);
  const cd = new CustomData().setValue(15.00).setCurrency('USD');
  sendCAPIEvent('Contact', cd, eventId);
}

export function trackSearch(query: string) {
  const eventId = generateEventId();
  trackPixelEvent('Search', { search_string: query, content_category: 'products' }, eventId);
  const cd = new CustomData().setSearchString(query).setContentCategory('products');
  sendCAPIEvent('Search', cd, eventId);
}
