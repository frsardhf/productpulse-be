import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        name: string;
        email: string;
        role: Role;
      };
    }
  }
}
