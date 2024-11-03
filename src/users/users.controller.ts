import { Body, Controller, Post, Put, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create.user.dto';
import { UpdateUserDto } from './dto/update.user.dto';
import { JwtAuthGuard } from '../guards/jwtauth.guard';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '../auth/decorators/user.decorator';
import { UserEntity } from '../users/users.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 409, description: 'User with this email already exists.' })
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put(':id')
  @ApiResponse({ status: 200, description: 'User  successfully updated.' })
  @ApiResponse({ status: 404, description: 'User  not found.' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @User () user: UserEntity) {
    if (user.id !== +id) {
      throw new ForbiddenException('You are not allowed to update this user profile');
    }
    return this.usersService.updateUser (+id, updateUserDto);
  }
}
