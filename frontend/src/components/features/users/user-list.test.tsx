import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { UserList } from './user-list';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// API関数をモック
vi.mock('@/lib/api/users', () => ({
  fetchUsers: vi.fn(),
  fetchUserById: vi.fn(),
}));

import { fetchUsers } from '@/lib/api/users';

const mockUsers = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user', createdAt: '2024-01-02T00:00:00Z' },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: ユーザー一覧が表示される', async () => {
    // Arrange
    vi.mocked(fetchUsers).mockResolvedValue({
      items: mockUsers,
      total: 2,
      page: 1,
      limit: 20,
    });

    // Act
    render(<UserList />, { wrapper: createWrapper() });

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('異常系: エラー時にエラーメッセージが表示される', async () => {
    // Arrange
    vi.mocked(fetchUsers).mockRejectedValue(new Error('サーバーエラー'));

    // Act
    render(<UserList />, { wrapper: createWrapper() });

    // Assert
    await waitFor(() => {
      expect(screen.getByText('ユーザーの取得に失敗しました')).toBeInTheDocument();
    });
  });
});
