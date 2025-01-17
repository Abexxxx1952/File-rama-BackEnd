import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Readable } from 'stream';

export function IsBufferOrReadable(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsBufferOrReadable',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            value instanceof Buffer ||
            value instanceof Readable ||
            value instanceof ReadableStream
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a Buffer`;
        },
      },
    });
  };
}
