# demo-ecommerce-capi-sdk

## Overview
This variant demonstrates a Meta Pixel and Conversions API (CAPI) implementation using a server-side proxy that leverages **Business SDK-style classes** (`EventRequest`, `ServerEvent`, `UserData`, `CustomData`). Instead of raw `fetch` calls to the Graph API, this implementation uses structured class patterns inspired by the official `facebook-nodejs-business-sdk`. This is part of a collection of demo e-commerce sites that showcase different levels of Meta Pixel and CAPI implementation quality.

**Live Site:** https://mishaberman.github.io/demo-ecommerce-capi-sdk/
**Quality Grade:** B

## Architecture

```
┌──────────────┐     fbq() events      ┌──────────────────┐
│   Browser    │ ──────────────────────>│   Meta Pixel     │
│  (React SPA) │                        │   (Client-Side)  │
│              │     POST /api/capi/*   └──────────────────┘
│              │ ──────────────────────>┌──────────────────┐
└──────────────┘                        │  CAPI Proxy      │
                                        │  (Express.js)    │
                                        │  SDK-Style Classes│
                                        │  - UserData      │
                                        │  - CustomData    │
                                        │  - ServerEvent   │
                                        │  - EventRequest  │
                                        └───────┬──────────┘
                                                │ POST graph.facebook.com
                                                ▼
                                        ┌──────────────────┐
                                        │  Meta Conversions│
                                        │  API (Server)    │
                                        └──────────────────┘
```

### Frontend (`src/`)
- Vite + React + TypeScript SPA deployed to GitHub Pages
- Fires `fbq()` pixel events (no `eventID` — deduplication gap)
- Sends matching events to the CAPI proxy server
- Collects rich user data (em, ph, fn, ln, ct, st, zp)

### Backend (`server/`)
- Express.js CAPI proxy server using Business SDK-style class patterns
- **Classes:** `UserData`, `CustomData`, `ServerEvent`, `EventRequest` mirror the official Meta Business SDK
- Endpoints: `POST /api/capi/event`, `GET /api/capi/health`
- SHA-256 hashes PII fields via `UserData._hash()` method
- Enriches payloads with `client_ip_address` and `client_user_agent`
- **No event_id / deduplication** — events are not deduplicated
- **No data_processing_options** — LDU/CCPA compliance missing
- **No phone normalization** — phone numbers hashed without stripping non-digits
- Access token stored in environment variables

## Meta Pixel Setup

### Base Pixel Code
- **Pixel ID:** `1684145446350033`
- **Location:** The base pixel code is loaded in the `<head>` tag of `index.html`.
- **Noscript Fallback:** Included for users with JavaScript disabled.

### Advanced Matching
- **User Data:** Rich user data is collected and passed for Advanced Matching, including email (`em`), phone (`ph`), first name (`fn`), last name (`ln`), city (`ct`), state (`st`), and zip code (`zp`).
- **Implementation:** User data is managed and sent via the server-side Business SDK classes, not through client-side `fbq('init', ...)` or `setUserData()`.
- **Missing:** `external_id` is not included in the user data.

## Conversions API (CAPI) Setup

### Method
**Server-Side Proxy with Business SDK-Style Classes** — Events are sent from the browser to an Express.js backend, which uses structured classes (`UserData`, `CustomData`, `ServerEvent`, `EventRequest`) to construct and send the event payload to Meta's Conversions API.

### Server Code Location
- **Main proxy:** `server/capi-proxy.js` — Express server with SDK-style class implementations
- **Package:** `server/package.json` — Dependencies and scripts

### SDK-Style Class Hierarchy
```
EventRequest (pixelId, accessToken)
  └── addEvent(ServerEvent)
        ├── event_name, event_time, action_source, event_source_url
        ├── UserData (em, ph, fn, ln, fbp, fbc, client_ip_address, client_user_agent)
        │     └── toPayload() → hashes PII with SHA-256
        └── CustomData (value, currency, content_name, content_ids, content_type, num_items)
              └── toPayload() → passes through as-is
```

