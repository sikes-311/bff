import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

// NOTE: 実際にはダウンストリームサービスで認証する
// ここはBFFのパススルー認証サンプル
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // TODO: ダウンストリームの認証サービスへリクエスト
    // 現在はサンプル実装（テスト用固定ユーザー）
    if (
      loginDto.email !== 'test@example.com' ||
      loginDto.password !== 'password123'
    ) {
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    }

    const payload = { sub: 'user-1', email: loginDto.email, role: 'user' };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
      }>(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      const accessToken = this.jwtService.sign(newPayload);
      return { accessToken, refreshToken };
    } catch {
      throw new UnauthorizedException('リフレッシュトークンが無効です');
    }
  }
}
