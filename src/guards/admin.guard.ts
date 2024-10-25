import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const isAuthenticated = await super.canActivate(context) as boolean;

    // Check if the user is present in the request
    const user = request.user;
    if (!isAuthenticated || !user) {
      throw new UnauthorizedException('User  not authenticated');
    }

    // Check if the user has admin role
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true; // User is authenticated and is an admin
  }
}