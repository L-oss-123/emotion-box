import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MemoryCardForm } from '@/types/memory';
import { memoryCardService } from '@/services/memoryCards';
import { useAuth } from '@/providers/AuthProvider';

export const UploadPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [form, setForm] = useState<MemoryCardForm>({ content: '', tags: [], media_type: 'none' });
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTag = () => {
    if (!tagInput.trim()) return;
    setForm((prev) => ({ ...prev, tags: [...new Set([...prev.tags, tagInput.trim()])] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.user) return;
    setSubmitting(true);
    setError(null);
    try {
      await memoryCardService.create(form, session.user.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
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

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-600">媒体文件（可选）</label>
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setForm((prev) => ({
                ...prev,
                media_file: file ?? undefined,
                media_type: file ? (file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : 'video') : 'none'
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
            <button
              type="button"
              onClick={addTag}
              className="rounded-2xl bg-ink-800 px-4 py-2 text-sm text-white"
            >
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-gradient-to-r from-ink-800 to-ink-600 px-4 py-3 text-white shadow-xl disabled:opacity-50"
        >
          {submitting ? '保存中...' : '保存纪念卡片'}
        </button>
      </form>

      <aside className="space-y-4 rounded-[32px] border border-dashed border-ink-200 p-6 text-sm text-ink-600">
        <h3 className="text-lg font-semibold text-ink-800">发布指南</h3>
        <ul className="list-disc space-y-2 pl-5">
          <li>文字支持 Markdown 的基础语法（加粗、引用、换行）。</li>
          <li>媒体文件会存入 Supabase Storage「memory-media」bucket。</li>
          <li>设置为私密后，仅自己可见；否则会展示在瀑布流首页。</li>
          <li>标签可用于过滤与检索，建议 3 个以内，简短有力。</li>
        </ul>
      </aside>
    </section>
  );
};

