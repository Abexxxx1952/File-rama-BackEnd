import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { validateOrReject } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { AttachedUser } from '../types/attachedUser';
import { LoginLocalUserDto } from '../../dto/loginUserLocal.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(
    email: LoginLocalUserDto['email'],
    password: LoginLocalUserDto['password'],
  ): Promise<AttachedUser> {
    const loginDto = plainToClass(LoginLocalUserDto, { email, password });
    try {
      await validateOrReject(loginDto);
    } catch (errors) {
      throw new BadRequestException(
        errors.map((error: any) => error.toString()),
      );
    }

    return await this.authService.validateUserLocal(email, password);
  }
}
