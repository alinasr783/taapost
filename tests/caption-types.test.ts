import { describe, it, expect } from 'vitest'
import type { Article, Category, Author } from '../src/lib/supabase'

describe('Caption TypeScript Types', () => {
  describe('Article type', () => {
    it('has optional image_caption field', () => {
      const article: Article = {
        id: 1,
        title: 'Test',
        excerpt: 'Test',
        content: 'Test',
        image: 'https://example.com/image.jpg',
        image_caption: 'Test Caption',
        category_id: 1,
        type: 'article',
        date: '2024-01-01',
      }
      expect(article.image_caption).toBe('Test Caption')
    })

    it('allows undefined image_caption', () => {
      const article: Article = {
        id: 1,
        title: 'Test',
        excerpt: 'Test',
        content: 'Test',
        image: 'https://example.com/image.jpg',
        category_id: 1,
        type: 'article',
        date: '2024-01-01',
      }
      expect(article.image_caption).toBeUndefined()
    })

    it('allows null image_caption', () => {
      const article: Article = {
        id: 1,
        title: 'Test',
        excerpt: 'Test',
        content: 'Test',
        image: 'https://example.com/image.jpg',
        image_caption: null,
        category_id: 1,
        type: 'article',
        date: '2024-01-01',
      }
      expect(article.image_caption).toBeNull()
    })
  })

  describe('Category type', () => {
    it('has optional image_caption field', () => {
      const category: Category = {
        id: 1,
        name: 'Test Category',
        description: 'Test',
        topics: [],
        image: 'https://example.com/image.jpg',
        image_caption: 'Category Caption',
      }
      expect(category.image_caption).toBe('Category Caption')
    })

    it('allows undefined image_caption', () => {
      const category: Category = {
        id: 1,
        name: 'Test Category',
        description: 'Test',
        topics: [],
        image: 'https://example.com/image.jpg',
      }
      expect(category.image_caption).toBeUndefined()
    })
  })

  describe('Author type', () => {
    it('has optional image_caption field', () => {
      const author: Author = {
        id: 1,
        name: 'Test Author',
        image: 'https://example.com/avatar.jpg',
        image_caption: 'Author Photo Caption',
        bio: 'Test Bio',
      }
      expect(author.image_caption).toBe('Author Photo Caption')
    })

    it('has optional banner_caption field', () => {
      const author: Author = {
        id: 1,
        name: 'Test Author',
        image: 'https://example.com/avatar.jpg',
        bio: 'Test Bio',
        banner: 'https://example.com/banner.jpg',
        banner_caption: 'Banner Caption',
      }
      expect(author.banner_caption).toBe('Banner Caption')
    })

    it('allows undefined caption fields', () => {
      const author: Author = {
        id: 1,
        name: 'Test Author',
        image: 'https://example.com/avatar.jpg',
        bio: 'Test Bio',
      }
      expect(author.image_caption).toBeUndefined()
      expect(author.banner_caption).toBeUndefined()
    })

    it('allows null caption fields', () => {
      const author: Author = {
        id: 1,
        name: 'Test Author',
        image: 'https://example.com/avatar.jpg',
        image_caption: null,
        bio: 'Test Bio',
        banner: 'https://example.com/banner.jpg',
        banner_caption: null,
      }
      expect(author.image_caption).toBeNull()
      expect(author.banner_caption).toBeNull()
    })
  })
})
