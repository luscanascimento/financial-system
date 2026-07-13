import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane@financehub.dev', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'S3cure-pass!' })
  @IsString()
  @MinLength(1)
  password!: string;
}