### Implementation Details
- **Event Transmission:** Browser → `POST /api/capi/event` → Express proxy → `EventRequest.execute()` → `POST graph.facebook.com/v21.0/{pixel_id}/events`
- **Access Token:** Stored in `META_ACCESS_TOKEN` environment variable, passed to `EventRequest` constructor
- **PII Hashing:** `UserData._hash()` applies SHA-256 to PII fields (em, ph, fn, ln, external_id)
- **Phone Normalization:** **NOT IMPLEMENTED** — Phone numbers are hashed with non-digit characters still present
- **IP Enrichment:** `client_ip_address` extracted from `X-Forwarded-For` header
- **User Agent:** `client_user_agent` extracted from `User-Agent` header
- **Data Processing Options:** **NOT IMPLEMENTED** — No LDU/CCPA/GDPR compliance
- **Batch Support:** **NOT AVAILABLE** — Only single event endpoint exists

### Intentional Gaps
1. **No Event Deduplication:** `event_id` is not generated or sent with any events
2. **No Data Processing Options:** `data_processing_options` field is completely absent
3. **No Phone Normalization:** Phone numbers are hashed without stripping non-digit characters first
4. **No Batch Endpoint:** Only single-event submission is supported
5. **Missing `external_id`:** Not included in user data

## Events Tracked

| Event Name           | Pixel | CAPI | Parameters Sent                                              | event_id |
|----------------------|-------|------|--------------------------------------------------------------|----------|
| ViewContent          | Yes   | Yes  | `content_ids`, `content_type`, `content_name`, `value`, `currency` | No       |
| AddToCart            | Yes   | Yes  | `content_ids`, `content_type`, `content_name`, `value`, `currency` | No       |
| InitiateCheckout     | Yes   | Yes  | `content_ids`, `content_type`, `content_name`, `value`, `currency` | No       |
| Purchase             | Yes   | Yes  | `content_ids`, `content_type`, `content_name`, `value`, `currency` | No       |
| Lead                 | Yes   | Yes  | `content_name`, `value`, `currency`                            | No       |
| CompleteRegistration | Yes   | Yes  | `content_name`, `value`, `currency`                            | No       |
| Contact              | Yes   | Yes  | `content_name`, `value`, `currency`                            | No       |
| Search               | Yes   | No   | `search_string`                                              | No       |

## Event Deduplication
- **`event_id`:** This variant **does not** generate or send an `event_id` for any events.
- **Deduplication Status:** Because no `event_id` is sent with either Pixel or CAPI events, **deduplication is not possible**. This will lead to inflated event counts in Events Manager.

## User Data Parameters (EMQ)

| Parameter            | Collected | Hashed | Notes                           |
|----------------------|-----------|--------|---------------------------------|
| `em` (email)         | Yes       | SHA-256| Via `UserData._hash()`          |
| `ph` (phone)         | Yes       | SHA-256| Not normalized before hashing   |
| `fn` (first name)    | Yes       | SHA-256| Via `UserData._hash()`          |
| `ln` (last name)     | Yes       | SHA-256| Via `UserData._hash()`          |
| `external_id`        | No        | —      | Not collected                   |
| `fbp`                | Yes       | No     | Passed through (not PII)        |
| `fbc`                | Yes       | No     | Passed through (not PII)        |
| `client_ip_address`  | Yes       | No     | Server-side (X-Forwarded-For)   |
| `client_user_agent`  | Yes       | No     | Server-side (User-Agent header) |

## Deployment

### Frontend (GitHub Pages)
The frontend is automatically deployed to GitHub Pages via the `gh-pages` branch.

### Backend (Self-Hosted)
```bash
cd server
npm install
META_PIXEL_ID=your_pixel_id META_ACCESS_TOKEN=your_token node capi-proxy.js
```

## Security Considerations
- **Access Token:** Stored in environment variables, not in client-side code
- **PII Hashing:** Implemented via `UserData._hash()` method using SHA-256
- **CORS:** Configured to allow cross-origin requests
- **No Hardcoded Secrets:** No tokens committed to the repository

## Known Issues
1. **No Event Deduplication** — Complete lack of `event_id` causes double counting
2. **No LDU/CCPA Compliance** — Missing `data_processing_options`
3. **Phone Normalization Missing** — Phone hashed with formatting characters
4. **Pixel-Only Search** — Search event not sent via CAPI
5. **Missing `external_id`** — Reduces Event Match Quality score

---
*This variant is part of the [Meta Pixel Quality Variants](https://github.com/mishaberman) collection for testing and educational purposes.*
