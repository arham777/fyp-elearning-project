import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Smartphone, ArrowLeft } from 'lucide-react';
import { Course } from '@/types';
import CardPaymentForm from './CardPaymentForm';
import JazzCashPaymentForm from './JazzCashPaymentForm';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  onSuccess: () => void;
}

type PaymentMethod = 'stripe' | 'jazzcash' | null;
type PaymentStep = 'select' | 'form';

const PaymentModal: React.FC<PaymentModalProps> = ({ open, onOpenChange, course, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [step, setStep] = useState<PaymentStep>('select');

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep('form');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedMethod(null);
  };

  const handleDialogChange = (value: boolean) => {
    // Reset local state only when closing
    if (!value) {
      setStep('select');
      setSelectedMethod(null);
    }
    onOpenChange(value);
  };

  const handlePaymentSuccess = () => {
    // Close dialog and reset
    handleDialogChange(false);
    onSuccess();
  };

  const formatPKR = (value: number | string): string => {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(amount)) return 'PKR 0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            {step === 'form' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0 mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'select' ? 'Choose Payment Method' : 'Payment Details'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step === 'select'
              ? 'Select your preferred payment method to complete your course purchase'
              : 'Enter your payment details to complete the transaction'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Course Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-foreground line-clamp-2">{course.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  by {course.teacher.first_name} {course.teacher.last_name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="text-xl font-bold text-primary">{formatPKR(course.price)}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose the payment method you'd like to use:
              </p>

              {/* Stripe Card Payment */}
              <button
                onClick={() => handleMethodSelect('stripe')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">Credit / Debit Card</h4>
                  <p className="text-sm text-muted-foreground">Pay with Visa, Mastercard, or other cards</p>
                </div>
                <div className="flex items-center gap-1">
                  <img src="/visa.svg" alt="Visa" className="h-6 opacity-60" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <img src="/mastercard.svg" alt="Mastercard" className="h-6 opacity-60" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
              </button>

              {/* JazzCash Payment */}
              <button
                onClick={() => handleMethodSelect('jazzcash')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">JazzCash</h4>
                  <p className="text-sm text-muted-foreground">Pay with your JazzCash mobile wallet</p>
                </div>
                <div className="text-2xl font-bold text-primary opacity-60">JC</div>
              </button>
            </div>
          )}

          {/* Payment Forms */}
          {step === 'form' && selectedMethod === 'stripe' && (
            <CardPaymentForm
              course={course}
              onSuccess={handlePaymentSuccess}
              onCancel={handleBack}
            />
          )}

          {step === 'form' && selectedMethod === 'jazzcash' && (
            <JazzCashPaymentForm
              course={course}
              onSuccess={handlePaymentSuccess}
              onCancel={handleBack}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
