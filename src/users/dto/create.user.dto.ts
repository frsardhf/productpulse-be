import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The name of the user'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the user'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password for the user account'
  })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: 'USER',
    description: 'Role of the user in the system',
    enum: Role,
    required: false
  })
  @IsOptional()
  @IsEnum(Role)
  role: Role;
}