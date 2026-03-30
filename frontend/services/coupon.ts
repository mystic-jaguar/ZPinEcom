import { CouponObject } from '../types/types';
import apiClient, { handleApiError } from './api';

export const couponService = {
  async getCoupons(): Promise<CouponObject[]> {
    try {
      const response = await apiClient.get('coupons');
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async validateCoupon(code: string, orderTotal: number): Promise<CouponObject & { discount: number }> {
    try {
      const response = await apiClient.post('coupons/validate', { code, orderTotal });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
