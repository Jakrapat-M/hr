import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AttachmentDropzone } from './AttachmentDropzone'

describe('AttachmentDropzone', () => {
  it('uses the BA attachment file allowlist by default', () => {
    const onFilesChange = vi.fn()

    const { container } = render(
      <AttachmentDropzone files={[]} onFilesChange={onFilesChange} label="ไฟล์แนบ" />,
    )

    const input = container.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png,.pptx,.xlsx')
  })

  it('rejects file extensions outside the BA allowlist', async () => {
    const onFilesChange = vi.fn()

    const { container } = render(
      <AttachmentDropzone files={[]} onFilesChange={onFilesChange} label="ไฟล์แนบ" />,
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['hello'], 'script.exe', { type: 'application/octet-stream' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('ไม่ใช่ประเภทที่รองรับ')
    expect(onFilesChange).not.toHaveBeenCalled()
  })

  it('accepts BA allowed file extensions and returns uploaded file metadata', async () => {
    const onFilesChange = vi.fn()

    const { container } = render(
      <AttachmentDropzone files={[]} onFilesChange={onFilesChange} label="ไฟล์แนบ" />,
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['hello'], 'work-permit.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onFilesChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'work-permit.pdf',
          size: file.size,
          type: 'application/pdf',
        }),
      ])
    })
  })
})
