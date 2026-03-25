# CAPI SDK Demo Variant <img src="https://img.shields.io/badge/Grade-B--_55-orange" alt="Grade B-" />

This variant demonstrates a server-side integration of the Meta Conversions API using a Vercel serverless function that mimics the architecture of the official Meta Business SDK. It utilizes an object-oriented approach with classes like `ServerEvent`, `UserData`, and `CustomData` to construct and send event payloads. While this variant showcases a structured and scalable architecture, it has some implementation gaps, particularly in data normalization and deduplication, resulting in a **B-** grade.

### Quick Facts

| Category | Details |
| --- | --- |
| **Pixel ID** | `1684145446350033` |
| **CAPI Method** | Server-side proxy (Vercel) with SDK-style classes |
| **Grade** | B- (55/100) |
| **Live Site** | [https://mishaberman.github.io/demo-ecommerce-capi-sdk/](https://mishaberman.github.io/demo-ecommerce-capi-sdk/) |
| **GitHub Repo** | [https://github.com/mishaberman/demo-ecommerce-capi-sdk](https://github.com/mishaberman/demo-ecommerce-capi-sdk) |

### What's Implemented

- [x] **Meta Business SDK-Style Architecture**: Uses classes like `ServerEvent`, `UserData`, and `CustomData`.
- [x] **Server-Side Hashing**: User data is hashed on the server via the `UserData._hash()` method.
- [x] **Advanced Matching**: Sends `fn` and `ln` from the client-side for AAM.
- [x] **`fbp` and `fbc` Cookies**: Includes Facebook click and browser identifiers.
- [x] **Data Processing Options (DPO)**: Supports `data_processing_options` for compliance.
- [x] **Basic Deduplication**: Implements `event_id` in the `ServerEvent` class.

### What's Missing or Broken

- [ ] **Incomplete Deduplication**: The `event_id` is not consistently passed for all events, leading to potential duplication.
- [ ] **No Phone Number Normalization**: The `UserData._hash()` method does not normalize phone numbers before hashing.
- [ ] **Exposed Access Token Comment**: A comment in the frontend code mentions the access token, posing a security risk.
- [ ] **Simplified SDK Classes**: The implemented classes are simplified versions of the official Meta Business SDK and lack some features.

### Event Coverage

| Event | Pixel | CAPI | Both |
| --- | :---: | :---: | :---: |
| `ViewContent` | | &#10003; | |
| `AddToCart` | | &#10003; | |
| `InitiateCheckout` | | &#10003; | |
| `Purchase` | | &#10003; | |
| `Lead` | | &#10003; | |
| `Search` | | &#10003; | |
| `CompleteRegistration` | | &#10003; | |

### Parameter Completeness

| Event | `content_type` | `content_ids` | `value` | `currency` | `content_name` | `num_items` |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ViewContent` | &#10003; | &#10003; | &#10003; | &#10003; | &#10003; | |
| `AddToCart` | &#10003; | &#10003; | &#10003; | &#10003; | &#10003; | &#10003; |
| `InitiateCheckout` | &#10003; | &#10003; | &#10003; | &#10003; | &#10003; | &#10003; |
| `Purchase` | &#10003; | &#10003; | &#10003; | &#10003; | &#10003; | &#10003; |
| `Lead` | | | &#10003; | &#10003; | &#10003; | |
| `Search` | | | | | &#10003; | |
| `CompleteRegistration` | | | &#10003; | &#10003; | | |

### Architecture

The tracking architecture relies on a server-side proxy implemented as a Vercel serverless function. The frontend code captures user interactions and sends the data to the `/api/capi/event` endpoint. This endpoint uses a set of classes (`ServerEvent`, `UserData`, `CustomData`, `Content`) that mirror the structure of the Meta Business SDK to build the CAPI payload. The `UserData` class is responsible for hashing user parameters before the data is sent to Meta's servers. The server-side code can be found in the `/api/capi` directory.

### How to Use This Variant

1.  **Explore the Live Site**: Visit the [live site](https://mishaberman.github.io/demo-ecommerce-capi-sdk/) to interact with the demo e-commerce store.
2.  **Trigger Events**: Perform actions like viewing a product, adding to cart, and making a purchase to trigger the corresponding CAPI events.
3.  **Inspect Server Code**: Review the code in the `/api/capi` directory, particularly `event.js`, `batch.js`, and `health.js`, to understand the SDK-style implementation.
4.  **Audit the Gaps**: Use this variant to practice identifying the missing phone number normalization and incomplete deduplication logic.
