import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;

  const mockUserService = {
    findUserByEmail: jest.fn() as jest.MockedFunction<typeof mockUserService.findUserByEmail>,
  };

  const mockJwtService = {
    sign: jest.fn() as jest.MockedFunction<typeof mockJwtService.sign>,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('should validate user successfully', async () => {
    const user = { id: 1, email: 'test@example.com', password: 'hashed_password' };
    jest.spyOn(mockUserService, 'findUserByEmail').mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async (password: string, hash: string) => {
      return password === 'password'; // Adjust this according to your logic
    });

    const result = await authService.validateUser('test@example.com', 'password');

    expect(result).toEqual({ id: 1, email: 'test@example.com' });
  });

  it('should return null if user not found', async () => {
    jest.spyOn(mockUserService, 'findUserByEmail').mockResolvedValue(null);

    const result = await authService.validateUser('test@example.com', 'password');

    expect(result).toBeNull();
  });

  it('should return null if password is incorrect', async () => {
    const user = { id: 1, email: 'test@example.com', password: 'hashed_password' };
    jest.spyOn(mockUserService, 'findUserByEmail').mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async (password: string, hash: string) => {
      return false; // Simulate incorrect password
    });

    const result = await authService.validateUser('test@example.com', 'wrong_password');

    expect(result).toBeNull();
  });
});
