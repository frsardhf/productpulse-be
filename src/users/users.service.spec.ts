import { HttpException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create.user.dto';
import { UsersService } from './users.service';

jest.mock('bcrypt');

describe('UsersService', () => {
  let usersService: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    usersService = module.get(UsersService);
  });

  describe('createUser', () => {
    const input: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('forces the USER role and returns only safe fields', async () => {
      const safeUser = {
        id: 1,
        name: input.name,
        email: input.email,
        role: Role.USER,
      };
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(safeUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await expect(usersService.createUser(input)).resolves.toEqual(safeUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          email: input.email,
          password: 'hashed-password',
          role: Role.USER,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
      expect(prisma.user.create.mock.calls[0][0].select).not.toHaveProperty(
        'password',
      );
    });

    it('rejects an email that is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(usersService.createUser(input)).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  it('finds a user by ID for authoritative session validation', async () => {
    const user = { id: 1, email: 'test@example.com' };
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(usersService.findUserById(1)).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('lists users without password data', async () => {
    const users = [
      { id: 1, name: 'Test User', email: 'test@example.com', role: Role.USER },
    ];
    prisma.user.findMany.mockResolvedValue(users);

    await expect(usersService.findAllUsers()).resolves.toEqual(users);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { id: 'asc' },
    });
  });

  it('updates a user role without returning password data', async () => {
    const updatedUser = {
      id: 2,
      name: 'Admin User',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };
    prisma.user.findUnique.mockResolvedValue({ ...updatedUser, password: 'x' });
    prisma.user.update.mockResolvedValue(updatedUser);

    await expect(usersService.updateUserRole(2, Role.ADMIN)).resolves.toEqual(
      updatedUser,
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { role: Role.ADMIN },
      select: { id: true, name: true, email: true, role: true },
    });
  });

  it('rejects a role update for a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      usersService.updateUserRole(999, Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
