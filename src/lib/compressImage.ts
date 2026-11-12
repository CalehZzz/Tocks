const MAX_SOURCE_BYTES = 15 * 1024 * 1024 // 15 MB original
const MAX_EDGE = 1200
const JPEG_QUALITY = 0.78

/**
 * Resize + JPEG-compress product photos in the browser before upload.
 * Keeps Storage usage low without putting blobs in Postgres.
 */
export async function compressProductImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se permiten imágenes')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Imagen demasiado grande (máx 15 MB antes de comprimir)')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo preparar el lienzo')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) throw new Error('No se pudo comprimir la imagen')

    const base = file.name.replace(/\.[^.]+$/, '') || 'producto'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}
