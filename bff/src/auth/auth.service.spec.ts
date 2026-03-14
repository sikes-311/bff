import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config: Record<string, string> = {
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '1h',
                'jwt.refreshExpiresIn': '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('正常系: 正しい資格情報でaccessTokenとrefreshTokenを返す', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-access-token');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'test@example.com', role: 'user' },
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'test@example.com', role: 'user' },
        { secret: 'test-secret', expiresIn: '7d' },
      );
    });

    it('異常系: 誤ったメールアドレスでUnauthorizedExceptionをスロー', async () => {
      // Arrange
      const loginDto = { email: 'wrong@example.com', password: 'password123' };

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('異常系: 誤ったパスワードでUnauthorizedExceptionをスロー', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('正常系: 有効なリフレッシュトークンで新しいaccessTokenを返す', async () => {
      // Arrange
      const mockPayload = { sub: 'user-1', email: 'test@example.com', role: 'user' };
      jwtService.verify.mockReturnValue(mockPayload);

      // Act
      const result = await service.refreshToken('valid-refresh-token');

      // Assert
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('valid-refresh-token');
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload);
    });

    it('異常系: 無効なリフレッシュトークンでUnauthorizedExceptionをスロー', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => { throw new Error('invalid token'); });

      // Act & Assert
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
