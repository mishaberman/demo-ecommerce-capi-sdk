# demo-ecommerce-capi-sdk

## Overview
This variant demonstrates a Meta Pixel and Conversions API (CAPI) implementation using a server-side proxy that leverages the Meta Business SDK. This is part of a collection of demo e-commerce sites that showcase different levels of Meta Pixel and CAPI implementation quality. Each variant is deployed on GitHub Pages.

**Live Site:** https://mishaberman.github.io/demo-ecommerce-capi-sdk/
**Quality Grade:** B

## Meta Pixel Setup

### Base Pixel Code
- **Pixel ID:** `1684145446350033`
- **Location:** The base pixel code is loaded in the `<head>` tag of `index.html`.
- **Noscript Fallback:** The `<noscript>` fallback is included to ensure tracking for users with JavaScript disabled.

### Advanced Matching
- **User Data:** Rich user data is collected and passed for Advanced Matching, including email (`em`), phone (`ph`), first name (`fn`), last name (`ln`), city (`ct`), state (`st`), and zip code (`zp`).
- **Implementation:** User data is managed and sent via the server-side Business SDK classes, not through client-side `fbq('init', ...)` or `setUserData()`.
- **Issues:** This variant does not send the `external_id`.

## Conversions API (CAPI) Setup

### Method
This variant uses a **Server-Side Proxy** with the official Meta Business SDK. Client-side events trigger calls to a backend endpoint, which then uses the SDK's structured classes (`UserData`, `CustomData`, `ServerEvent`, `EventRequest`) to send data to the Conversions API.

### Implementation Details
- **Event Transmission:** Events are sent from the browser to a backend API endpoint (`/api/capi/event`). The backend then uses the Business SDK to construct and send the event payload to Meta's servers.
- **Access Token:** The CAPI access token is securely stored and used on the server-side, never exposed to the client.
- **User Data Sent:** The CAPI payload includes `em`, `ph`, `fn`, `ln`, `ct`, `st`, `zp`, `fbp`, and `fbc`.
- **PII Hashing:** All personally identifiable information (PII) is automatically hashed by the Business SDK on the server-side before being sent to Meta, ensuring privacy and security.
- **Data Processing Options:** `data_processing_options` are sent as an empty array, indicating no specific data processing restrictions are being applied.

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
- **Deduplication Status:** Because no `event_id` is sent with either Pixel or CAPI events, **deduplication is not possible**. This will lead to inflated event counts in Events Manager, as each event is counted twice (once from the browser, once from the server).

## Custom Data
- **`custom_data`:** Standard parameters like `value`, `currency`, `content_ids`, and `content_type` are sent.
- **Custom Events:** No custom events are tracked in this variant.

## Known Issues
- **No Event Deduplication:** The most significant issue is the complete lack of `event_id`, which prevents event deduplication and results in double counting.
- **Pixel-Only Search Event:** The `Search` event is only fired from the Pixel, not from CAPI. This creates a gap in server-side event tracking.
- **Missing `external_id`:** The `external_id` is not included in the user data, which can reduce the Event Match Quality score.

## Security Considerations
- **Access Token:** The CAPI access token is secure, as it is only used on the server-side.
- **PII Hashing:** PII is properly hashed on the server-side by the Business SDK before transmission, which is a security best practice.
- **Privacy Compliance:** While `data_processing_options` are sent, they are empty. A real-world implementation would need to populate these based on user location and consent (e.g., for CCPA/GDPR).

---
*This variant is part of the [Meta Pixel Quality Variants](https://github.com/mishaberman) collection for testing and educational purposes.*
