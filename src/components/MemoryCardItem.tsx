import dayjs from 'dayjs';
import type { MemoryCard } from '@/types/memory';

interface Props {
  card: MemoryCard;
  onClick?: (card: MemoryCard) => void;
}

export const MemoryCardItem = ({ card, onClick }: Props) => {
  const mediaPreview = () => {
    if (!card.media_url || card.media_type === 'none') return null;
    if (card.media_type === 'image') {
      return (
        <img
          src={card.media_url}
          alt={card.title ?? card.content.slice(0, 20)}
          className="h-56 w-full rounded-3xl object-cover"
        />
      );
    }
    if (card.media_type === 'audio') {
      return (
        <audio controls className="w-full">
          <source src={card.media_url} />
        </audio>
      );
    }
    return (
      <video controls className="h-56 w-full rounded-3xl object-cover">
        <source src={card.media_url} />
      </video>
    );
  };

  return (
    <article
      className="glass-panel flex cursor-pointer flex-col gap-3 rounded-[28px] p-5 transition hover:-translate-y-1 hover:shadow-2xl"
      onClick={() => onClick?.(card)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-ink-400">
        <span>{dayjs(card.created_at).format('YYYY.MM.DD HH:mm')}</span>
        {card.is_private && (
          <span className="rounded-full bg-ink-100 px-3 py-0.5 text-[10px] text-ink-500">私密</span>
        )}
      </div>
      {card.title && <h3 className="text-xl font-semibold text-ink-800">{card.title}</h3>}
      <p className="line-clamp-4 text-ink-600">{card.content}</p>
      {mediaPreview()}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {card.tags.map(
            (tag) =>
              tag && (
                <span
                  key={`${card.id}-${tag.id}`}
                  className="rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-500"
                >
                  #{tag.name}
                </span>
              )
          )}
        </div>
      )}
    </article>
  );
};

