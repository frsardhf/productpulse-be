import { Role } from '@prisma/client';
import { validate } from 'class-validator';
import { CreateUserDto } from './create.user.dto';

describe('CreateUserDto', () => {
  it('rejects role assignment on the public signup contract', async () => {
    const input = Object.assign(new CreateUserDto(), {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: Role.ADMIN,
    });

    const errors = await validate(input, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'role' })]),
    );
  });
});
