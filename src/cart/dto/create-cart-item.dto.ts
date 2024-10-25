import { IsNumber, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCartItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}