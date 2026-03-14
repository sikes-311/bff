import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserCard } from './user-card';
import { vi } from 'vitest';
import type { User } from '@/types/user';

const mockUser: User = {
  id: '1',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('UserCard', () => {
  it('正常系: ユーザー名とメールアドレスが表示される', () => {
    // Arrange & Act
    render(<UserCard user={mockUser} />);

    // Assert
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('正常系: クリックするとonSelectが呼ばれる', async () => {
    // Arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<UserCard user={mockUser} onSelect={onSelect} />);

    // Act
    await user.click(screen.getByRole('button'));

    // Assert
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('正常系: onSelectが未指定でもクリックしてもエラーにならない', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<UserCard user={mockUser} />);

    // Act & Assert (エラーが発生しないことを確認)
    await expect(user.click(screen.getByRole('button'))).resolves.not.toThrow();
  });
});
