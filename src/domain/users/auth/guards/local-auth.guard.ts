import {
  BadRequestException,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { AuthService } from '../auth.service';
import { LoginLocalUserDto } from '../dto/loginUserLocal.dto';

@Injectable()
export class LocalAuthGuard {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email, password, twoFactorVerificationCode } = request.body;

    const loginDto = plainToClass(LoginLocalUserDto, {
      email,
      password,
      twoFactorVerificationCode,
    });

    try {
      await validateOrReject(loginDto);
    } catch (errors) {
      throw new BadRequestException(
        errors.map((error: any) => error.toString()),
      );
    }

    const user = await this.authService.validateUserLocal(
      email,
      password,
      twoFactorVerificationCode,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    request.user = user;
    return true;
  }
}
