import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import {
  UserResponseDto,
  UsersListResponseDto,
} from './dto/user-response.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly httpService: HttpService) {}

  async getUsers(query: GetUsersQueryDto): Promise<UsersListResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UsersListResponseDto>('/users', {
          params: query,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch users from service', error);
      throw new InternalServerErrorException(
        'ユーザー一覧の取得に失敗しました',
      );
    }
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserResponseDto>(`/users/${id}`),
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new NotFoundException(
          `ユーザー(id=${id})が見つかりません`,
        );
      }
      this.logger.error(`Failed to fetch user ${id}`, error);
      throw new InternalServerErrorException(
        'ユーザー取得に失敗しました',
      );
    }
  }
}
