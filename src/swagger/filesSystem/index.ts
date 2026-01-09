import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { PaginationParamsArgs } from '../types/paginationParams';
import { CreateFileArgs } from './types/create-file';
import { CreateFilePermissionsArgs } from './types/create-file-permissions';
import { CreateFolderArgs } from './types/create-folder';
import { DeleteFileArgs } from './types/delete-file.dto';
import { DeleteFolderArgs } from './types/delete-folder.dto';
import { DownloadFileArgs } from './types/download-file.dto';
import { FileModel } from './types/file';
import {
  FileUploadCompleteModel,
  FileUploadFailedResultModel,
} from './types/file-upload-result';
import {
  FileChangeResultModel,
  FolderChangeResultModel,
} from './types/fileSystemItem-change-result';
import { FindFilesByConditionWithPaginationParamsArgs } from './types/find-files-by-string-condition';
import { FolderModel } from './types/folder';
import { UpdateFileArgs } from './types/update-file.dto';
import { UpdateFolderArgs } from './types/update-folder.dto';

export function ApiFilesSystemGet() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Get all user files and folders. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiQuery({
      name: 'parentFolderId',
      type: String,
      required: false,
      description: 'ID of the parent folder (optional)',
    })(target, propertyKey, descriptor);
    ApiQuery({ type: PaginationParamsArgs })(target, propertyKey, descriptor);
    ApiExtraModels(FileModel, FolderModel);
    ApiResponse({
      status: 200,
      description: 'Got user files and folders',
      schema: {
        type: 'array',
        items: {
          anyOf: [
            { $ref: getSchemaPath(FileModel) },
            { $ref: getSchemaPath(FolderModel) },
          ],
        },
      },
      example: [
        {
          id: 'ba3e64a0-4e2d-4a4e-8924-195e06020a1b',
          folderName: 'Frst Folder',
          userId: '813e0c7d-cd82-4ebc-8447-8d2a59d66f95',
          parentFolderId: null,
        },
        {
          id: '7978ab52-d214-4f7d-b894-66e7eb8ed269',
          userId: '813e0c7d-cd82-4ebc-8447-8d2a59d66f95',
          fileUrl:
            'https://drive.google.com/file/d/1gfxg4JdtiuihHop1yCnEbmwM_COVLZo-/view?usp=drivesdk',
          fileDownloadUrl:
            'https://drive.google.com/uc?id=1gfxg4JdtiuihHop1yCnEbmwM_COVLZo-&export=download',
          fileName:
            'rimkhamart1_Mechanical_PhoenixCreate_a_futuristic_robotic_versi_d8bb0f01-fce3-4f11-8c77-cb1083cda2ef(1) (1).png',
          fileExtension: 'png',
          fileSize: 1677427,
          parentFolderId: null,
          fileGoogleDriveId: '1gfxg4JdtiuihHop1yCnEbmwM_COVLZo-',
          fileGoogleDriveParentFolderId: '1kM_yeDo1Ib3cWGWNRvugWsXeHGxuUS_F',
          fileGoogleDriveClientEmail:
            'google-drive@fiery-booth-447215-n7.iam.gserviceaccount.com',
          uploadDate: '2025-01-20T12:50:28.010Z',
          fileDescription: null,
          isPublic: false,
        },
        {
          id: 'fb3bc694-1bd7-443b-9d0f-92b23cc690d3',
          userId: '813e0c7d-cd82-4ebc-8447-8d2a59d66f95',
          fileUrl:
            'https://drive.google.com/file/d/1y59NXgEclDDwjkk8OE7iPbA6oJJfuqcx/view?usp=drivesdk',
          fileDownloadUrl:
            'https://drive.google.com/uc?id=1y59NXgEclDDwjkk8OE7iPbA6oJJfuqcx&export=download',
          fileName:
            'rimkhamart1_Mechanical_PhoenixCreate_a_futuristic_robotic_versi_d8bb0f01-fce3-4f11-8c77-cb1083cda2ef(1).png',
          fileExtension: 'png',
          fileSize: 1677427,
          parentFolderId: null,
          fileGoogleDriveId: '1y59NXgEclDDwjkk8OE7iPbA6oJJfuqcx',
          fileGoogleDriveParentFolderId: '1kM_yeDo1Ib3cWGWNRvugWsXeHGxuUS_F',
          fileGoogleDriveClientEmail:
            'google-drive@fiery-booth-447215-n7.iam.gserviceaccount.com',
          uploadDate: '2025-01-20T12:43:10.817Z',
          fileDescription: null,
          isPublic: false,
        },
      ],
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 404,
      description: 'Users not found',
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

export function ApiFilesSystemsGetFindFileById() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Get file by id. (AccessToken required)' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiParam({
      name: 'id',
      type: 'UUID',
      example: '11218517-4043-53b0-8c7a-0e9190c419e7',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Got the file',
      type: FileModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 404,
      description: 'File not found',
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

export function ApiFilesSystemsGetFindFolderById() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({ summary: 'Get folder by id. (AccessToken required)' })(
      target,
      propertyKey,
      descriptor,
    );
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiParam({
      name: 'id',
      type: 'UUID',
      example: '11218517-4043-53b0-8c7a-0e9190c419e7',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Got the folder',
      type: FolderModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 404,
      description: 'Folder not found',
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

export function ApiFilesSystemGetFindPublicFiles() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Get all public files and folders.',
    })(target, propertyKey, descriptor);
    ApiQuery({ type: FindFilesByConditionWithPaginationParamsArgs })(
      target,
      propertyKey,
      descriptor,
    );
    ApiResponse({
      status: 200,
      description: 'Got the files',
      type: [FileModel],
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
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
      status: 401,
      description: 'Unauthorized',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 404,
      description: 'Files not found',
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

export function ApiFilesSystemPostCreateFile() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Create file. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiQuery({ type: CreateFileArgs })(target, propertyKey, descriptor);
    ApiExtraModels(FileUploadCompleteModel, FileUploadFailedResultModel);
    ApiResponse({
      status: 201,
      description: 'File was created',
      schema: {
        oneOf: [
          { $ref: getSchemaPath(FileUploadCompleteModel) },
          { $ref: getSchemaPath(FileUploadFailedResultModel) },
        ],
      },
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemPostCreateFolder() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Create folder. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiBody({ type: CreateFolderArgs })(target, propertyKey, descriptor);
    ApiResponse({
      status: 201,
      description: 'Folder was created',
      type: FolderModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemGetDownloadFile() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Download file. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiOkResponse({
      description: 'Binary file stream',
      schema: {
        type: 'string',
        format: 'binary',
      },
    })(target, propertyKey, descriptor);
    ApiProduces('application/octet-stream')(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemGetStreamPublicFile() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Stream file.',
    })(target, propertyKey, descriptor);

    ApiOkResponse({
      description: 'Binary file stream',
      schema: {
        type: 'string',
        format: 'binary',
      },
    })(target, propertyKey, descriptor);
    ApiProduces('application/octet-stream')(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemPatchCreateFilePublicPermissions() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Create file permissions. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiBody({ type: CreateFilePermissionsArgs })(
      target,
      propertyKey,
      descriptor,
    );
    ApiResponse({
      status: 200,
      description: 'Permission created successfully',
      type: FileModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemPatchDeleteFilePublicPermissions() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Delete file permissions. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Permission deleted successfully',
      type: FileModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemPatchUpdateFile() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Update file. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiBody({ type: UpdateFileArgs })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'File updated successfully',
      type: FileModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemPatchUpdateFolder() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Update folder. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiBody({ type: UpdateFolderArgs })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'Folder updated successfully',
      type: FolderModel,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemPatchUpdateMany() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Update many files and/or folders. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiExtraModels(UpdateFileArgs, UpdateFolderArgs);
    ApiBody({
      schema: {
        type: 'array',
        items: {
          oneOf: [
            { $ref: getSchemaPath(UpdateFileArgs) },
            { $ref: getSchemaPath(UpdateFolderArgs) },
          ],
        },
      },
    })(target, propertyKey, descriptor);
    ApiExtraModels(FileChangeResultModel, FolderChangeResultModel);
    ApiResponse({
      status: 200,
      description: 'Files and/or folders updates successfully',
      schema: {
        type: 'array',
        items: {
          oneOf: [
            { $ref: getSchemaPath(FileChangeResultModel) },
            { $ref: getSchemaPath(FolderChangeResultModel) },
          ],
        },
      },
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 400,
      description: 'Bad Request',
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
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

export function ApiFilesSystemDeleteDeleteFile() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Delete file. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiBody({
      type: DeleteFileArgs,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'File deleted',
      type: FileModel,
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

export function ApiFilesSystemDeleteDeleteFolder() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Delete folder. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiBody({
      type: DeleteFolderArgs,
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: 200,
      description: 'File deleted',
      type: FolderModel,
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

export function ApiFilesSystemDeleteDeleteMany() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiOperation({
      summary: 'Delete many files and/or folders. (AccessToken required)',
    })(target, propertyKey, descriptor);
    ApiCookieAuth('access_token')(target, propertyKey, descriptor);
    ApiBearerAuth('authorization')(target, propertyKey, descriptor);
    ApiExtraModels(DeleteFileArgs, DeleteFolderArgs);
    ApiBody({
      schema: {
        type: 'array',
        items: {
          oneOf: [
            { $ref: getSchemaPath(DeleteFileArgs) },
            { $ref: getSchemaPath(DeleteFolderArgs) },
          ],
        },
      },
    })(target, propertyKey, descriptor);
    ApiExtraModels(FileChangeResultModel, FolderChangeResultModel);
    ApiResponse({
      status: 200,
      description: 'Files and/or folders deleted successfully',
      schema: {
        type: 'array',
        items: {
          oneOf: [
            { $ref: getSchemaPath(FileChangeResultModel) },
            { $ref: getSchemaPath(FolderChangeResultModel) },
          ],
        },
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
