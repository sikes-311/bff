import axios from 'axios';
import { AuthTokens, LoginCredentials } from '@/types/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function login(credentials: LoginCredentials): Promise<AuthTokens> {
  const response = await axios.post<{ data: AuthTokens }>(
    `${BASE_URL}/auth/login`,
    credentials,
  );
  return response.data.data;
}

export async function refreshToken(refreshToken: string): Promise<AuthTokens> {
  const response = await axios.post<{ data: AuthTokens }>(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
  );
  return response.data.data;
}

export async function logout(): Promise<void> {
  await axios.post(`${BASE_URL}/auth/logout`);
}
