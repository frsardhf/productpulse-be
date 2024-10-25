import { ApiProperty } from '@nestjs/swagger';

export class CartItemsDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  categoryId: number;

  @ApiProperty()
  quantity: number;
}