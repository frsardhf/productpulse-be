import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create.user.dto';
import { UpdateUserDto } from './dto/update.user.dto';
import { JwtAuthGuard } from '../guards/jwtauth.guard';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '../auth/decorators/user.decorator';
import { AdminGuard } from '../guards/admin.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  @ApiResponse({
    status: 201,
    description: 'User successfully registered.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
  })
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully.',
    type: [UserResponseDto],
  })
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAllUsers();
  }

  @Patch(':id/role')
  @UseGuards(AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully.',
    type: UserResponseDto,
  })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUserRole(id, updateUserRoleDto.role);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put(':id')
  @ApiResponse({ status: 200, description: 'User  successfully updated.' })
  @ApiResponse({ status: 404, description: 'User  not found.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not allowed to update this profile.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: AuthenticatedUser,
  ) {
    if (user.userId !== id) {
      throw new ForbiddenException(
        'You are not allowed to update this user profile',
      );
    }

    return this.usersService.updateUser(id, updateUserDto);
  }
}
