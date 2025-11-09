import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, Lock, CheckCircle2 } from 'lucide-react';
import { Course } from '@/types';
import { paymentsApi } from '@/api/payments';
import { toast } from '@/hooks/use-toast';
import { updateEnrollmentCache } from '@/utils/courseNavigation';

interface JazzCashPaymentFormProps {
  course: Course;
  onSuccess: () => void;
  onCancel: () => void;
}

const JazzCashPaymentForm: React.FC<JazzCashPaymentFormProps> = ({ course, onSuccess, onCancel }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');

  const handlePhoneChange = (value: string) => {
    // Only allow digits and limit to 11 characters
    const formatted = value.replace(/\D/g, '');
    if (formatted.length <= 11) {
      setPhoneNumber(formatted);
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits and limit to 4 characters
    const formatted = value.replace(/\D/g, '');
    if (formatted.length <= 4) {
      setPin(formatted);
    }
  };

  const validateForm = (): boolean => {
    const numberLength = phoneNumber.length;
    if (numberLength < 10 || numberLength > 11) {
      toast({ title: 'Error', description: 'Please enter a valid 10 or 11-digit phone number', variant: 'destructive' });
      return false;
    }

    if (numberLength === 11 && !phoneNumber.startsWith('03')) {
      toast({ title: 'Error', description: '11-digit numbers must start with 03', variant: 'destructive' });
      return false;
    }

    if (numberLength === 10 && !phoneNumber.startsWith('3')) {
      toast({ title: 'Error', description: '10-digit numbers must start with 3', variant: 'destructive' });
      return false;
    }

    if (pin.length !== 4) {
      toast({ title: 'Error', description: 'Please enter your 4-digit PIN', variant: 'destructive' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsProcessing(true);

      // Step 1: Initiate payment
      const payment = await paymentsApi.initiatePayment(course.id, 'jazzcash');

      // Step 2: Process payment with JazzCash details
      const finalPhoneNumber = phoneNumber.length === 10 ? `0${phoneNumber}` : phoneNumber;
      const result = await paymentsApi.processPayment(payment.id, {
        phone_number: finalPhoneNumber,
        card_number: '', // Not needed for JazzCash
        card_holder: '',
        expiry_date: '',
        cvv: pin, // Using CVV field for PIN
      });

      // Update enrollment cache
      updateEnrollmentCache(course.id, true);

      toast({
        title: 'Payment Successful!',
        description: `You are now enrolled in ${course.title}`,
      });

      onSuccess();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Payment failed. Please try again.';
      toast({
        title: 'Payment Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* JazzCash Visual */}
      <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Smartphone className="w-8 h-8" />
            <div>
              <div className="text-2xl font-bold">JazzCash</div>
              <div className="text-xs opacity-80">Mobile Wallet</div>
            </div>
          </div>
          <div className="text-xs font-medium opacity-80">PAKISTAN</div>
        </div>
        
        <div className="space-y-3">
          <div className="font-mono text-lg tracking-wider">
            {(() => {
              const displayNum = phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber;
              const part1 = displayNum.slice(0, 3);
              const part2 = displayNum.slice(3, 10);
              if (!part1) return '+92 XXX XXXXXXX';
              return `+92 ${part1}${part2 ? ` ${part2}` : ''}`;
            })()}
          </div>
          
          <div className="flex items-center gap-2 text-sm opacity-90">
            <CheckCircle2 className="w-4 h-4" />
            <span>Instant Payment</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone_number">JazzCash Mobile Number</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              +92
            </span>
            <Input
              id="phone_number"
              placeholder="03001234567"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={isProcessing}
              className="font-mono pl-12"
              maxLength={11}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your 11-digit JazzCash mobile number (e.g., 03001234567)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">JazzCash PIN</Label>
          <Input
            id="pin"
            type="password"
            placeholder="••••"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            disabled={isProcessing}
            className="font-mono"
            maxLength={4}
          />
          <p className="text-xs text-muted-foreground">
            Enter your 4-digit JazzCash PIN
          </p>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm text-foreground">Payment Instructions:</h4>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Enter your registered JazzCash mobile number</li>
          <li>Enter your 4-digit JazzCash PIN</li>
          <li>You'll receive an SMS confirmation after payment</li>
          <li>Amount will be deducted from your JazzCash wallet</li>
        </ol>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <Lock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Your payment is secure and encrypted. Your PIN is never stored on our servers.
        </p>
      </div>

      {/* Action Buttons */}
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
        <Button
          type="submit"
          disabled={isProcessing}
          className="flex-1 bg-orange-600 hover:bg-orange-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatPKR(course.price)}`
          )}
        </Button>
      </div>
    </form>
  );
};

export default JazzCashPaymentForm;
