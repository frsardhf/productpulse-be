// src/auth/dto/logout.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @IsNotEmpty()
  @IsString()
  access_token: string; // This will hold the token to be invalidated or used to confirm logout
}
