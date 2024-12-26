import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { AccessTokenStrategy } from './strategies/accessToken.strategy';
import { RefreshTokenStrategy } from './strategies/refreshToken.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GitHubStrategy } from './strategies/gitHub.strategy';
import { AccessTokenFromHeadersStrategy } from './strategies/accessTokenFromHeaders.strategy';
import { RefreshTokenFromHeadersStrategy } from './strategies/refreshTokenFromHeaders.strategy';

@Module({
  imports: [ConfigModule, JwtModule],
  controllers: [],
  providers: [
    AuthService,
    LocalStrategy,
    AccessTokenStrategy,
    AccessTokenFromHeadersStrategy,
    RefreshTokenStrategy,
    RefreshTokenFromHeadersStrategy,
    GoogleStrategy,
    GitHubStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
