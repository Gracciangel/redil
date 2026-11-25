/** Comparte por Web Share; si no hay, copia al portapapeles. */
export async function shareVerse(reference: string, text: string): Promise<void> {
  const message = `«${text}»\n\n${reference}`
  if (navigator.share) {
    await navigator.share({ title: 'Redil', text: message })
    return
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message)
    return
  }
  throw new Error('Este navegador no permite compartir ni copiar el versículo.')
}
