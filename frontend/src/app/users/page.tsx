import { UserList } from '@/components/features/users/user-list';

export default function UsersPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ユーザー一覧</h1>
        <UserList />
      </div>
    </main>
  );
}
