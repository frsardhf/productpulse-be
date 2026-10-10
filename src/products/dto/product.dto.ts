import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ImageRightsStatus, Prisma } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the product',
  })
  id: number;

  @ApiProperty({
    example: 'Wireless Mouse',
    description: 'Name of the product',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'High-performance wireless mouse with RGB lighting',
    description: 'Detailed description of the product',
    required: false,
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '29.99',
    description: 'Price of the product',
  })
  @IsNumber()
  @IsNotEmpty()
  price: Prisma.Decimal;

  @ApiProperty({
    example: 100,
    description: 'Available stock quantity',
  })
  @IsNumber()
  @IsNotEmpty()
  stock: number;

  @ApiProperty({
    example: 1,
    description: 'Category ID of the product',
  })
  @IsNotEmpty()
  @IsNumber()
  categoryId: number;

  @ApiProperty({ required: false, example: 'met-open-access' })
  sourceProvider?: string;

  @ApiProperty({ required: false, example: '55919' })
  sourceVariantId?: string;

  @ApiProperty({ required: false })
  sourceUrl?: string;

  @ApiProperty({ required: false, example: 'Tsukioka Yoshitoshi' })
  sourceVendor?: string;

  @ApiProperty({ required: false, example: 'Cats' })
  sourceCategory?: string;

  @ApiProperty({ required: false, example: 'Kaho' })
  variantLabel?: string;

  @ApiProperty({ required: false, example: '29.99' })
  sourcePrice?: Prisma.Decimal;

  @ApiProperty({ required: false, example: 'USD' })
  sourceCurrency?: string;

  @ApiProperty({ required: false })
  sourceAvailable?: boolean;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty({ required: false })
  imageAlt?: string;

  @ApiProperty({ enum: ImageRightsStatus })
  imageRightsStatus: ImageRightsStatus;

  @ApiProperty({ required: false, example: 'CC0 1.0' })
  sourceLicense?: string;

  @ApiProperty({ required: false })
  sourceAttribution?: string;

  @ApiProperty({ example: true })
  catalogueActive: boolean;
}
