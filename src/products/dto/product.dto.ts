import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Prisma } from '@prisma/client';

export class ProductDto {
  id: number;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  price: Prisma.Decimal;

  @IsNumber()
  @IsNotEmpty()
  stock: number;

  @IsNotEmpty()
  @IsNumber()
  categoryId: number;
}
