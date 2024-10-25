import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly usersService: UsersService;
  private readonly configService: ConfigService;
  private userCache: { [key: string]: any } = {};

  constructor(usersService: UsersService, configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET_KEY'),
    });
    this.usersService = usersService;
    this.configService = configService;
  }

  async validate(payload: any) {
    const userId = payload.sub;
    if (this.userCache[userId]) {
      return this.userCache[userId];
    }

    const user = await this.usersService.findUserByEmail(payload.email);
    if (!user) {
      return null; // If user not found, return null
    }

    this.userCache[userId] = {
      userId: payload.sub,
      username: payload.name,
      role: payload.role,
      email: payload.email,
    };

    return this.userCache[userId];
  }
}