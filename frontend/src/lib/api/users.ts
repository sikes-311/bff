import { apiClient, ApiListResponse, ApiResponse } from './client';
import { User, UsersListResponse } from '@/types/user';

export type GetUsersParams = {
  page?: number;
  limit?: number;
};

export async function fetchUsers(params?: GetUsersParams): Promise<UsersListResponse> {
  const response = await apiClient.get<ApiListResponse<User>>('/users', { params });
  return response.data.data;
}

export async function fetchUserById(id: string): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
  return response.data.data;
}
