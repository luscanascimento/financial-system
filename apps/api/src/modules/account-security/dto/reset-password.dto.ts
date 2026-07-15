import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'The raw password-reset token from the link.' })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ example: 'S3cure-pass!', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
