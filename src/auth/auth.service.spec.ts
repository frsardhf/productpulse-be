import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;

  const usersService = {
    findUserByEmail: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('validates credentials without exposing the password hash', async () => {
    usersService.findUserByEmail.mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password',
      role: Role.USER,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      authService.validateUser('test@example.com', 'password123'),
    ).resolves.toEqual({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: Role.USER,
    });
  });

  it.each([
    ['missing user', null, true],
    [
      'incorrect password',
      {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed-password',
        role: Role.USER,
      },
      false,
    ],
  ])('rejects %s', async (_label, user, passwordMatches) => {
    usersService.findUserByEmail.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(passwordMatches);

    await expect(
      authService.validateUser('test@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('signs a safe session payload', async () => {
    const user = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: Role.USER,
    };
    jwtService.sign.mockReturnValue('signed-token');

    await expect(authService.login(user)).resolves.toEqual({
      access_token: 'signed-token',
      user,
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      {
        sub: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
      { secret: 'test-secret' },
    );
  });

  it('describes stateless logout without receiving or logging a token', () => {
    expect(authService.logout()).toEqual({
      message: 'Logout completed on the client',
    });
  });
});
