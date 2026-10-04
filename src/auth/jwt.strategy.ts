import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser, JwtPayload } from './types/authenticated-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET_KEY'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.usersService.findUserById(payload.sub);
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
    };
  }
}
