import { Decimal } from '@prisma/client/runtime/library';

export interface CheckoutItem {
  productId: number;
  quantity: number;
  price: string;
}

export interface CheckoutResponse {
  id: number;
  userId: number;
  status: string;
  totalPrice: Decimal;
  createdAt: Date;
  shippingAddress: string;
  productsId: number[];
  orderItems: CheckoutItem[];
}