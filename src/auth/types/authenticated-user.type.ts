import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  userId: number;
  name: string;
  email: string;
  role: Role;
}

export interface JwtPayload {
  sub: number;
  name: string;
  email: string;
  role: Role;
}
