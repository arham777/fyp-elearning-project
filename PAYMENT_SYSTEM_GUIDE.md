# Payment System Implementation Guide

## Overview
This document describes the complete payment system implementation for the e-learning platform, supporting both Stripe (card payments) and JazzCash (mobile wallet) payment methods.

## Features Implemented

### 1. Backend (Django)

#### Payment Model (`myapp/models.py`)
- **Fields:**
  - `student`: ForeignKey to User (student only)
  - `course`: ForeignKey to Course
  - `amount`: DecimalField for payment amount
  - `payment_method`: Choice field ('stripe' or 'jazzcash')
  - `status`: Choice field ('pending', 'processing', 'completed', 'failed', 'refunded')
  - `transaction_id`: Unique transaction identifier from payment gateway
  - `payment_intent_id`: Stripe PaymentIntent ID or JazzCash reference
  - `card_last4`: Last 4 digits of card (for display only)
  - `card_brand`: Card brand (Visa, Mastercard, etc.)
  - `created_at`: Timestamp when payment was initiated
  - `payment_date`: Timestamp when payment was completed
  - `failure_reason`: Error message if payment failed
  - `metadata`: JSON field for additional payment gateway data

- **Methods:**
  - `mark_as_completed()`: Marks payment as completed and creates enrollment

#### Payment API Endpoints (`api/views.py`)
- **POST `/api/payments/initiate/`**: Initiate a new payment
  - Payload: `{ "course_id": 1, "payment_method": "stripe" }`
  - Returns: Payment object with pending status
  
- **POST `/api/payments/{id}/process/`**: Process payment with card/payment details
  - Payload: Card details or JazzCash credentials
  - Returns: Payment object, enrollment, and success message
  
- **GET `/api/payments/my_payments/`**: Get current user's payment history
  - Returns: List of payment objects

- **GET `/api/payments/`**: Get all payments (admin/teacher only)
  - Returns: List of all payments

#### Payment Serializer (`api/serializers.py`)
- Includes all payment fields
- Adds computed fields: `student_name`, `course_title`
- Read-only fields: timestamps, computed fields

### 2. Frontend (React + TypeScript)

#### Types (`types/index.ts`)
```typescript
interface Payment {
  id: number;
  student: number;
  student_name?: string;
  course: number;
  course_title?: string;
  amount: number | string;
  payment_method: 'stripe' | 'jazzcash';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  payment_intent_id?: string;
  card_last4?: string;
  card_brand?: string;
  created_at: string;
  payment_date?: string;
  updated_at?: string;
  failure_reason?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentFormData {
  card_number: string;
  card_holder: string;
  expiry_date: string;
  cvv: string;
  phone_number?: string; // For JazzCash
}
```

#### Payment API Service (`api/payments.ts`)
- `initiatePayment()`: Create new payment record
- `processPayment()`: Submit payment details and process
- `getMyPayments()`: Fetch user's payment history
- `getPayment()`: Get specific payment details
- `getAllPayments()`: Admin/teacher view all payments

#### Components

##### PaymentModal (`components/payment/PaymentModal.tsx`)
- **Purpose**: Main payment dialog with method selection
- **Features:**
  - Displays course info and total amount
  - Two-step flow: method selection → payment form
  - Back button to return to method selection
  - Consistent dark theme with purple accents
  - Responsive design

##### CardPaymentForm (`components/payment/CardPaymentForm.tsx`)
- **Purpose**: Credit/Debit card payment form for Stripe
- **Features:**
  - Visual card preview that updates in real-time
  - Auto-formatting for card number (spaces every 4 digits)
  - Auto-formatting for expiry date (MM/YY)
  - CVV input with password masking
  - Card brand detection (Visa, Mastercard)
  - Form validation with user-friendly error messages
  - Security notice with lock icon
  - Processing state with loading spinner
  - Gradient card design matching theme

##### JazzCashPaymentForm (`components/payment/JazzCashPaymentForm.tsx`)
- **Purpose**: JazzCash mobile wallet payment form
- **Features:**
  - Visual JazzCash wallet preview
  - Phone number input with +92 prefix
  - 4-digit PIN input
  - Phone number validation (must start with 03, 11 digits)
  - Payment instructions list
  - Orange gradient design matching JazzCash branding
  - Security notice
  - Processing state with loading spinner

#### Integration in CourseDetail Page
- Payment modal opens when student clicks "Enroll now"
- Replaces direct enrollment with payment flow
- On successful payment:
  - Enrollment is created automatically
  - Enrollment cache is updated
  - User is navigated to course viewer
  - Success toast notification is shown

## Payment Flow

### Student Enrollment Flow
1. **Student clicks "Enroll now"** on course detail page
2. **Payment modal opens** showing:
   - Course title and teacher name
   - Total amount in PKR
   - Two payment method options
3. **Student selects payment method** (Stripe or JazzCash)
4. **Payment form is displayed** with:
   - Real-time input validation
   - Visual card/wallet preview
   - Security notices
5. **Student enters payment details** and clicks "Pay"
6. **Backend processes payment**:
   - Creates payment record with 'pending' status
   - Validates payment details (mock for now)
   - Updates status to 'processing' → 'completed'
   - Creates enrollment record
   - Returns success response
7. **Frontend handles success**:
   - Updates enrollment cache
   - Navigates to course viewer
   - Shows success notification
   - Closes payment modal

### Error Handling
- Form validation errors shown inline
- Payment processing errors shown as toast notifications
- Failed payments stored with failure reason
- User can retry payment

## Mock Payment Processing

**Current Implementation**: The payment processing is currently mocked for development purposes.

