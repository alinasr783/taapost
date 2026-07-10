import { describe, it, expect } from 'vitest'

describe('Category Form Caption Data Handling', () => {
  function createCategoryFormData(overrides = {}) {
    return {
      name: '',
      description: '',
      image: '',
      image_caption: '',
      topics: '',
      icon: '',
      order_index: 0,
      display_order: 0,
      ...overrides,
    }
  }

  function prepareCategoryDataForSave(formData) {
    return {
      name: formData.name,
      description: formData.description,
      image: formData.image,
      image_caption: formData.image_caption || null,
      topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
      icon: formData.icon || null,
      order_index: formData.order_index,
      display_order: formData.display_order,
    }
  }

  describe('form data initialization', () => {
    it('initializes with empty image_caption', () => {
      const formData = createCategoryFormData()
      expect(formData.image_caption).toBe('')
    })

    it('initializes with provided image_caption', () => {
      const formData = createCategoryFormData({ image_caption: 'Test Caption' })
      expect(formData.image_caption).toBe('Test Caption')
    })
  })

  describe('data preparation for save', () => {
    it('saves image_caption when provided', () => {
      const formData = createCategoryFormData({ image_caption: 'My Caption' })
      const dataToSave = prepareCategoryDataForSave(formData)
      expect(dataToSave.image_caption).toBe('My Caption')
    })

    it('sets image_caption to null when empty', () => {
      const formData = createCategoryFormData({ image_caption: '' })
      const dataToSave = prepareCategoryDataForSave(formData)
      expect(dataToSave.image_caption).toBeNull()
    })

    it('preserves all other fields along with image_caption', () => {
      const formData = createCategoryFormData({
        name: 'Sports',
        description: 'Sports news',
        image: 'https://example.com/sports.jpg',
        image_caption: 'Sports Section Image',
        topics: 'football, basketball',
      })
      const dataToSave = prepareCategoryDataForSave(formData)
      expect(dataToSave.name).toBe('Sports')
      expect(dataToSave.description).toBe('Sports news')
      expect(dataToSave.image).toBe('https://example.com/sports.jpg')
      expect(dataToSave.image_caption).toBe('Sports Section Image')
    })

    it('handles arabic image_caption', () => {
      const formData = createCategoryFormData({ image_caption: 'صورة قسم الرياضة' })
      const dataToSave = prepareCategoryDataForSave(formData)
      expect(dataToSave.image_caption).toBe('صورة قسم الرياضة')
    })

    it('handles long image_caption', () => {
      const longCaption = 'A'.repeat(500)
      const formData = createCategoryFormData({ image_caption: longCaption })
      const dataToSave = prepareCategoryDataForSave(formData)
      expect(dataToSave.image_caption).toBe(longCaption)
    })
  })

  describe('openForm with existing category', () => {
    it('populates image_caption from existing category', () => {
      const existingCategory = {
        id: 1,
        name: 'Sports',
        description: 'Sports news',
        image: 'https://example.com/sports.jpg',
        image_caption: 'Existing Caption',
        topics: ['football'],
        icon: 'football',
        order_index: 0,
        display_order: 0,
      }

      const formData = createCategoryFormData({
        name: existingCategory.name,
        description: existingCategory.description || '',
        image: existingCategory.image || '',
        image_caption: existingCategory.image_caption || '',
        topics: existingCategory.topics ? existingCategory.topics.join(', ') : '',
        icon: existingCategory.icon || '',
        order_index: existingCategory.order_index || 0,
        display_order: existingCategory.display_order || 0,
      })

      expect(formData.image_caption).toBe('Existing Caption')
    })

    it('handles null image_caption from existing category', () => {
      const existingCategory = {
        id: 1,
        name: 'Sports',
        description: 'Sports news',
        image: 'https://example.com/sports.jpg',
        image_caption: null,
        topics: ['football'],
      }

      const formData = createCategoryFormData({
        image_caption: existingCategory.image_caption || '',
      })

      expect(formData.image_caption).toBe('')
    })
  })
})

