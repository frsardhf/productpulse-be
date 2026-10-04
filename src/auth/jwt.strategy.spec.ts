import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const usersService = {
    findUserById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('uses current database identity and role values', async () => {
    usersService.findUserById.mockResolvedValue({
      id: 1,
      name: 'Current Name',
      email: 'current@example.com',
      password: 'hashed-password',
      role: Role.ADMIN,
    });

    await expect(
      strategy.validate({
        sub: 1,
        name: 'Old Name',
        email: 'old@example.com',
        role: Role.USER,
      }),
    ).resolves.toEqual({
      userId: 1,
      name: 'Current Name',
      email: 'current@example.com',
      role: Role.ADMIN,
    });
    expect(usersService.findUserById).toHaveBeenCalledWith(1);
  });

  it('rejects a token whose user no longer exists', async () => {
    usersService.findUserById.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 99,
        name: 'Deleted User',
        email: 'deleted@example.com',
        role: Role.USER,
      }),
    ).resolves.toBeNull();
  });
});
