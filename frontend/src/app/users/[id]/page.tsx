type Props = {
  params: { id: string };
};

export default function UserDetailPage({ params }: Props) {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ユーザー詳細</h1>
        <p className="text-gray-600">ユーザーID: {params.id}</p>
        {/* TODO: ユーザー詳細コンポーネントを実装 */}
      </div>
    </main>
  );
}
