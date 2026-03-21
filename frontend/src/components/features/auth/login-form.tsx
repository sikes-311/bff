'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setServerError(null);
      await login(data);
      router.push('/');
    } catch {
      setServerError('メールアドレスまたはパスワードが正しくありません');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 bg-white rounded-lg shadow">
      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{serverError}</p>
      )}
      <Input
        id="email"
        type="email"
        label="メールアドレス"
        placeholder="test@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        id="password"
        type="password"
        label="パスワード"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
        ログイン
      </Button>
    </form>
  );
}
