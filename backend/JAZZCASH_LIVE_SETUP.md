# JazzCash Live / Production Setup Guide

This document explains how to move your JazzCash integration from **sandbox (fake)** to **live (real money)** for your e‑learning platform.

> **Important:** Do **not** change these settings on your local machine for now. Use this guide when you deploy to a real server (production).

---

## 1. Get Live JazzCash Credentials

From the JazzCash Merchant Portal (Live, not Sandbox):

- **Merchant ID** (e.g. `MCXXXXXX`)
- **Password** (live)
- **Integrity Salt** (live)
- **Live POST URL** for hosted checkout
  - This is the URL where you POST the checkout form.
  - In sandbox you use:
    - `https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/`
  - In live it is usually under `https://payments.jazzcash.com.pk/.../merchantform/`.
  - **Always copy the exact URL from the JazzCash live portal or docs.**

Keep these values secret and never commit them to Git.

---

## 2. Production `.env` Configuration

On your **production backend server** (where Django runs), create a `.env` file with **live** values.

Example (adjust to your real domain and credentials):

```env
# General
DEBUG=False
FRONTEND_BASE_URL=https://your-frontend-domain.com

# JazzCash live credentials
JAZZCASH_MERCHANT_ID=YOUR_LIVE_MERCHANT_ID
JAZZCASH_PASSWORD=YOUR_LIVE_PASSWORD
JAZZCASH_INTEGRITY_SALT=YOUR_LIVE_INTEGRITY_SALT

# Callback URL (must be public HTTPS)
JAZZCASH_RETURN_URL=https://your-backend-domain.com/api/payments/jazzcash/return/

# Live hosted checkout URL (copy from JazzCash portal)
JAZZCASH_POST_URL=https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/

# Disable sandbox flags in production
JAZZCASH_SANDBOX=False
```

Notes:

- `FRONTEND_BASE_URL` must point to your **real frontend URL** (not localhost).
- `JAZZCASH_RETURN_URL` must be accessible from the internet over **HTTPS**.
- In the JazzCash portal, set **Return URL** (and optionally IPN URL) to the same value as `JAZZCASH_RETURN_URL`.

---

## 3. Re‑enable Strict Security Checks in Code

For local sandbox testing we relaxed some checks in `JazzCashReturnView`. **Before going live** you should restore strict behavior.

### 3.1. File to edit

`backend/lms_backend/api/views.py`

Locate the class:

```python
class JazzCashReturnView(APIView):
    ...
```

### 3.2. Secure hash validation

Current (sandbox‑friendly) logic:

```python
pp_secure_hash = data.get('pp_SecureHash')
sandbox_mode = getattr(dj_settings, 'JAZZCASH_SANDBOX', False)
if not pp_secure_hash and not sandbox_mode:
    return Response({"detail": "Missing secure hash."}, status=status.HTTP_400_BAD_REQUEST)
...
if pp_secure_hash and not hmac.compare_digest(expected_hash.lower(), pp_secure_hash.lower()) and not sandbox_mode:
    return Response({"detail": "Invalid secure hash."}, status=status.HTTP_400_BAD_REQUEST)
```

For production, you can simplify this back to **always enforce** the hash:

```python
pp_secure_hash = data.get('pp_SecureHash')
if not pp_secure_hash:
    return Response({"detail": "Missing secure hash."}, status=status.HTTP_400_BAD_REQUEST)
...
if not hmac.compare_digest(expected_hash.lower(), pp_secure_hash.lower()):
    return Response({"detail": "Invalid secure hash."}, status=status.HTTP_400_BAD_REQUEST)
```

(You can keep the `sandbox_mode` logic only on your dev/staging environment if you like, but for the **real live server** it should behave as above.)

### 3.3. Success / failure decision

Current sandbox behavior treats all responses as success when `JAZZCASH_SANDBOX=True`:

```python
response_code = data.get('pp_ResponseCode')
# In sandbox mode, treat all callbacks as success so local testing always completes
is_success = (response_code == '000') or sandbox_mode
```

For production, change this to rely **only** on the JazzCash response code:

```python
response_code = data.get('pp_ResponseCode')
is_success = (response_code == '000')
```

This ensures that only real successful payments are marked `completed`.

---

## 4. JazzCash Portal Configuration (Live)

In the **live** JazzCash merchant portal:

1. **Return URL**
   - Set to your public backend URL:
   - `https://your-backend-domain.com/api/payments/jazzcash/return/`

2. **IPN URL** (optional)
   - If you don’t have a separate IPN endpoint yet, you can set it to the same URL as Return.
   - Your current code only uses the return URL.

3. **POST URL**
   - In your code, `JAZZCASH_POST_URL` must match the **live** merchant form URL shown in the portal.

4. **Currency and amount**
   - Ensure that your transactions are in PKR and that the amount you send (in paisa) matches JazzCash requirements (you already multiply by 100 in code).

---

## 5. Deployment Checklist

Before enabling real users to pay:

- [ ] Backend deployed on a public domain with HTTPS.
- [ ] Frontend deployed on its public domain; `FRONTEND_BASE_URL` updated.
- [ ] Live `.env` configured with live JazzCash credentials.
- [ ] `JAZZCASH_SANDBOX=False` on the production backend.
- [ ] `JazzCashReturnView` uses **strict** secure‑hash and response‑code checks.
- [ ] JazzCash portal Return URL/IPN URL configured to point to `/api/payments/jazzcash/return/`.
- [ ] Test one or two **small‑amount** live payments (e.g. Rs 10–20) with your own wallet and confirm:
  - Payment row is created and marked `completed`.
  - Enrollment is created automatically.
  - Frontend shows `payment_status=success` and the course appears in **My Courses**.

---

## 6. Local Development vs Production

- **Local dev:**
  - Use sandbox credentials.
  - `JAZZCASH_SANDBOX=True`.
  - `JAZZCASH_POST_URL` = sandbox URL.
  - Relaxed hash / forced success is OK for testing only.

- **Production:**
  - Use live credentials.
  - `JAZZCASH_SANDBOX=False`.
  - `JAZZCASH_POST_URL` = live URL.
  - Hash must be valid and `pp_ResponseCode == '000'` before marking payment completed.

Keep this file updated if you change any payment logic in the future.
