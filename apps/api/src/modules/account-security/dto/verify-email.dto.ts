import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'The raw email-verification token from the link.',
  })
  @IsString()
  @MinLength(1)
  token!: string;
}
