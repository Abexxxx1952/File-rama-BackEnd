import { CanActivate, ExecutionContext, mixin, Type } from '@nestjs/common';
import { UsersPermissionsKeys } from '@/domain/users/permissions/users-permissions';

export const PermissionGuard = (
  routePermission: UsersPermissionsKeys[],
): Type<CanActivate> => {
  class PermissionGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      return routePermission.every((item: UsersPermissionsKeys) =>
        user?.permissions.includes(item),
      );
    }
  }

  return mixin(PermissionGuardMixin);
};
