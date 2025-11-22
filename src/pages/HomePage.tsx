import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MemoryCard, Tag } from '@/types/memory';
import { memoryCardService } from '@/services/memoryCards';
import { MemoryCardItem } from '@/components/MemoryCardItem';
import { useAuth } from '@/providers/AuthProvider';

export const HomePage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cardData, tagData] = await Promise.all([
          memoryCardService.list({ ownerId: session?.user.id, onlyMine: true }),
          memoryCardService.fetchTags()
        ]);
        setCards(cardData);
        setTags(tagData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session?.user?.id]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const hitQuery =
        !query ||
        card.title?.toLowerCase().includes(query.toLowerCase()) ||
        card.content.toLowerCase().includes(query.toLowerCase());
      const hitTag =
        !selectedTag || card.tags?.some((tag) => tag?.name === selectedTag || `${tag?.id}` === selectedTag);
      return hitQuery && hitTag;
    });
  }, [cards, query, selectedTag]);

  return (
    <section className="space-y-8">
      <header className="rounded-[32px] bg-gradient-to-r from-ink-900 to-ink-700 p-8 text-white shadow-2xl">
        <p className="text-sm uppercase tracking-[0.2em] text-white/70">PERSONAL DIGITAL MEMORIAL</p>
        <h1 className="mt-3 text-4xl font-semibold">情绪黑匣子</h1>
        <p className="mt-2 max-w-2xl text-white/80">
          以卡片的形式存放转瞬即逝的情绪片段、记忆碎片与声音。你可以保留在私密空间，也可以分享给世界。
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-ink-900">
          <button
            className="rounded-2xl bg-white/90 px-5 py-2 text-sm font-medium shadow-lg transition hover:-translate-y-0.5"
            onClick={() => navigate('/upload')}
          >
            创建纪念卡片
          </button>
          <button
            className="rounded-2xl border border-white/40 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            onClick={() => navigate('/about')}
          >
            查看介绍
          </button>
        </div>
      </header>

      <div className="glass-panel flex flex-wrap gap-4 rounded-[24px] p-5">
        <input
          type="search"
          placeholder="搜索关键字..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-2xl border border-ink-200 px-4 py-3 text-sm shadow-inner focus:border-ink-500 focus:outline-none"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-4 py-2 text-sm ${
              !selectedTag ? 'bg-ink-800 text-white' : 'bg-ink-50 text-ink-600'
            }`}
          >
            全部
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.name)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selectedTag === tag.name
                  ? 'bg-ink-800 text-white'
                  : 'bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-ink-500">加载卡片中...</p>
      ) : filteredCards.length === 0 ? (
        <p className="text-center text-ink-400">暂无匹配的卡片，创建一张新的记忆吧。</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <MemoryCardItem key={card.id} card={card} onClick={() => navigate(`/card/${card.id}`)} />
          ))}
        </div>
      )}
    </section>
  );
};

