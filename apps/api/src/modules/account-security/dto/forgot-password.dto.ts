import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'jane@financehub.dev', format: 'email' })
  @IsEmail()
  email!: string;
}
