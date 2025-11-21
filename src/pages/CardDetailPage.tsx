import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { MemoryCard } from '@/types/memory';
import { memoryCardService } from '@/services/memoryCards';
import dayjs from 'dayjs';
import { useAuth } from '@/providers/AuthProvider';

export const CardDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [card, setCard] = useState<MemoryCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await memoryCardService.getById(id, session?.user.id);
        setCard(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, session?.user?.id]);

  if (loading) return <p className="text-center text-ink-500">载入中...</p>;
  if (!card) return <p className="text-center text-ink-400">卡片不存在或已被删除。</p>;
  const isOwner = session?.user?.id === card.owner;

  const handleDelete = async () => {
    if (!isOwner || !id || actionLoading) return;
    const confirmed = window.confirm('确定删除这张纪念卡片吗？');
    if (!confirmed) return;
    setActionLoading(true);
    try {
      await memoryCardService.remove(id, session!.user.id);
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <article className="glass-panel space-y-6 rounded-[32px] p-8">
      <button className="text-sm text-ink-500 hover:text-ink-800" onClick={() => navigate(-1)}>
        ← 返回
      </button>
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-400">
          {dayjs(card.created_at).format('YYYY / MM / DD')}
        </p>
        <h1 className="text-3xl font-semibold text-ink-900">{card.title ?? '无题'}</h1>
        <div className="flex flex-wrap gap-2">
          {card.tags?.map(
            (tag) =>
              tag && (
                <span key={tag.id} className="rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-600">
                  #{tag.name}
                </span>
              )
          )}
        </div>
      </header>
      <p className="whitespace-pre-wrap text-lg leading-relaxed text-ink-700">{card.content}</p>
      {card.media_url && card.media_type !== 'none' && (
        <div className="overflow-hidden rounded-[28px] border border-ink-100">
          {card.media_type === 'image' && (
            <img src={card.media_url} alt={card.title ?? ''} className="w-full" />
          )}
          {card.media_type === 'audio' && (
            <audio controls className="w-full">
              <source src={card.media_url} />
            </audio>
          )}
          {card.media_type === 'video' && (
            <video controls className="w-full">
              <source src={card.media_url} />
            </video>
          )}
        </div>
      )}
      {isOwner && (
        <div className="flex gap-3 pt-2">
          <button
            className="rounded-2xl border border-ink-200 px-4 py-2 text-sm text-ink-600"
            onClick={() => navigate(`/card/${card.id}/edit`)}
          >
            编辑
          </button>
          <button
            className="rounded-2xl border border-red-200 px-4 py-2 text-sm text-red-600"
            onClick={handleDelete}
            disabled={actionLoading}
          >
            删除
          </button>
        </div>
      )}
    </article>
  );
};

