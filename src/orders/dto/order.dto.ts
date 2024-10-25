import { Decimal } from '@prisma/client/runtime/library';
import { IsDate, IsNumber, IsString, IsArray } from 'class-validator';

export class OrderDto {
  @IsNumber()
  id: number;

  @IsNumber()
  userId: number;

  @IsArray()
  productsId: number[];

  @IsArray()
  orderItems: {
    productId: number;
    quantity: number;
    price: string;
  }[];

  @IsString()
  status: string;

  @IsNumber()
  totalPrice: Decimal;

  @IsDate()
  createdAt: Date;

  @IsString()
  shippingAddress: string;
}
