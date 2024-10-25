import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Call the base class's canActivate method to validate the JWT
    const isAuthenticated = await super.canActivate(context) as boolean;

    // Check if the user is present in the request
    if (!isAuthenticated || !request.user) {
      throw new UnauthorizedException('User  not authenticated');
    }

    return true; // User is authenticated
  }
}