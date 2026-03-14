import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { UsersService } from './users.service';
import { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';

const createAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as AxiosResponse['config'],
});

const createAxiosError = (status: number): AxiosError => {
  const error = new AxiosError();
  error.response = {
    status,
    data: {},
    statusText: String(status),
    headers: {},
    config: { headers: {} } as AxiosResponse['config'],
  };
  return error;
};

describe('UsersService', () => {
  let service: UsersService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('正常系: ダウンストリームサービスのレスポンスを返す', async () => {
      // Arrange
      const mockResponse: UsersListResponseDto = {
        items: [{ id: '1', name: 'Alice', email: 'alice@example.com', role: 'user', createdAt: '2024-01-01' }],
        total: 1,
        page: 1,
        limit: 20,
      };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockResponse)));

      // Act
      const result = await service.getUsers({ page: 1, limit: 20 });

      // Assert
      expect(result).toEqual(mockResponse);
      expect(httpService.get).toHaveBeenCalledWith('/users', { params: { page: 1, limit: 20 } });
    });

    it('異常系: ダウンストリームサービスが500の場合InternalServerErrorExceptionをスロー', async () => {
      // Arrange
      httpService.get.mockReturnValue(throwError(() => createAxiosError(500)));

      // Act & Assert
      await expect(service.getUsers({})).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getUserById', () => {
    it('正常系: IDに対応するユーザーを返す', async () => {
      // Arrange
      const mockUser: UserResponseDto = {
        id: '1', name: 'Alice', email: 'alice@example.com', role: 'user', createdAt: '2024-01-01',
      };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockUser)));

      // Act
      const result = await service.getUserById('1');

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('異常系: 存在しないIDの場合NotFoundExceptionをスロー', async () => {
      // Arrange
      httpService.get.mockReturnValue(throwError(() => createAxiosError(404)));

      // Act & Assert
      await expect(service.getUserById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('異常系: ダウンストリームサービスエラーでInternalServerErrorExceptionをスロー', async () => {
      // Arrange
      httpService.get.mockReturnValue(throwError(() => createAxiosError(500)));

      // Act & Assert
      await expect(service.getUserById('1')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
