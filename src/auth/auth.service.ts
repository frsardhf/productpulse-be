import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { LogoutDto } from './dto/logout.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService, 
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findUserByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      name: user.name,
      role: user.role,
      email: user.email
    };
    console.log('JWT Payload:', payload);
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
      }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async logout(logoutDto: LogoutDto) {
    console.log(`User logged out, token: ${logoutDto.access_token}`);
    return { message: 'Successfully logged out' };
  }
}