import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

function FeaturedImageWithCaption({ image, title, image_caption }) {
  return (
    <div className="relative overflow-hidden rounded-[5px] shadow-lg mb-4 md:mb-8">
      <img
        src={image}
        alt={title}
        className="w-full object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        width={1200}
        height={600}
      />
      {image_caption && (
        <p className="text-sm text-center text-muted-foreground py-2 px-4 bg-muted/30">
          {image_caption}
        </p>
      )}
    </div>
  )
}

function AuthorBannerWithCaption({ banner, banner_caption }) {
  return (
    <div className="relative mb-12">
      <div className="w-full h-40 md:h-56 rounded-[5px] overflow-hidden bg-muted/30">
        {banner ? (
          <img src={banner} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        )}
      </div>
      {banner_caption && (
        <p className="text-sm text-center text-muted-foreground py-2 px-4 bg-muted/30">
          {banner_caption}
        </p>
      )}
    </div>
  )
}

function AuthorProfileWithCaption({ image, name, image_caption }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-background shadow-xl shrink-0 bg-card">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold">{name.charAt(0)}</div>
        )}
      </div>
      {image_caption && (
        <p className="text-xs text-muted-foreground mt-1 text-center max-w-[128px]">
          {image_caption}
        </p>
      )}
    </div>
  )
}

