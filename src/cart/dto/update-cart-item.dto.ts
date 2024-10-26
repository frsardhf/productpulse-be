import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 2,
    description: 'New quantity for the cart item',
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  quantity: number;
}