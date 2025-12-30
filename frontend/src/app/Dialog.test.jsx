/**
 * Tests for Dialog Component
 * 
 * Tests the custom dialog component that replaces native browser dialogs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dialog from './Dialog'

describe('Dialog Component', () => {
  const mockOnConfirm = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnConfirm.mockClear()
    mockOnClose.mockClear()
  })

  describe('Prompt Dialog', () => {
    it('renders prompt dialog with input field', () => {
      render(
        <Dialog
          isOpen={true}
          type="prompt"
          title="Test Prompt"
          message="Enter something:"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('Test Prompt')).toBeInTheDocument()
      expect(screen.getByText('Enter something:')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument()
    })

    it('calls onConfirm with input value when OK is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Dialog
          isOpen={true}
          type="prompt"
          title="Test Prompt"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      const input = screen.getByPlaceholderText('Enter text...')
      await user.type(input, 'test value')
      
      const okButton = screen.getByText('OK')
      await user.click(okButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('test value')
    })

    it('disables OK button when input is empty', () => {
      render(
        <Dialog
          isOpen={true}
          type="prompt"
          title="Test Prompt"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      const okButton = screen.getByText('OK')
      expect(okButton).toBeDisabled()
    })

    it('uses default value when provided', () => {
      render(
        <Dialog
          isOpen={true}
          type="prompt"
          title="Test Prompt"
          defaultValue="default text"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      const input = screen.getByPlaceholderText('Enter text...')
      expect(input).toHaveValue('default text')
    })

    it('submits on Enter key press', async () => {
      const user = userEvent.setup()
      render(
        <Dialog
          isOpen={true}
          type="prompt"
          title="Test Prompt"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      const input = screen.getByPlaceholderText('Enter text...')
      await user.type(input, 'test{Enter}')

      expect(mockOnConfirm).toHaveBeenCalledWith('test')
    })

    it('closes on Escape key press', async () => {
      render(
        <Dialog
          isOpen={true}
          type="prompt"
          title="Test Prompt"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Confirm Dialog', () => {
    it('renders confirm dialog with message', () => {
      render(
        <Dialog
          isOpen={true}
          type="confirm"
          title="Confirm Action"
          message="Are you sure?"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )

      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
      expect(screen.getByText('Are you sure?')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('calls onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Dialog
          isOpen={true}
          type="confirm"
          title="Confirm"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      const okButton = screen.getByText('OK')
      await user.click(okButton)

      expect(mockOnConfirm).toHaveBeenCalled()
    })

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Dialog
          isOpen={true}
          type="confirm"
          title="Confirm"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('confirms on Enter key press', async () => {
      render(
        <Dialog
          isOpen={true}
          type="confirm"
          title="Confirm"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      fireEvent.keyDown(window, { key: 'Enter' })

      expect(mockOnConfirm).toHaveBeenCalled()
    })
  })

  describe('Alert Dialog', () => {
    it('renders alert dialog without cancel button', () => {
      render(
        <Dialog
          isOpen={true}
          type="alert"
          title="Alert"
          message="Something happened!"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('Alert')).toBeInTheDocument()
      expect(screen.getByText('Something happened!')).toBeInTheDocument()
      expect(screen.getByText('OK')).toBeInTheDocument()
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })

    it('calls onConfirm when OK is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Dialog
          isOpen={true}
          type="alert"
          title="Alert"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      const okButton = screen.getByText('OK')
      await user.click(okButton)

      expect(mockOnConfirm).toHaveBeenCalled()
    })
  })

  describe('Dialog Visibility', () => {
    it('does not render when isOpen is false', () => {
      render(
        <Dialog
          isOpen={false}
          type="prompt"
          title="Hidden Dialog"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      expect(screen.queryByText('Hidden Dialog')).not.toBeInTheDocument()
    })

    it('closes when clicking overlay', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Dialog
          isOpen={true}
          type="confirm"
          title="Test"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      // Click the overlay (not the dialog content)
      const overlay = container.firstChild
      await user.click(overlay)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Focus Management', () => {
    it('focuses input field when prompt dialog opens', async () => {
      const { rerender } = render(
        <Dialog
          isOpen={false}
          type="prompt"
          title="Test"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      rerender(
        <Dialog
          isOpen={true}
          type="prompt"
          title="Test"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter text...')
        expect(input).toHaveFocus()
      })
    })
  })
})

