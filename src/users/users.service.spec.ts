import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create.user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

jest.mock('bcrypt');

describe('UsersService', () => {
  let usersService: UsersService;
  let mockPrismaService: { user: { create: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe('createUser', () => {
    it('should create a user and return it', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        role: Role.USER,
      };
      const hashedPassword = 'hashedPassword';
      const createdUser = { id: 1, ...createUserDto, password: hashedPassword };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await usersService.createUser(createUserDto);
      expect(result).toEqual(createdUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: createUserDto.name,
            email: createUserDto.email,
            password: expect.any(String), // Expect any hashed string
            role: createUserDto.role,
          }),
        }),
      );
    });
  });

  describe('findUserByEmail', () => {
    it('should return a user by email', async () => {
      const email = 'test@example.com';
      const expectedUser = { id: 1, name: 'Test User', email };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const user = await usersService.findUserByEmail(email);
      expect(user).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email } });
    });

    it('should return null if user is not found', async () => {
      const email = 'nonexistent@example.com';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const user = await usersService.findUserByEmail(email);
      expect(user).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email } });
    });
  });
});
