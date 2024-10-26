import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({
    example: '123 Main St, City, Country',
    description: 'Shipping address for the order'
  })
  @IsString()
  shippingAddress: string;
}