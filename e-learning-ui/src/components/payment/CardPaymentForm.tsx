import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { Course, PaymentFormData } from '@/types';
import { paymentsApi } from '@/api/payments';
import { toast } from '@/hooks/use-toast';
import { updateEnrollmentCache } from '@/utils/courseNavigation';

interface CardPaymentFormProps {
  course: Course;
  onSuccess: () => void;
  onCancel: () => void;
}

const CardPaymentForm: React.FC<CardPaymentFormProps> = ({ course, onSuccess, onCancel }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    card_number: '',
    card_holder: '',
    expiry_date: '',
    cvv: '',
  });

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    let formattedValue = value;

    // Format card number with spaces
    if (field === 'card_number') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      if (formattedValue.replace(/\s/g, '').length > 16) return;
    }

    // Format expiry date as MM/YY
    if (field === 'expiry_date') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 4);
      }
      if (formattedValue.length > 5) return;
    }

    // Limit CVV to 3-4 digits
    if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 4) return;
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));
  };

  const validateForm = (): boolean => {
    const cardNumber = formData.card_number.replace(/\s/g, '');
    
    if (!formData.card_holder.trim()) {
      toast({ title: 'Error', description: 'Please enter cardholder name', variant: 'destructive' });
      return false;
    }

    if (cardNumber.length < 13 || cardNumber.length > 16) {
      toast({ title: 'Error', description: 'Please enter a valid card number', variant: 'destructive' });
      return false;
    }

    if (!/^\d{2}\/\d{2}$/.test(formData.expiry_date)) {
      toast({ title: 'Error', description: 'Please enter expiry date as MM/YY', variant: 'destructive' });
      return false;
    }

    const [month, year] = formData.expiry_date.split('/').map(Number);
    if (month < 1 || month > 12) {
      toast({ title: 'Error', description: 'Invalid expiry month', variant: 'destructive' });
      return false;
    }

    if (formData.cvv.length < 3) {
      toast({ title: 'Error', description: 'Please enter a valid CVV', variant: 'destructive' });
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
      const payment = await paymentsApi.initiatePayment(course.id, 'stripe');

      // Step 2: Process payment with card details
      const result = await paymentsApi.processPayment(payment.id, {
        ...formData,
        card_number: formData.card_number.replace(/\s/g, ''),
      });

      // Update enrollment cache
      updateEnrollmentCache(course.id, true);

      toast({
        title: 'Payment Successful!',
        description: `You are now enrolled in ${course.title}`,
      });

      onSuccess();
    } catch (error) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card Visual */}
      <div className="relative bg-slate-800 dark:bg-slate-900 rounded-xl p-6 text-white shadow-lg dark:shadow-2xl transition-shadow duration-300 hover:shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <CreditCard className="w-10 h-10 opacity-80" />
          <div className="text-xs font-medium opacity-80">DEBIT</div>
        </div>
        
        <div className="space-y-4">
          <div className="font-mono text-lg tracking-wider">
            {formData.card_number || '•••• •••• •••• ••••'}
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] opacity-70 mb-1">CARD HOLDER</div>
              <div className="font-medium text-sm">
                {formData.card_holder || 'YOUR NAME'}
              </div>
            </div>
            <div>
              <div className="text-[10px] opacity-70 mb-1">EXPIRES</div>
              <div className="font-medium text-sm">
                {formData.expiry_date || 'MM/YY'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="card_number">Card Number</Label>
          <Input
            id="card_number"
            placeholder="1234 5678 9000 0000"
            value={formData.card_number}
            onChange={(e) => handleInputChange('card_number', e.target.value)}
            disabled={isProcessing}
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="card_holder">Account Holder Name</Label>
          <Input
            id="card_holder"
            placeholder="John Doe"
            value={formData.card_holder}
            onChange={(e) => handleInputChange('card_holder', e.target.value.toUpperCase())}
            disabled={isProcessing}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              placeholder="MM/YY"
              value={formData.expiry_date}
              onChange={(e) => handleInputChange('expiry_date', e.target.value)}
              disabled={isProcessing}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              type="password"
              placeholder="123"
              value={formData.cvv}
              onChange={(e) => handleInputChange('cvv', e.target.value)}
              disabled={isProcessing}
              className="font-mono"
              maxLength={4}
            />
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
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${new Intl.NumberFormat('en-PK', {
              style: 'currency',
              currency: 'PKR',
              maximumFractionDigits: 0,
            }).format(typeof course.price === 'string' ? parseFloat(course.price) : course.price)}`
          )}
        </Button>
      </div>
    </form>
  );
};

export default CardPaymentForm;
