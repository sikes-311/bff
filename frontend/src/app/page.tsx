import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">BFF Application</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/users"
            className="p-6 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">ユーザー管理</h2>
            <p className="text-gray-600">ユーザーの一覧・詳細を表示します</p>
          </Link>
          <Link
            href="/login"
            className="p-6 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">ログイン</h2>
            <p className="text-gray-600">アプリケーションにログインします</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
