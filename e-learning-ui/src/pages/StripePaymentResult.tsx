import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { toast } from '@/hooks/use-toast';
import { paymentsApi } from '@/api/payments';
import { updateEnrollmentCache } from '@/utils/courseNavigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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

type ViewState = 'loading' | 'success' | 'failed';

const StripePaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [state, setState] = useState<ViewState>('loading');
  const [message, setMessage] = useState<string>('Finalizing your payment...');

  const paymentId = useMemo(() => {
    const raw = searchParams.get('payment_id');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const courseId = useMemo(() => {
    const raw = searchParams.get('course_id');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const clientSecret = useMemo(() => {
    return searchParams.get('payment_intent_client_secret');
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!STRIPE_PUBLISHABLE_KEY) {
        setState('failed');
        setMessage('Stripe is not configured (missing VITE_STRIPE_PUBLISHABLE_KEY).');
        return;
      }

      if (!paymentId || !courseId) {
        setState('failed');
        setMessage('Missing payment context. Please return to the course and try again.');
        return;
      }

      if (!clientSecret) {
        setState('failed');
        setMessage('Missing Stripe client secret. Please try again.');
        return;
      }

      try {
        const stripe = await stripePromise;
        if (!stripe) {
          setState('failed');
          setMessage('Stripe failed to initialize. Please refresh and try again.');
          return;
        }

        const retrieved = await stripe.retrievePaymentIntent(clientSecret);
        const pi = retrieved.paymentIntent;

        if (!pi) {
          setState('failed');
          setMessage(retrieved.error?.message || 'Unable to retrieve payment status.');
          return;
        }

        if (pi.status !== 'succeeded') {
          setState('failed');
          setMessage(`Payment not completed (status: ${pi.status}).`);
          return;
        }

        setMessage('Payment successful. Activating your enrollment...');

        await paymentsApi.stripeFulfill(paymentId, pi.id);
        updateEnrollmentCache(courseId, true);

        if (!mounted) return;
        setState('success');
        setMessage('Enrollment activated. Redirecting to your course...');

        toast({
          title: 'Payment Successful',
          description: 'You are now enrolled. Opening your course...',
        });

        setTimeout(() => {
          navigate(`/app/my-courses/${courseId}`, { replace: true });
        }, 700);
      } catch (error: unknown) {
        if (!mounted) return;
        setState('failed');
        setMessage(getErrorMessage(error));
        toast({
          title: 'Payment Error',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [clientSecret, courseId, navigate, paymentId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-3">
          {state === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          )}
          <h1 className="text-lg font-semibold text-foreground">Stripe Payment</h1>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{message}</p>

        {state === 'failed' && (
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (courseId) {
                  navigate(`/app/courses/${courseId}`, { replace: true });
                } else {
                  navigate('/app/courses', { replace: true });
                }
              }}
            >
              Back to course
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripePaymentResult;
