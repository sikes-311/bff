import { LoginForm } from '@/components/features/auth/login-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">ログイン</h1>
        <LoginForm />
      </div>
    </main>
  );
}
