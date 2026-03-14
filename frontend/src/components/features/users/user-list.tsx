'use client';

import { useUsers } from '@/hooks/use-users';
import { UserCard } from './user-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useRouter } from 'next/navigation';

export function UserList() {
  const { data, isLoading, error } = useUsers();
  const router = useRouter();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-red-600">ユーザーの取得に失敗しました</p>;
  if (!data?.items.length) return <p className="text-gray-500">ユーザーが見つかりません</p>;

  return (
    <div className="space-y-3">
      {data.items.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onSelect={(id) => router.push(`/users/${id}`)}
        />
      ))}
    </div>
  );
}
