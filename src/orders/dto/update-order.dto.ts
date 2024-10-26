import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderDto {
  @ApiProperty({
    example: 'shipped',
    description: 'Updated status of the order',
    required: false
  })
  @IsOptional()
  @IsString()
  status?: string;
}