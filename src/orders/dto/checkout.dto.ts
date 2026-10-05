import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({
    example: '123 Main St, City, Country',
    description: 'Shipping address for the simulated order',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  shippingAddress: string;

  @ApiProperty({
    example: '7ca1d688-83d4-4ac2-a71a-6cbe35b20d9f',
    description: 'Stable UUID reused when retrying the same checkout',
  })
  @IsUUID()
  idempotencyKey: string;
}
