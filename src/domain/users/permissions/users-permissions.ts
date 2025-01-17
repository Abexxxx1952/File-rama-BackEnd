import { FilesPermission } from '../../filesSystem/permissions/files-permissions';

export const UsersPermissions = {
  ...FilesPermission,
};

type UsersPermissionsType = typeof UsersPermissions;

export type UsersPermissionsKeys = keyof UsersPermissionsType;
