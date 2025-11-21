import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { memoryCardService } from '@/services/memoryCards';
import type { MemoryCardForm } from '@/types/memory';
import { useAuth } from '@/providers/AuthProvider';

export const EditCardPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [form, setForm] = useState<MemoryCardForm>({
    content: '',
    tags: [],
    media_type: 'none'
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !session?.user) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await memoryCardService.getById(id, session.user.id);
        if (!data) {
          setError('卡片不存在或你无权查看。');
          return;
        }
        if (data.owner !== session.user.id) {
          setError('只有创建者可以编辑该卡片。');
          return;
        }
        setForm({
          title: data.title ?? '',
          content: data.content,
          is_private: data.is_private,
          pinned: data.pinned,
          media_type: data.media_type,
          tags: data.tags?.map((tag) => tag.name) ?? [],
          remove_media: false
        });
        setCurrentMediaUrl(data.media_url ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, session?.user]);

  const addTag = () => {
    if (!tagInput.trim()) return;
    setForm((prev) => ({ ...prev, tags: [...new Set([...(prev.tags ?? []), tagInput.trim()])] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !session?.user) return;
    setSaving(true);
    setError(null);
    try {
      await memoryCardService.update(id, form, session.user.id);
      navigate(`/card/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !session?.user) return;
    const confirmed = window.confirm('确定要删除这张纪念卡片吗？该操作不可撤销。');
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      await memoryCardService.remove(id, session.user.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center text-ink-500">载入卡片中...</p>;
  }

  if (error && !form.content) {
    return (
      <div className="rounded-[32px] border border-dashed border-ink-200 p-10 text-center text-ink-500">
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-400">EDIT MEMORY CARD</p>
          <h1 className="text-3xl font-semibold text-ink-900">编辑纪念卡片</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-2xl border border-ink-300 px-4 py-2 text-sm text-ink-600"
            onClick={() => navigate(-1)}
          >
            ← 返回
          </button>
          <button
            type="button"
            className="rounded-2xl border border-red-200 px-4 py-2 text-sm text-red-600"
            onClick={handleDelete}
            disabled={saving}
          >
            删除卡片
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="glass-panel space-y-6 rounded-[32px] p-8">
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-600">标题（可选）</label>
          <input
            value={form.title ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-2xl border border-ink-200 px-4 py-3 shadow-inner focus:border-ink-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-600">文字内容</label>
          <textarea
            required
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            rows={6}
            className="w-full rounded-2xl border border-ink-200 px-4 py-3 shadow-inner focus:border-ink-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-ink-200 p-4">
            <input
              type="checkbox"
              checked={form.is_private ?? false}
              onChange={(e) => setForm((prev) => ({ ...prev, is_private: e.target.checked }))}
            />
            <span className="text-sm text-ink-600">设为私密</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-ink-200 p-4">
            <input
              type="checkbox"
              checked={form.pinned ?? false}
              onChange={(e) => setForm((prev) => ({ ...prev, pinned: e.target.checked }))}
            />
            <span className="text-sm text-ink-600">置顶</span>
          </label>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-ink-600">媒体文件</label>
          {currentMediaUrl && (
            <div className="space-y-3 rounded-2xl border border-ink-100 p-4">
              <p className="text-sm text-ink-500">当前媒体预览：</p>
              {form.media_type === 'image' && (
                <img src={currentMediaUrl} alt="当前媒体" className="max-h-60 rounded-2xl object-cover" />
              )}
              {form.media_type === 'audio' && (
                <audio controls className="w-full">
                  <source src={currentMediaUrl} />
                </audio>
              )}
              {form.media_type === 'video' && (
                <video controls className="max-h-60 w-full rounded-2xl">
                  <source src={currentMediaUrl} />
                </video>
              )}
              <button
                type="button"
                className="text-sm text-red-500 underline"
                onClick={() => {
                  setForm((prev) => ({ ...prev, remove_media: true, media_file: null, media_type: 'none' }));
                  setCurrentMediaUrl(null);
                }}
              >
                移除当前媒体
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setForm((prev) => ({
                ...prev,
                media_file: file ?? undefined,
                remove_media: false,
                media_type: file
                  ? file.type.startsWith('image')
                    ? 'image'
                    : file.type.startsWith('audio')
                      ? 'audio'
                      : 'video'
                  : prev.media_type ?? 'none'
              }));
            }}
            className="w-full rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-600">标签</label>
          <div className="flex gap-3">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 rounded-2xl border border-ink-200 px-4 py-3 shadow-inner focus:border-ink-500 focus:outline-none"
              placeholder="输入标签后回车"
            />
            <button type="button" onClick={addTag} className="rounded-2xl bg-ink-800 px-4 py-2 text-sm text-white">
              添加
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {form.tags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => removeTag(tag)}
                className="rounded-full bg-ink-100 px-4 py-1 text-xs text-ink-600"
              >
                #{tag} ×
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-ink-800 to-ink-600 px-6 py-3 text-white shadow-xl disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存修改'}
          </button>
          <button
            type="button"
            className="rounded-2xl border border-ink-200 px-6 py-3 text-ink-600"
            onClick={() => navigate(`/card/${id}`)}
          >
            查看详情
          </button>
        </div>
      </form>
    </section>
  );
};


