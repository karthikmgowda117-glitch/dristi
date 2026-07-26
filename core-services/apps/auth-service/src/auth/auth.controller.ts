import {
  Controller, Post, Get, Body, Headers, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, Public } from '@drishti/common';
import { RequestUser } from '@drishti/common';

class LoginDto {
  @ApiProperty({ example: 'priya.rao' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

class MfaVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  totpCode: string;
}

class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/v1/auth/login */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username/password (mock JWT, no Keycloak)' })
  @ApiResponse({ status: 200, description: 'Returns accessToken, refreshToken, expiresIn' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  /** POST /api/v1/auth/mfa/verify */
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP (mock: accepts any 6-digit code)' })
  @ApiBearerAuth()
  async verifyMfa(
    @Headers('authorization') authHeader: string,
    @Body() dto: MfaVerifyDto,
  ) {
    const partialToken = authHeader?.replace('Bearer ', '');
    return this.authService.verifyMfa(partialToken, dto.totpCode);
  }

  /** POST /api/v1/auth/refresh */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /** POST /api/v1/auth/logout */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all refresh tokens for current user' })
  async logout(@CurrentUser() user: RequestUser) {
    await this.authService.logout(user.userId);
  }

  /** GET /api/v1/auth/me */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info + jurisdiction path' })
  async me(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.userId);
  }
}
