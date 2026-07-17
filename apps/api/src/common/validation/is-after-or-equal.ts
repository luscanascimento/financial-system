import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Cross-field validator: the decorated ISO date must be greater than or equal
 * to the value of `property` on the same object (when both are present). Used to
 * reject inverted date ranges (`to` before `from`) at the DTO boundary.
 */
export function IsAfterOrEqual(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function registerIsAfterOrEqual(object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterOrEqual',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedName] = args.constraints as [string];
          const related = (args.object as Record<string, unknown>)[relatedName];
          if (
            value === undefined ||
            value === null ||
            related === undefined ||
            related === null
          ) {
            return true; // presence is enforced by other decorators
          }
          const end = new Date(String(value)).getTime();
          const start = new Date(String(related)).getTime();
          if (Number.isNaN(end) || Number.isNaN(start)) {
            return true; // format is enforced by @IsISO8601
          }
          return end >= start;
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedName] = args.constraints as [string];
          return `${args.property} must be the same as or after ${relatedName}`;
        },
      },
    });
  };
}
