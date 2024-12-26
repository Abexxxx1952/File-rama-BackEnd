import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaginationParamsArgs } from '../types/paginationParams';
import { UserModel } from './types/user';
import { CreateUserLocalArgs } from './types/createUserLocal';
import { LoginLocalUser } from './types/loginLocalUser';
import { UpdateUserArgs } from './types/updateUser';
import { AttachedUserModel } from './types/attachedUser';
import { FindUsersByConditionWithPaginationParams } from './types/findUsersByStringCondition';
import { FindUserByConditionsArgs } from './types/findUserByConditions';

export function ApiUsersGet() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Get all users' })(target, propertyKey, descriptor);
    ApiQuery({ type: PaginationParamsArgs })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Got all users',
      type: [UserModel],
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 404,
      description: 'Users not found',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetFindById() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Get user by id' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiParam({
      name: 'id',
      type: 'UUID',
      example: '11218517-4043-53b0-8c7a-0e9190c419e7',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Got the user',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 404,
      description: 'User not found',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetFindOneBy() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Find user by condition:FindOptionsWhere' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiQuery({
      type: FindUserByConditionsArgs,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Got the user',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Invalid JSON format',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Validation failed: ',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 404,
      description: 'User not found',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetFindManyBy() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Find users by condition:FindOptionsWhere' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiQuery({
      type: FindUsersByConditionWithPaginationParams,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Got all user by condition',
      type: [UserModel],
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Invalid JSON format',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Validation failed: ',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 404,
      description: 'Users not found',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersPostRegistration() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'User registration' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiBody({ type: CreateUserLocalArgs })(target, propertyKey, descriptor);
    ApiResponse({
      status: 201,
      description: 'User is registered',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 409,
      description: 'Conflict. Email has already been taken',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}
export function ApiUsersPostLoginLocal() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Login local user' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiBody({
      type: LoginLocalUser,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'User is logged in',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersPostLogOut() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Log out user. (AccessToken required)' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'User is logged out',
      type: AttachedUserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersPostLogOutFromHeaders() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Log out user. (AccessToken required)' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiBearerAuth('Authorization')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'User is logged out',
      type: AttachedUserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersPostRefresh() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Refresh tokens. (RefreshToken required)' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiCookieAuth('refresh_token')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Tokens refreshed',
      schema: {
        type: 'string',
        example: 'Refresh Successful',
      },
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersPostRefreshFromHeaders() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Refresh tokens. (RefreshToken required)' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiBearerAuth('Authorization')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Tokens refreshed',
      schema: {
        type: 'string',
        example: 'Refresh Successful',
      },
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetLoginGoogle() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Initialization login with Google user' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiResponse({
      status: 302,
      description: 'User redirected',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetLoginGoogleCallback() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Ending login with Google user' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiResponse({
      status: 301,
      description: 'User is logged in',
      type: void 0,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetLoginGitHub() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Initialization login with GitHub user' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiResponse({
      status: 302,
      description: 'User redirected',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetLoginGitHubCallback() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Ending login with GitHub user' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiResponse({
      status: 301,
      description: 'User is logged in',
      type: void 0,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetStatus() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Get user information. (AccessToken required)' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Got user information',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersGetStatusFromHeaders() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Get user information. (AccessToken required)' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiBearerAuth('Authorization')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Got user information',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersPatchUpdate() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Update user. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBody({ type: UpdateUserArgs })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'User Updated',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersPatchUpdateFromHeaders() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Update user. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiBearerAuth('Authorization')(target, propertyKey, descriptor);
    ApiBody({ type: UpdateUserArgs })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'User Updated',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersDeleteDeleteUser() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Delete user. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'User deleted',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}

export function ApiUsersDeleteDeleteUserFromHeaders() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Delete user. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiBearerAuth('Authorization')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'User deleted',
      type: UserModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 403,
      description: 'Forbidden',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 429,
      description: 'ThrottlerException: Too Many Requests',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    })(target, propertyKey, descriptor);
  };
}
