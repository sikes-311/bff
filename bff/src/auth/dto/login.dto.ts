import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'test@example.com' })
  email!: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'password123' })
  password!: string;
}
