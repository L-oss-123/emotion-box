export type MediaType = 'image' | 'audio' | 'video' | 'none';

export interface Tag {
  id: number;
  name: string;
  created_at?: string;
}

export interface MemoryCard {
  id: string;
  owner: string;
  title?: string | null;
  content: string;
  media_url?: string | null;
  media_type: MediaType;
  is_private: boolean;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  favorite_count?: number;
}

export interface MemoryCardForm {
  title?: string;
  content: string;
  is_private?: boolean;
  pinned?: boolean;
  media_file?: File | null;
  media_type?: MediaType;
  tags: string[];
  remove_media?: boolean;
}

