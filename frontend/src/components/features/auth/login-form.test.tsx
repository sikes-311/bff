import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';
import { vi } from 'vitest';

// useAuth モック
const mockLogin = vi.fn();
const mockPush = vi.fn();

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ login: mockLogin, user: null, isLoading: false, logout: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: メールとパスワードの入力フィールドが表示される', () => {
    // Arrange & Act
    render(<LoginForm />);

    // Assert
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ログイン/i })).toBeInTheDocument();
  });

  it('異常系: 空のフォームをサブミットするとバリデーションエラーが表示される', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LoginForm />);

    // Act
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/有効なメールアドレス/i)).toBeInTheDocument();
    });
  });

  it('正常系: 正しい値でサブミットするとloginが呼ばれリダイレクトされる', async () => {
    // Arrange
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginForm />);

    // Act
    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'password123');
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    // Assert
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/users');
    });
  });

  it('異常系: login失敗でエラーメッセージが表示される', async () => {
    // Arrange
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('認証失敗'));
    render(<LoginForm />);

    // Act
    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'password123');
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/メールアドレスまたはパスワードが正しくありません/i)).toBeInTheDocument();
    });
  });
});
