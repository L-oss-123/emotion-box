import { supabase } from '@/lib/supabaseClient';
import type { MemoryCard, MemoryCardForm, Tag } from '@/types/memory';

const MEMORY_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET ?? 'memory-media';

const mapCard = (row: any): MemoryCard => ({
  id: row.id,
  owner: row.owner,
  title: row.title,
  content: row.content,
  media_url: row.media_url,
  media_type: row.media_type,
  is_private: row.is_private,
  pinned: row.pinned,
  created_at: row.created_at,
  updated_at: row.updated_at,
  tags:
    row.memory_card_tags
      ?.map((link: any) => (link?.tags ? { id: link.tags.id, name: link.tags.name } : null))
      .filter(Boolean) ?? []
});

export interface ListOptions {
  limit?: number;
  tag?: string;
  onlyMine?: boolean;
  ownerId?: string;
}

export const memoryCardService = {
  async list(options: ListOptions = {}): Promise<MemoryCard[]> {
    const query = supabase
      .from('memory_cards')
      .select(
        `
        *,
        memory_card_tags(
          tag_id,
          tags(id, name)
        )
      `
      )
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (options.limit) query.limit(options.limit);
    if (options.onlyMine && options.ownerId) {
      query.eq('owner', options.ownerId);
    } else if (options.ownerId) {
      query.or(`is_private.eq.false,owner.eq.${options.ownerId}`);
    } else {
      query.eq('is_private', false);
    }

    if (options.tag) {
      query.eq('memory_card_tags.tag_id', options.tag);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapCard);
  },

  async getById(id: string, requester?: string): Promise<MemoryCard | null> {
    const { data, error } = await supabase
      .from('memory_cards')
      .select(
        `
        *,
        memory_card_tags(
          tag_id,
          tags(id, name)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (data.is_private && requester !== data.owner) return null;
    return mapCard(data);
  },

  async fetchTags(): Promise<Tag[]> {
    const { data, error } = await supabase.from('tags').select('id, name').order('created_at');
    if (error) throw error;
    return data ?? [];
  },

  async createTagIfNeeded(name: string): Promise<Tag> {
    const normalized = name.trim();
    if (!normalized) throw new Error('标签不可为空');
    const existing = await supabase.from('tags').select('id, name').eq('name', normalized).maybeSingle();
    if (existing.data) return existing.data;
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: normalized })
      .select('id, name')
      .single();
    if (error) throw error;
    return data;
  },

  async uploadMedia(file: File, ownerId: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${ownerId}/${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage.from(MEMORY_BUCKET).upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });
    if (error) throw error;
    const { data } = supabase.storage.from(MEMORY_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  },

  async create(form: MemoryCardForm, ownerId: string): Promise<MemoryCard> {
    const payload: any = {
      owner: ownerId,
      title: form.title,
      content: form.content,
      is_private: Boolean(form.is_private),
      pinned: Boolean(form.pinned),
      media_type: form.media_type ?? 'none'
    };

    if (form.media_file) {
      payload.media_url = await this.uploadMedia(form.media_file, ownerId);
    }

    const { data, error } = await supabase.from('memory_cards').insert(payload).select('*').single();
    if (error) throw error;

    if (form.tags?.length) {
      const tags = await Promise.all(form.tags.map((tag) => this.createTagIfNeeded(tag)));
      const tagLinks = tags.map((tag) => ({ memory_card_id: data.id, tag_id: tag.id }));
      const { error: tagError } = await supabase.from('memory_card_tags').insert(tagLinks);
      if (tagError) throw tagError;
    }

    return mapCard({ ...data, memory_card_tags: [] });
  },

  async update(id: string, form: MemoryCardForm, ownerId: string): Promise<MemoryCard> {
    const payload: any = {
      title: form.title,
      content: form.content,
      is_private: Boolean(form.is_private),
      pinned: Boolean(form.pinned),
      media_type: form.media_type ?? 'none'
    };

    if (form.media_file) {
      payload.media_url = await this.uploadMedia(form.media_file, ownerId);
    } else if (form.remove_media) {
      payload.media_url = null;
      payload.media_type = 'none';
    }

    const { data, error } = await supabase
      .from('memory_cards')
      .update(payload)
      .eq('id', id)
      .eq('owner', ownerId)
      .select('*')
      .single();
    if (error) throw error;

    if (form.tags) {
      const { error: deleteError } = await supabase.from('memory_card_tags').delete().eq('memory_card_id', id);
      if (deleteError) throw deleteError;

      if (form.tags.length) {
        const tags = await Promise.all(form.tags.map((tag) => this.createTagIfNeeded(tag)));
        const tagLinks = tags.map((tag) => ({ memory_card_id: id, tag_id: tag.id }));
        const { error: insertError } = await supabase.from('memory_card_tags').insert(tagLinks);
        if (insertError) throw insertError;
        data.memory_card_tags = tagLinks.map((link, idx) => ({
          tag_id: link.tag_id,
          tags: tags[idx]
        }));
      } else {
        data.memory_card_tags = [];
      }
    }

    return mapCard(data);
  },

  async remove(id: string, ownerId: string) {
    const { error } = await supabase.from('memory_cards').delete().eq('id', id).eq('owner', ownerId);
    if (error) throw error;
  }
};

