import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AdminGuard } from '../guards/admin.guard';
import { CreateUserDto } from './dto/create.user.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersService = {
    createUser: jest.fn(),
    findAllUsers: jest.fn(),
    updateUser: jest.fn(),
    updateUserRole: jest.fn(),
  };

  const authenticatedUser: AuthenticatedUser = {
    userId: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: Role.USER,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('creates a public user without accepting a role', async () => {
    const input: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };
    const safeUser = {
      id: 1,
      name: input.name,
      email: input.email,
      role: Role.USER,
    };
    usersService.createUser.mockResolvedValue(safeUser);

    await expect(controller.signup(input)).resolves.toEqual(safeUser);
    expect(usersService.createUser).toHaveBeenCalledWith(input);
  });

  it('delegates user listing to the protected service contract', async () => {
    const users = [authenticatedUser];
    usersService.findAllUsers.mockResolvedValue(users);

    await expect(controller.findAll()).resolves.toEqual(users);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, UsersController.prototype.findAll),
    ).toContain(AdminGuard);
  });

  it('delegates role updates to the protected service contract', async () => {
    const updated = { ...authenticatedUser, role: Role.ADMIN };
    usersService.updateUserRole.mockResolvedValue(updated);

    await expect(
      controller.updateRole(1, { role: Role.ADMIN }),
    ).resolves.toEqual(updated);
    expect(usersService.updateUserRole).toHaveBeenCalledWith(1, Role.ADMIN);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        UsersController.prototype.updateRole,
      ),
    ).toContain(AdminGuard);
  });

  it('allows users to update their own profile', async () => {
    usersService.updateUser.mockResolvedValue({
      ...authenticatedUser,
      name: 'New',
    });

    await controller.update(1, { name: 'New' }, authenticatedUser);
    expect(usersService.updateUser).toHaveBeenCalledWith(1, { name: 'New' });
  });

  it('rejects profile updates for another user', async () => {
    await expect(
      controller.update(2, { name: 'New' }, authenticatedUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(usersService.updateUser).not.toHaveBeenCalled();
  });
});
