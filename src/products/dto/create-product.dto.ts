import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;

  @IsNotEmpty({ message: 'Description is required.' })
  description: string;

  @IsNotEmpty({ message: 'Price is required.' })
  @IsNumber()
  price: number;

  @IsNotEmpty({ message: 'Stock is required.' })
  @IsNumber()
  @IsPositive()
  stock: number;

  @IsNotEmpty({ message: 'CategoryId is required.' })
  @IsNumber()
  categoryId: number;
}
