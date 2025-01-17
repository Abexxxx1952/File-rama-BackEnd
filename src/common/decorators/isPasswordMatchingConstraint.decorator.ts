import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateUserLocalDto } from '../../domain/users/auth/dto/register-local.dto';

@ValidatorConstraint({ name: 'IsPasswordsMatching', async: false })
export class IsPasswordsMatchingConstraint
  implements ValidatorConstraintInterface
{
  public validate(passwordRepeat: string, args: ValidationArguments) {
    const obj = args.object as CreateUserLocalDto;
    return obj.password === passwordRepeat;
  }

  public defaultMessage(validationArguments?: ValidationArguments) {
    return 'Passwords do not match';
  }
}