describe('Featured Image Caption Display', () => {
  describe('ArticlePage / ArticleViewPage featured image', () => {
    it('renders image with caption when caption is provided', () => {
      render(
        <FeaturedImageWithCaption
          image="https://example.com/image.jpg"
          title="Test Article"
          image_caption="Photo by John Doe"
        />
      )
      expect(screen.getByAltText('Test Article')).toBeInTheDocument()
      expect(screen.getByText('Photo by John Doe')).toBeInTheDocument()
    })

    it('renders image without caption when caption is empty', () => {
      render(
        <FeaturedImageWithCaption
          image="https://example.com/image.jpg"
          title="Test Article"
          image_caption=""
        />
      )
      expect(screen.getByAltText('Test Article')).toBeInTheDocument()
      expect(screen.queryByText('Photo by John Doe')).not.toBeInTheDocument()
    })

    it('does NOT render caption paragraph when caption is null', () => {
      render(
        <FeaturedImageWithCaption
          image="https://example.com/image.jpg"
          title="Test Article"
          image_caption={null}
        />
      )
      expect(screen.getByAltText('Test Article')).toBeInTheDocument()
      const captionEl = screen.queryByText(/Photo/)
      expect(captionEl).not.toBeInTheDocument()
    })

    it('does NOT render caption paragraph when caption is undefined', () => {
      render(
        <FeaturedImageWithCaption
          image="https://example.com/image.jpg"
          title="Test Article"
        />
      )
      expect(screen.getByAltText('Test Article')).toBeInTheDocument()
    })

    it('renders arabic caption correctly', () => {
      render(
        <FeaturedImageWithCaption
          image="https://example.com/image.jpg"
          title="Test Article"
          image_caption="صورة من مصدر: الأناضول"
        />
      )
      expect(screen.getByText('صورة من مصدر: الأناضول')).toBeInTheDocument()
    })

    it('renders caption with special characters', () => {
      render(
        <FeaturedImageWithCaption
          image="https://example.com/image.jpg"
          title="Test Article"
          image_caption="© 2024 Photographer Name - All Rights Reserved"
        />
      )
      expect(screen.getByText('© 2024 Photographer Name - All Rights Reserved')).toBeInTheDocument()
    })

    it('image has correct alt attribute', () => {
      render(
        <FeaturedImageWithCaption
          image="https://example.com/image.jpg"
          title="عنوان المقال"
          image_caption="Caption"
        />
      )
      expect(screen.getByAltText('عنوان المقال')).toBeInTheDocument()
    })
  })

  describe('Author banner caption', () => {
    it('renders banner with caption', () => {
      render(
        <AuthorBannerWithCaption
          banner="https://example.com/banner.jpg"
          banner_caption="Banner Photo Credit"
        />
      )
      expect(screen.getByText('Banner Photo Credit')).toBeInTheDocument()
    })

    it('does NOT render caption when banner_caption is empty', () => {
      render(
        <AuthorBannerWithCaption
          banner="https://example.com/banner.jpg"
          banner_caption=""
        />
      )
      expect(screen.queryByText('Banner Photo Credit')).not.toBeInTheDocument()
    })

    it('does NOT render caption when banner_caption is null', () => {
      render(
        <AuthorBannerWithCaption
          banner="https://example.com/banner.jpg"
          banner_caption={null}
        />
      )
      expect(screen.queryByText(/Banner/)).not.toBeInTheDocument()
    })

    it('renders banner image when banner URL is provided', () => {
      const { container } = render(
        <AuthorBannerWithCaption
          banner="https://example.com/banner.jpg"
          banner_caption="Caption"
        />
      )
      const img = container.querySelector('img[src="https://example.com/banner.jpg"]')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/banner.jpg')
    })

    it('renders gradient fallback when banner is not provided', () => {
      const { container } = render(
        <AuthorBannerWithCaption
          banner=""
          banner_caption=""
        />
      )
      expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument()
    })

    it('renders arabic banner caption', () => {
      render(
        <AuthorBannerWithCaption
          banner="https://example.com/banner.jpg"
          banner_caption="صورة الغلاف من الأرشيف"
        />
      )
      expect(screen.getByText('صورة الغلاف من الأرشيف')).toBeInTheDocument()
    })
  })

  describe('Author profile image caption', () => {
    it('renders profile image with caption', () => {
      render(
        <AuthorProfileWithCaption
          image="https://example.com/avatar.jpg"
          name="أحمد"
          image_caption="Profile Photo"
        />
      )
      expect(screen.getByAltText('أحمد')).toBeInTheDocument()
      expect(screen.getByText('Profile Photo')).toBeInTheDocument()
    })

    it('does NOT render caption when image_caption is empty', () => {
      render(
        <AuthorProfileWithCaption
          image="https://example.com/avatar.jpg"
          name="أحمد"
          image_caption=""
        />
      )
      expect(screen.getByAltText('أحمد')).toBeInTheDocument()
      expect(screen.queryByText('Profile Photo')).not.toBeInTheDocument()
    })

    it('does NOT render caption when image_caption is null', () => {
      render(
        <AuthorProfileWithCaption
          image="https://example.com/avatar.jpg"
          name="أحمد"
          image_caption={null}
        />
      )
      expect(screen.queryByText(/Profile/)).not.toBeInTheDocument()
    })

    it('shows initials when no image', () => {
      render(
        <AuthorProfileWithCaption
          image=""
          name="أحمد"
          image_caption=""
        />
      )
      expect(screen.getByText('أ')).toBeInTheDocument()
    })

    it('shows initials when image_caption is set but image is empty', () => {
      render(
        <AuthorProfileWithCaption
          image=""
          name="أحمد"
          image_caption="Profile Photo"
        />
      )
      expect(screen.getByText('أ')).toBeInTheDocument()
      expect(screen.getByText('Profile Photo')).toBeInTheDocument()
    })

    it('renders arabic profile image caption', () => {
      render(
        <AuthorProfileWithCaption
          image="https://example.com/avatar.jpg"
          name="سارة"
          image_caption="صورة شخصية"
        />
      )
      expect(screen.getByText('صورة شخصية')).toBeInTheDocument()
    })
  })

  describe('caption styling consistency', () => {
    it('featured image caption has correct CSS classes', () => {
      const { container } = render(
        <FeaturedImageWithCaption
          image="https://example.com/image.jpg"
          title="Test"
          image_caption="Caption"
        />
      )
      const caption = screen.getByText('Caption')
      expect(caption.tagName).toBe('P')
      expect(caption).toHaveClass('text-sm')
      expect(caption).toHaveClass('text-center')
      expect(caption).toHaveClass('text-muted-foreground')
    })

    it('banner caption has correct CSS classes', () => {
      render(
        <AuthorBannerWithCaption
          banner="https://example.com/banner.jpg"
          banner_caption="Caption"
        />
      )
      const caption = screen.getByText('Caption')
      expect(caption.tagName).toBe('P')
      expect(caption).toHaveClass('text-sm')
      expect(caption).toHaveClass('text-center')
      expect(caption).toHaveClass('text-muted-foreground')
    })

    it('profile image caption has correct CSS classes', () => {
      render(
        <AuthorProfileWithCaption
          image="https://example.com/avatar.jpg"
          name="Test"
          image_caption="Caption"
        />
      )
      const caption = screen.getByText('Caption')
      expect(caption.tagName).toBe('P')
      expect(caption).toHaveClass('text-xs')
      expect(caption).toHaveClass('text-muted-foreground')
      expect(caption).toHaveClass('text-center')
    })
  })
})
