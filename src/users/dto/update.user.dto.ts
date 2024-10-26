import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: 'Updated John Doe',
    description: 'Updated name of the user',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'updated.john.doe@example.com',
    description: 'Updated email address of the user',
    required: false
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'Updated password for the user account',
    required: false
  })
  @IsOptional()
  @IsString()
  password?: string;
}