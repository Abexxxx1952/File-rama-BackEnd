import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  mixin,
  Type,
} from '@nestjs/common';
import { UsersPermissionsKeys } from '@/domain/users/permissions/users-permissions';

export const PermissionGuard = (
  routePermission: UsersPermissionsKeys[],
): Type<CanActivate> => {
  class PermissionGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      const hasPermission = routePermission.every(
        (item: UsersPermissionsKeys) => user?.permissions.includes(item),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have the necessary permissions to access this resource.',
        );
      }

      return true;
    }
  }

  return mixin(PermissionGuardMixin);
};
