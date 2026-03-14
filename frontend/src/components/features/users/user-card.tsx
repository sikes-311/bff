import { User } from '@/types/user';

type UserCardProps = {
  user: User;
  onSelect?: (id: string) => void;
};

export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <div
      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onSelect?.(user.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(user.id)}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
          {user.role}
        </span>
      </div>
    </div>
  );
}
