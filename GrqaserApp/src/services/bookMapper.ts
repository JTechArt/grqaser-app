/**
 * Maps database-viewer API book shape (snake_case, duration in minutes)
 * to app Book type (camelCase, duration in seconds).
 * Aligns with docs/architecture/data-models-and-schema.md.
 */
import {Book} from '../types/book';

export interface ApiBook {
  id: number | string;
  title: string;
  author?: string;
  description?: string | null;
  cover_image_url?: string | null;
  main_audio_url?: string | null;
  duration?: number | null;
  duration_formatted?: string;
  type?: string;
  language?: string;
  category?: string;
  rating?: number | null;
  rating_count?: number | null;
  download_url?: string | null;
  file_size?: number | null;
  published_at?: string | null;
  [key: string]: unknown;
}

export function mapApiBookToBook(api: ApiBook): Book {
  const durationMinutes = api.duration ?? 0;
  return {
    id: String(api.id),
    title: api.title ?? '',
    author: api.author ?? 'Unknown Author',
    description: api.description ?? undefined,
    coverImage: api.cover_image_url ?? undefined,
    audioUrl: api.main_audio_url ?? undefined,
    duration: durationMinutes * 60,
    language: api.language ?? 'hy',
    type: api.type === 'ebook' ? 'ebook' : 'audiobook',
    category: api.category ?? 'Unknown',
    rating: api.rating ?? undefined,
    ratingCount: api.rating_count ?? undefined,
    downloadUrl: api.download_url ?? undefined,
    fileSize: api.file_size ?? undefined,
    publishedAt: api.published_at ?? undefined,
  };
}
