import { ValidationPipe, BadRequestException } from '@nestjs/common';

/** Pre-configured global validation pipe using class-validator */
export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => {
    const messages = errors.map(
      (e) => `${e.property}: ${Object.values(e.constraints || {}).join(', ')}`,
    );
    return new BadRequestException({
      error: 'VALIDATION_ERROR',
      message: messages.join('; '),
    });
  },
});
