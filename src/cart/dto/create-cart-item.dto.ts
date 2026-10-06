import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCartItemDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the product to add to cart',
  })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({
    example: 1,
    description: 'Quantity of the product to add',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;
}
