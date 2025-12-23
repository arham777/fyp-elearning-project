# Stripe Payments Integration (Payment Intents + Elements)

This project integrates **Stripe Payments** to sell **credit packs** (25 / 50 / 150 credits). The implementation uses:

- **Stripe Payment Intents** (server creates intent)
- **Stripe Elements / PaymentElement** (frontend collects payment details)
- **Next.js Route Handlers** (backend endpoints under `app/api/stripe/*`)
- A **post-payment fulfillment** step that credits the user in MongoDB (`addCredits`) once the PaymentIntent is confirmed as `succeeded`.

This document is written so you can copy the same approach into another Next.js project.

---

## 1) High-level flow

### 1.1 User journey

1. User selects a pack on **Pricing** (or Dashboard).
2. User is navigated to `/checkout?pack=<packId>`.
3. Frontend calls `POST /api/stripe/create-payment-intent`.
4. Backend creates a Stripe **PaymentIntent** and returns `clientSecret`.
5. Frontend renders Stripe **PaymentElement** using the `clientSecret`.
6. User submits payment.
7. Stripe redirects to `return_url` (`/checkout/result?...`) after confirmation.
8. Result page retrieves the PaymentIntent status from Stripe using the `payment_intent_client_secret`.
9. If status is `succeeded`, frontend calls `POST /api/stripe/fulfill-payment-intent`.
10. Backend verifies the PaymentIntent on Stripe, checks metadata/amount, and then **adds credits** + logs a CreditTransaction.

### 1.2 What runs where

