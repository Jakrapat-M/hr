import type { AttachedFile } from './AttachmentDropzone'

export function filesFromAttachmentName(
  name: string | null | undefined,
  idPrefix = 'attachment-existing',
): AttachedFile[] {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return []

  return trimmed
    .split(',')
    .map((fileName, index) => ({
      id: `${idPrefix}-${index}`,
      name: fileName.trim(),
      size: 0,
      type: '',
    }))
    .filter((file) => file.name.length > 0)
}

export function attachmentNameFromFiles(files: AttachedFile[]): string {
  return files.map((file) => file.name).join(', ')
}
