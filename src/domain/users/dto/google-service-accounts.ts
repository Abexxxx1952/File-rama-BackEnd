import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum UpdateMode {
  CREATE = 'Create',
  UPDATE = 'Update',
  DELETE = 'Delete',
}

export class GoogleServiceAccountsDto {
  @IsString()
  @IsNotEmpty()
  clientEmail: string;

  @ValidateIf(
    (o) => o.updateMode === UpdateMode.CREATE || o.privateKey !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @IsOptional()
  @IsString()
  rootFolderId?: string;

  @IsEnum(UpdateMode)
  updateMode: UpdateMode;
}
