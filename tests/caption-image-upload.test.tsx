import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ImageUpload from '../src/dashboard/components/ImageUpload'

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } })),
      })),
    },
  },
}))

describe('ImageUpload Component', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders with default label', () => {
      render(<ImageUpload {...defaultProps} />)
      expect(screen.getByText('صورة')).toBeInTheDocument()
    })

    it('renders with custom label', () => {
      render(<ImageUpload {...defaultProps} label="صورة المقال" />)
      expect(screen.getByText('صورة المقال')).toBeInTheDocument()
    })

    it('renders upload area when no image', () => {
      render(<ImageUpload {...defaultProps} />)
      expect(screen.getByText('اضغط للرفع')).toBeInTheDocument()
    })

    it('renders preview when image is provided', () => {
      render(<ImageUpload {...defaultProps} value="https://example.com/test.jpg" />)
      const img = screen.getByAltText('Uploaded preview')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/test.jpg')
    })
  })

  describe('caption functionality', () => {
    it('does NOT show caption input when showCaption is false', () => {
      render(<ImageUpload {...defaultProps} value="https://example.com/test.jpg" showCaption={false} />)
      expect(screen.queryByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')).not.toBeInTheDocument()
    })

    it('does NOT show caption input when value is empty', () => {
      render(<ImageUpload {...defaultProps} value="" showCaption={true} />)
      expect(screen.queryByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')).not.toBeInTheDocument()
    })

    it('shows caption input when showCaption is true AND image is provided', () => {
      render(
        <ImageUpload
          {...defaultProps}
          value="https://example.com/test.jpg"
          showCaption={true}
          onCaptionChange={vi.fn()}
        />
      )
      expect(screen.getByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')).toBeInTheDocument()
    })

    it('does NOT show caption input when onCaptionChange is not provided', () => {
      render(
        <ImageUpload
          {...defaultProps}
          value="https://example.com/test.jpg"
          showCaption={true}
        />
      )
      expect(screen.queryByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')).not.toBeInTheDocument()
    })

    it('displays the caption value', () => {
      render(
        <ImageUpload
          {...defaultProps}
          value="https://example.com/test.jpg"
          showCaption={true}
          caption="Test Caption"
          onCaptionChange={vi.fn()}
        />
      )
      expect(screen.getByDisplayValue('Test Caption')).toBeInTheDocument()
    })

    it('calls onCaptionChange when caption is edited', () => {
      const onCaptionChange = vi.fn()
      render(
        <ImageUpload
          {...defaultProps}
          value="https://example.com/test.jpg"
          showCaption={true}
          caption=""
          onCaptionChange={onCaptionChange}
        />
      )
      const input = screen.getByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')
      fireEvent.change(input, { target: { value: 'New Caption' } })
      expect(onCaptionChange).toHaveBeenCalledWith('New Caption')
    })

    it('caption input accepts arabic text', () => {
      const onCaptionChange = vi.fn()
      render(
        <ImageUpload
          {...defaultProps}
          value="https://example.com/test.jpg"
          showCaption={true}
          caption=""
          onCaptionChange={onCaptionChange}
        />
      )
      const input = screen.getByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')
      fireEvent.change(input, { target: { value: 'صورة توضيحية' } })
      expect(onCaptionChange).toHaveBeenCalledWith('صورة توضيحية')
    })
  })

  describe('image removal', () => {
    it('calls onChange with empty string when remove button is clicked', () => {
      const onChange = vi.fn()
      render(<ImageUpload {...defaultProps} value="https://example.com/test.jpg" onChange={onChange} />)
      const removeButton = screen.getAllByRole('button')[0]
      fireEvent.click(removeButton)
      expect(onChange).toHaveBeenCalledWith('')
    })

    it('hides caption input after image removal', () => {
      const { rerender } = render(
        <ImageUpload
          value="https://example.com/test.jpg"
          onChange={defaultProps.onChange}
          showCaption={true}
          caption="Test"
          onCaptionChange={vi.fn()}
        />
      )
      expect(screen.getByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')).toBeInTheDocument()

      rerender(
        <ImageUpload
          value=""
          onChange={defaultProps.onChange}
          showCaption={true}
          caption=""
          onCaptionChange={vi.fn()}
        />
      )
      expect(screen.queryByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')).not.toBeInTheDocument()
    })
  })

  describe('backward compatibility', () => {
    it('works without caption props (old usage)', () => {
      render(<ImageUpload value="" onChange={vi.fn()} />)
      expect(screen.getByText('صورة')).toBeInTheDocument()
      expect(screen.getByText('اضغط للرفع')).toBeInTheDocument()
    })

    it('works with image but without caption props (old usage)', () => {
      render(<ImageUpload value="https://example.com/test.jpg" onChange={vi.fn()} />)
      expect(screen.getByAltText('Uploaded preview')).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('التسمية التوضيحية للصورة (اختياري)')).not.toBeInTheDocument()
    })
  })
})
