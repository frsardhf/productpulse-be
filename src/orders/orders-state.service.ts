import { Injectable } from '@nestjs/common';
import { CheckoutResponse } from './types/checkout.type';

@Injectable()
export class CheckoutStateService {
  private readonly checkoutState = new Map<string, CheckoutResponse>();

  setCheckoutState(userEmail: string, checkout: CheckoutResponse): void {
    this.checkoutState.set(userEmail, checkout);
    
    setTimeout(() => {
      this.checkoutState.delete(userEmail);
    }, 5 * 60 * 1000);
  }

  getCheckoutState(userEmail: string): CheckoutResponse | undefined {
    return this.checkoutState.get(userEmail);
  }

  clearCheckoutState(userEmail: string): void {
    this.checkoutState.delete(userEmail);
  }
}