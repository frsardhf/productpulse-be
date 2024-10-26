import { IsNumber, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCartItemDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the product to add to cart'
  })
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @ApiProperty({
    example: 1,
    description: 'Quantity of the product to add',
    minimum: 1
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}