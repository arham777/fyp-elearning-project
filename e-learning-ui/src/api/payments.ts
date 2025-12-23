import apiClient from './apiClient';
import { Payment, PaymentFormData } from '@/types';

export const paymentsApi = {
  // Initiate a payment for a course
  initiatePayment: async (courseId: number, paymentMethod: 'stripe' | 'jazzcash'): Promise<Payment> => {
    const response = await apiClient.post('/payments/initiate/', {
      course_id: courseId,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  // Process payment with card/payment details
  processPayment: async (paymentId: number, paymentData: PaymentFormData): Promise<{
    payment: Payment;
    enrollment: unknown;
    message: string;
  }> => {
    const response = await apiClient.post(`/payments/${paymentId}/process/`, paymentData);
    return response.data;
  },

  stripeCreateIntent: async (paymentId: number): Promise<{ client_secret: string; payment_intent_id: string }> => {
    const response = await apiClient.post(`/payments/${paymentId}/stripe_create_intent/`, {});
    return response.data;
  },

  stripeFulfill: async (
    paymentId: number,
    paymentIntentId: string
  ): Promise<{ payment: Payment; enrollment: unknown; message?: string; already_fulfilled?: boolean }> => {
    const response = await apiClient.post(`/payments/${paymentId}/stripe_fulfill/`, {
      payment_intent_id: paymentIntentId,
    });
    return response.data;
  },

  // Initialize JazzCash hosted checkout session
  jazzcashInit: async (
    paymentId: number,
    phoneNumber?: string
  ): Promise<{ post_url: string; fields: Record<string, string> }> => {
    const payload = phoneNumber ? { phone_number: phoneNumber } : {};
    const response = await apiClient.post(`/payments/${paymentId}/jazzcash_init/`, payload);
    return response.data;
  },

  // Get current user's payment history
  getMyPayments: async (): Promise<Payment[]> => {
    const response = await apiClient.get('/payments/my_payments/');
    return response.data;
  },

  // Get a specific payment
  getPayment: async (paymentId: number): Promise<Payment> => {
    const response = await apiClient.get(`/payments/${paymentId}/`);
    return response.data;
  },

  // Get all payments (admin/teacher)
  getAllPayments: async (): Promise<Payment[]> => {
    const response = await apiClient.get('/payments/');
    return response.data;
  },
};