describe('Author Form Caption Data Handling', () => {
  function createAuthorFormData(overrides = {}) {
    return {
      id: undefined,
      name: '',
      image: '',
      image_caption: '',
      bio: '',
      role: '',
      banner: '',
      banner_caption: '',
      ...overrides,
    }
  }

  function prepareAuthorDataForSave(formData) {
    return {
      name: formData.name,
      image: formData.image,
      image_caption: formData.image_caption || null,
      banner: formData.banner,
      banner_caption: formData.banner_caption || null,
      bio: formData.bio,
      role: formData.role,
    }
  }

  describe('form data initialization', () => {
    it('initializes with empty caption fields', () => {
      const formData = createAuthorFormData()
      expect(formData.image_caption).toBe('')
      expect(formData.banner_caption).toBe('')
    })

    it('initializes with provided caption fields', () => {
      const formData = createAuthorFormData({
        image_caption: 'Author Photo',
        banner_caption: 'Author Banner',
      })
      expect(formData.image_caption).toBe('Author Photo')
      expect(formData.banner_caption).toBe('Author Banner')
    })
  })

  describe('data preparation for save', () => {
    it('saves both caption fields when provided', () => {
      const formData = createAuthorFormData({
        image_caption: 'Photo Caption',
        banner_caption: 'Banner Caption',
      })
      const dataToSave = prepareAuthorDataForSave(formData)
      expect(dataToSave.image_caption).toBe('Photo Caption')
      expect(dataToSave.banner_caption).toBe('Banner Caption')
    })

    it('sets both caption fields to null when empty', () => {
      const formData = createAuthorFormData({
        image_caption: '',
        banner_caption: '',
      })
      const dataToSave = prepareAuthorDataForSave(formData)
      expect(dataToSave.image_caption).toBeNull()
      expect(dataToSave.banner_caption).toBeNull()
    })

    it('handles one caption provided and one empty', () => {
      const formData = createAuthorFormData({
        image_caption: 'Photo Caption',
        banner_caption: '',
      })
      const dataToSave = prepareAuthorDataForSave(formData)
      expect(dataToSave.image_caption).toBe('Photo Caption')
      expect(dataToSave.banner_caption).toBeNull()
    })

    it('handles arabic caption fields', () => {
      const formData = createAuthorFormData({
        image_caption: 'صورة الكاتب',
        banner_caption: 'صورة الغلاف',
      })
      const dataToSave = prepareAuthorDataForSave(formData)
      expect(dataToSave.image_caption).toBe('صورة الكاتب')
      expect(dataToSave.banner_caption).toBe('صورة الغلاف')
    })

    it('preserves all other fields along with captions', () => {
      const formData = createAuthorFormData({
        name: 'أحمد محمد',
        image: 'https://example.com/avatar.jpg',
        image_caption: 'صورة أحمد',
        bio: 'كاتب سياسي',
        role: 'محرر',
        banner: 'https://example.com/banner.jpg',
        banner_caption: 'بانر أحمد',
      })
      const dataToSave = prepareAuthorDataForSave(formData)
      expect(dataToSave.name).toBe('أحمد محمد')
      expect(dataToSave.image).toBe('https://example.com/avatar.jpg')
      expect(dataToSave.bio).toBe('كاتب سياسي')
      expect(dataToSave.role).toBe('محرر')
      expect(dataToSave.banner).toBe('https://example.com/banner.jpg')
      expect(dataToSave.image_caption).toBe('صورة أحمد')
      expect(dataToSave.banner_caption).toBe('بانر أحمد')
    })
  })

  describe('openForm with existing author', () => {
    it('populates both caption fields from existing author', () => {
      const existingAuthor = {
        id: 1,
        name: 'Ahmed',
        image: 'https://example.com/avatar.jpg',
        image_caption: 'Existing Photo Caption',
        bio: 'Bio',
        role: 'Editor',
        banner: 'https://example.com/banner.jpg',
        banner_caption: 'Existing Banner Caption',
      }

      const formData = createAuthorFormData({
        ...existingAuthor,
        image_caption: existingAuthor.image_caption || '',
        banner_caption: existingAuthor.banner_caption || '',
      })

      expect(formData.image_caption).toBe('Existing Photo Caption')
      expect(formData.banner_caption).toBe('Existing Banner Caption')
    })

    it('handles null caption fields from existing author', () => {
      const existingAuthor = {
        id: 1,
        name: 'Ahmed',
        image: 'https://example.com/avatar.jpg',
        image_caption: null,
        bio: 'Bio',
        banner: 'https://example.com/banner.jpg',
        banner_caption: null,
      }

      const formData = createAuthorFormData({
        ...existingAuthor,
        image_caption: existingAuthor.image_caption || '',
        banner_caption: existingAuthor.banner_caption || '',
      })

      expect(formData.image_caption).toBe('')
      expect(formData.banner_caption).toBe('')
    })
  })
})