- **Frontend (browser)**
  - Loads Stripe.js with `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Shows `PaymentElement`
  - Calls backend endpoints to create/fulfill

- **Backend (Next.js Route Handlers)**
  - Uses secret key `STRIPE_SECRET_KEY` via `stripe` Node SDK
  - Creates PaymentIntent
  - Verifies PaymentIntent success and credits user

---

## 2) Key files in this repo

### 2.1 Stripe client initialization

- `lib/stripe.ts`
  - Creates a Stripe SDK client:
    - Reads `process.env.STRIPE_SECRET_KEY`
    - Exports `stripe`

### 2.2 Pack/pricing configuration (source of truth)

- `lib/config/stripePacks.ts`
  - Defines allowed packs (`25 | 50 | 150`) and pricing in cents
  - Exports:
    - `STRIPE_CREDIT_PACKS`
    - `parsePackId()` (validates/normalizes pack)

This file is important because **backend validates** that the paid amount matches the selected pack.

### 2.3 Backend endpoints

- `app/api/stripe/create-payment-intent/route.ts`
  - Requires auth (`requireAuth`)
  - Reads pack from request body
  - Creates a PaymentIntent with:
    - `amount`, `currency`
    - `automatic_payment_methods: { enabled: true }`
    - `receipt_email: user.email`
    - `metadata` including:
      - `pack`, `credits`, `userId`
  - Returns `{ clientSecret, pack, amount, currency }`

- `app/api/stripe/fulfill-payment-intent/route.ts`
  - Requires auth (`requireAuth`)
  - Idempotency (app-level): checks `CreditTransaction` for an existing completed CREDIT entry containing `metadata.stripePaymentIntentId`
  - Retrieves PaymentIntent from Stripe and verifies:
    - `status === 'succeeded'`
    - `paymentIntent.metadata.userId` matches current user (if present)
    - `amount` & `currency` match the pack config
  - Calls `addCredits(userId, credits, reason)`
  - Stores Stripe metadata back into the created transaction:
    - `stripePaymentIntentId`, `stripePaymentIntentStatus`, `pack`, `amount`, `currency`

### 2.4 Auth / user lookup

- `lib/utils/authHelper.ts`
  - `requireAuth(request)` reads JWT token cookie `token`, verifies it using `JWT_SECRET`, and loads the user from MongoDB.

### 2.5 Credit ledger

- `lib/utils/creditHelper.ts`
  - `addCredits()` uses a MongoDB session/transaction to:
    - update user balance
    - insert `CreditTransaction`

- `models/CreditTransaction.ts`
  - Mongoose schema used for idempotency and audit log.

### 2.6 Frontend checkout pages

- `app/pricing/page.tsx`
  - Navigates to `/checkout?pack=<packId>`

- `app/checkout/page.tsx`
  - Loads Stripe.js via `loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)`
  - Calls backend to create the PaymentIntent and receives `clientSecret`
  - Wraps `CheckoutForm` with `<Elements options={{ clientSecret, ... }}>`

- `app/checkout/CheckoutForm.tsx`
  - Renders `<PaymentElement />`
  - On submit calls `stripe.confirmPayment({ elements, confirmParams: { return_url } })`

- `app/checkout/result/page.tsx`
  - Reads `payment_intent_client_secret` from query params
  - Calls `stripe.retrievePaymentIntent(clientSecret)` to get PaymentIntent + status
  - If `succeeded`, calls `/api/stripe/fulfill-payment-intent` exactly once

---

## 3) Environment variables

Create `.env.local` (or configure on your hosting provider).

### 3.1 Required for Stripe

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Frontend key (safe to expose)
  - Used by `loadStripe()` on checkout + result pages

- `STRIPE_SECRET_KEY`
  - Server secret key (must never be exposed to client)
  - Used in `lib/stripe.ts`

### 3.2 Required for auth + DB (because Stripe endpoints are authenticated)

Stripe endpoints call `requireAuth()` and credit DB writes, so these must also be set correctly:

- `JWT_SECRET`
  - Used to verify the cookie token

- MongoDB connection env vars
  - These live in your DB connection layer (`lib/db.ts`). Ensure the variables used there are configured.

---

## 4) Stripe Dashboard setup (test mode)

1. Create a Stripe account.
2. In **Developers → API keys**:
   - Copy **Publishable key** → set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy **Secret key** → set `STRIPE_SECRET_KEY`
3. Ensure you are in **Test mode** when testing.

Because this implementation uses **PaymentIntents with automatic payment methods**, you do not need to create Products/Prices in Stripe for this flow.

---

## 5) Backend API contracts

### 5.1 `POST /api/stripe/create-payment-intent`

- **Auth**: required (cookie `token`)
- **Body**:
  - `{ pack: 25 | 50 | 150 }` (string or number accepted)
- **Returns (success)**:
  - `{ success: true, clientSecret: string, pack: number, amount: number, currency: string }`

This is called by `app/checkout/page.tsx`.

### 5.2 `POST /api/stripe/fulfill-payment-intent`

- **Auth**: required (cookie `token`)
- **Body**:
  - `{ paymentIntentId: string, pack?: 25 | 50 | 150 }`
- **Returns (success)**:
  - `{ success: true, creditsAdded: number, balanceAfter: number }`
  - or `{ success: true, alreadyFulfilled: true }`

This is called by `app/checkout/result/page.tsx` after Stripe confirms success.

---

## 6) Security and correctness notes

### 6.1 Why fulfillment verifies the PaymentIntent on the server

Even though the frontend can see a `succeeded` status, fulfillment **must** verify on the server because:

- Clients can be manipulated
- Credits are valuable (must be tied to a real paid intent)

So the server retrieves the PaymentIntent from Stripe using the secret key and verifies:

- `status === 'succeeded'`
- `amount` and `currency` match your configured pack
- `metadata.userId` matches the logged-in user (if present)

### 6.2 Idempotency (prevent duplicate credits)

`fulfill-payment-intent` checks MongoDB for an existing completed credit transaction having `metadata.stripePaymentIntentId`.
If found, it returns success without adding credits again.

### 6.3 Authentication / access control

Both Stripe routes call `requireAuth()` so only logged-in users can:

- create intents
- fulfill intents

This ties purchases to an authenticated account.

---

## 7) Porting this Stripe integration to another project

### 7.1 Copy these dependencies

From `package.json`:

- `stripe` (server)
- `@stripe/stripe-js` (client)
- `@stripe/react-stripe-js` (react bindings)

### 7.2 Copy these files (or re-implement equivalents)

- `lib/stripe.ts`
- `lib/config/stripePacks.ts`
- `app/api/stripe/create-payment-intent/route.ts`
- `app/api/stripe/fulfill-payment-intent/route.ts`
- `app/checkout/page.tsx`
- `app/checkout/CheckoutForm.tsx`
- `app/checkout/result/page.tsx`

And whatever you use for:

- authentication (`requireAuth`) + user identification
- crediting logic / order fulfillment (`addCredits`) + idempotency storage

### 7.3 Minimal checklist

- [ ] Add env vars: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`
- [ ] Ensure auth works for `/api/stripe/*`
- [ ] Ensure your DB connection works in route handlers
- [ ] Configure your product/pack mapping (amounts in cents)
- [ ] Implement fulfillment logic (e.g., credits / subscription / order creation)
- [ ] Test in Stripe **test mode** with test cards

---

## 8) Optional improvements (recommended if you productionize)

- **Stripe Webhook**
  - Current flow fulfills from the client-side result page.
  - For maximum reliability, add a webhook for `payment_intent.succeeded` and run fulfillment server-side even if the user closes the browser.

- **Use Stripe idempotency keys** on PaymentIntent creation
  - Helps prevent duplicate intents if client retries.

- **Stronger linkage**
  - Save a “pending purchase” record before creating the intent, store its id in `metadata`, and validate against it.

---

## Status

This document describes the Stripe integration currently implemented in this repository (frontend + backend) and can be reused as a template for integrating Stripe into other projects.
