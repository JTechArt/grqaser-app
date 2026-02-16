import {mapApiBookToBook} from '../../src/services/bookMapper';

describe('bookMapper', () => {
  describe('mapApiBookToBook', () => {
    it('maps snake_case API book to camelCase Book with duration in seconds', () => {
      const api = {
        id: 42,
        title: 'Test Book',
        author: 'Test Author',
        description: 'A description',
        cover_image_url: 'https://example.com/cover.jpg',
        main_audio_url: 'https://example.com/audio.mp3',
        duration: 30,
        type: 'audiobook',
        language: 'hy',
        category: 'Fiction',
        rating: 4.5,
        rating_count: 10,
      };
      const book = mapApiBookToBook(api);
      expect(book.id).toBe('42');
      expect(book.title).toBe('Test Book');
      expect(book.author).toBe('Test Author');
      expect(book.coverImage).toBe('https://example.com/cover.jpg');
      expect(book.audioUrl).toBe('https://example.com/audio.mp3');
      expect(book.duration).toBe(1800);
      expect(book.type).toBe('audiobook');
      expect(book.language).toBe('hy');
      expect(book.category).toBe('Fiction');
      expect(book.rating).toBe(4.5);
      expect(book.ratingCount).toBe(10);
    });

    it('treats type ebook as ebook', () => {
      const book = mapApiBookToBook({
        id: 1,
        title: 'Ebook',
        type: 'ebook',
      });
      expect(book.type).toBe('ebook');
    });

    it('defaults missing fields', () => {
      const book = mapApiBookToBook({
        id: 1,
        title: 'Minimal',
      });
      expect(book.author).toBe('Unknown Author');
      expect(book.language).toBe('hy');
      expect(book.category).toBe('Unknown');
      expect(book.duration).toBe(0);
      expect(book.type).toBe('audiobook');
    });
  });
});
