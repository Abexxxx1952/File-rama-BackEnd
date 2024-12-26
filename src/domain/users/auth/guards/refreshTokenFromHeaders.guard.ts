import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshTokenFromHeadersAuthGuard extends AuthGuard(
  'refreshFromHeaders',
) {}
