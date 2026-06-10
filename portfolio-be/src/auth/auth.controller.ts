import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /admin/login — Returns { accessToken } on success, 401 on failure (Req 14.1, 14.2).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
