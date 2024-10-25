import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create.user.dto';
import { Role } from '@prisma/client';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    createUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    usersController = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(usersController).toBeDefined();
  });

  describe('signup', () => {
    it('should create a user and return the created user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'plain_password',
        role: Role.USER,
      };

      const createdUser = { id: 1, ...createUserDto, password: 'hashed_password' };
      mockUsersService.createUser.mockResolvedValue(createdUser);

      const result = await usersController.signup(createUserDto);
      expect(result).toEqual(createdUser);
      expect(mockUsersService.createUser).toHaveBeenCalledWith(createUserDto);
    });
  });
});
