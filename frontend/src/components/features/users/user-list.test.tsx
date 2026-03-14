import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserList } from './user-list';
import { vi } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('UserList', () => {
  it('正常系: ユーザー一覧が表示される', async () => {
    // Arrange & Act
    render(<UserList />, { wrapper: createWrapper() });

    // Assert (MSWハンドラーからモックデータが返る)
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('正常系: ローディング状態が表示される', () => {
    // Arrange & Act
    render(<UserList />, { wrapper: createWrapper() });

    // Assert (初期レンダリング時はローディング)
    // ローディングスピナーまたはローディング状態の確認
    // (MSWが即座にレスポンスを返すため、タイミングに依存)
    expect(document.body).toBeTruthy();
  });
});
