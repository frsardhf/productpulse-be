import { IsNumber, IsString, IsArray } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  userId: number;

  @IsArray()
  productsId: number[];

  @IsString()
  status: string;

  @IsNumber()
  totalPrice: number;
}