### Mock Behavior
- Accepts any card number (validates format only)
- Generates random transaction IDs
- Always succeeds unless validation fails
- Stores last 4 digits of card for display
- Detects card brand based on first digit

### Future Integration
To integrate real payment gateways:

#### For Stripe:
1. Install Stripe SDK: `pip install stripe`
2. Add Stripe secret key to environment variables
3. Update `processPayment()` in `api/views.py`:
   ```python
   import stripe
   stripe.api_key = settings.STRIPE_SECRET_KEY
   
   # Create PaymentIntent
   intent = stripe.PaymentIntent.create(
       amount=int(payment.amount * 100),  # Convert to cents
       currency='pkr',
       payment_method_types=['card'],
   )
   
   # Confirm payment
   confirmed = stripe.PaymentIntent.confirm(
       intent.id,
       payment_method=payment_method_id
   )
   ```

#### For JazzCash:
1. Register for JazzCash merchant account
2. Get API credentials (merchant ID, password, integrity salt)
3. Install JazzCash SDK or use REST API
4. Update `processPayment()` to call JazzCash API
5. Handle JazzCash callback/webhook for payment confirmation

## Security Considerations

### Current Implementation
- ✅ Never store full card numbers (only last 4 digits)
- ✅ CVV/PIN not stored in database
- ✅ HTTPS required for production
- ✅ Authentication required for all payment endpoints
- ✅ Students can only process their own payments
- ✅ Payment details encrypted in transit

### Production Requirements
- [ ] Implement PCI DSS compliance for card handling
- [ ] Use Stripe.js or similar for client-side tokenization
- [ ] Add CSRF protection
- [ ] Implement rate limiting on payment endpoints
- [ ] Add fraud detection mechanisms
- [ ] Set up payment gateway webhooks for async confirmation
- [ ] Implement refund functionality
- [ ] Add payment receipt generation
- [ ] Set up payment failure notifications

## Database Migrations

Migration file created: `myapp/migrations/0027_alter_payment_options_payment_card_brand_and_more.py`

To apply:
```bash
cd backend/lms_backend
python manage.py migrate
```

## Testing

### Manual Testing Steps

1. **Test Card Payment Flow**:
   - Login as student
   - Navigate to unpublished course
   - Click "Enroll now"
   - Select "Credit / Debit Card"
   - Enter test card: 4242 4242 4242 4242
   - Enter any name, future expiry, and 3-digit CVV
   - Click "Pay"
   - Verify enrollment success

2. **Test JazzCash Payment Flow**:
   - Login as student
   - Navigate to unpublished course
   - Click "Enroll now"
   - Select "JazzCash"
   - Enter phone: 03001234567
   - Enter any 4-digit PIN
   - Click "Pay"
   - Verify enrollment success

3. **Test Payment History**:
   - Make several test payments
   - Call GET `/api/payments/my_payments/`
   - Verify all payments are listed

4. **Test Error Handling**:
   - Try invalid card numbers
   - Try invalid phone numbers
   - Try expired cards
   - Verify error messages are user-friendly

### Test Cards (for future Stripe integration)
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Insufficient funds**: 4000 0000 0000 9995
- **3D Secure required**: 4000 0027 6000 3184

## UI/UX Features

### Design Consistency
- ✅ Dark theme with purple primary color
- ✅ Consistent spacing and typography
- ✅ Smooth transitions and animations
- ✅ Loading states for all async operations
- ✅ Toast notifications for feedback
- ✅ Responsive design for mobile devices

### Accessibility
- ✅ Proper label associations
- ✅ Keyboard navigation support
- ✅ ARIA labels for interactive elements
- ✅ Focus management in modals
- ✅ Error messages announced to screen readers

### User Experience
- ✅ Real-time input formatting
- ✅ Visual feedback on card preview
- ✅ Clear payment instructions
- ✅ Security reassurance messages
- ✅ One-click method selection
- ✅ Easy navigation between steps

## Files Modified/Created

### Backend
- ✅ `myapp/models.py` - Enhanced Payment model
- ✅ `api/serializers.py` - Updated PaymentSerializer
- ✅ `api/views.py` - Added PaymentViewSet with endpoints
- ✅ `api/urls.py` - Registered payment routes
- ✅ `myapp/migrations/0027_*.py` - Database migration

### Frontend
- ✅ `types/index.ts` - Added Payment and PaymentFormData types
- ✅ `api/payments.ts` - Payment API service functions
- ✅ `components/payment/PaymentModal.tsx` - Main payment dialog
- ✅ `components/payment/CardPaymentForm.tsx` - Card payment form
- ✅ `components/payment/JazzCashPaymentForm.tsx` - JazzCash payment form
- ✅ `pages/CourseDetail.tsx` - Integrated payment modal

### Documentation
- ✅ `PAYMENT_SYSTEM_GUIDE.md` - This file

## Next Steps

1. **Test the payment flow** thoroughly in development
2. **Obtain payment gateway credentials**:
   - Stripe: Create account at stripe.com
   - JazzCash: Contact JazzCash for merchant account
3. **Implement real payment gateway integration**
4. **Set up webhooks** for payment confirmation
5. **Add payment receipt generation**
6. **Implement refund functionality**
7. **Add admin dashboard** for payment management
8. **Set up payment analytics** and reporting
9. **Configure production environment variables**
10. **Perform security audit** before going live

## Support

For questions or issues:
- Check Django logs: `backend/lms_backend/logs/`
- Check browser console for frontend errors
- Review payment records in Django admin
- Test with mock data before real payments

## License

This payment system is part of the e-learning platform project and follows the same license terms.
