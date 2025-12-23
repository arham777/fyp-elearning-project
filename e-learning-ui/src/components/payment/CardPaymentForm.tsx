import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { Course } from '@/types';
import { paymentsApi } from '@/api/payments';
import { toast } from '@/hooks/use-toast';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';

interface CardPaymentFormProps {
  course: Course;
  onSuccess: () => void;
  onCancel: () => void;
}

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise: Promise<Stripe | null> = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve<Stripe | null>(null);

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const maybeAxios = error as { response?: { data?: { detail?: unknown } } };
    const detail = maybeAxios.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    const maybeErr = error as { message?: unknown };
    if (typeof maybeErr.message === 'string' && maybeErr.message.trim()) return maybeErr.message;
  }
  return 'Something went wrong. Please try again.';
}

const StripePaymentElementForm: React.FC<{
  paymentId: number;
  courseId: number;
  onCancel: () => void;
}> = ({ paymentId, courseId, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: 'Stripe not ready',
        description: 'Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);

      const returnUrl = new URL('/app/payments/stripe/result', window.location.origin);
      returnUrl.searchParams.set('payment_id', String(paymentId));
      returnUrl.searchParams.set('course_id', String(courseId));

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl.toString(),
        },
      });

      if (result.error) {
        const msg = result.error.message || 'Unable to confirm payment. Please try again.';
        toast({ title: 'Payment Failed', description: msg, variant: 'destructive' });
      }
    } catch (error: unknown) {
      toast({ title: 'Payment Failed', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isProcessing || !stripe || !elements} className="flex-1">
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Pay now'
          )}
        </Button>
      </div>
    </form>
  );
};

const CardPaymentForm: React.FC<CardPaymentFormProps> = ({ course, onSuccess, onCancel }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const elementsOptions: StripeElementsOptions | undefined = useMemo(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
    };
  }, [clientSecret]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!STRIPE_PUBLISHABLE_KEY) {
        toast({
          title: 'Stripe not configured',
          description: 'Missing VITE_STRIPE_PUBLISHABLE_KEY in the frontend environment.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setIsInitializing(true);
        const payment = await paymentsApi.initiatePayment(course.id, 'stripe');
        if (!mounted) return;
        setPaymentId(payment.id);

        const intent = await paymentsApi.stripeCreateIntent(payment.id);
        if (!mounted) return;
        setClientSecret(intent.client_secret);
      } catch (error: unknown) {
        toast({ title: 'Payment Error', description: getErrorMessage(error), variant: 'destructive' });
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [course.id]);

  return (
    <div className="space-y-4">
      {/* Card Visual */}
      <div className="relative bg-slate-800 dark:bg-slate-900 rounded-xl p-6 text-white shadow-lg dark:shadow-2xl transition-shadow duration-300 hover:shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 opacity-80" />
            <div>
              <div className="text-sm font-semibold">Secure Card Payment</div>
              <div className="text-xs opacity-80">Powered by Stripe</div>
            </div>
          </div>
          <div className="text-sm font-semibold">
            {new Intl.NumberFormat('en-PK', {
              style: 'currency',
              currency: 'PKR',
              maximumFractionDigits: 0,
            }).format(typeof course.price === 'string' ? parseFloat(course.price) : course.price)}
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <Lock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Your payment information is encrypted and secure. We never store your full card details.
        </p>
      </div>

      {isInitializing ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        clientSecret && paymentId && elementsOptions ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <StripePaymentElementForm paymentId={paymentId} courseId={course.id} onCancel={onCancel} />
          </Elements>
        ) : (
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="button" onClick={onSuccess} className="flex-1" disabled>
              Pay now
            </Button>
          </div>
        )
      )}
    </div>
  );
};

export default CardPaymentForm;
