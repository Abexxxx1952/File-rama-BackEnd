import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { LoginLocalUserDto } from '../dto/loginUserLocal.dto';
import { AttachedUser } from '../types/attachedUser';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(
    email: LoginLocalUserDto['email'],
    password: LoginLocalUserDto['password'],
    twoFactorVerificationCode?: LoginLocalUserDto['twoFactorVerificationCode'],
  ): Promise<AttachedUser | { message: string }> {
    const loginDto = plainToClass(LoginLocalUserDto, { email, password });
    try {
      await validateOrReject(loginDto);
    } catch (errors) {
      throw new BadRequestException(
        errors.map((error: any) => error.toString()),
      );
    }

    return await this.authService.validateUserLocal(
      email,
      password,
      twoFactorVerificationCode,
    );
  }
}
