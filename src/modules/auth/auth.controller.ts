import { Controller, Post, Body, Inject } from '@nestjs/common';
import { AuthService } from './auth.sevice';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor() {}

  @Inject()
  private authService: AuthService

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return { message: 'User registered successfully', user };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.login(loginDto);
    return { message: 'Login successful', user };
  }
}