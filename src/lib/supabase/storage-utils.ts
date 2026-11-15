/**
 * Pure utility functions for Supabase Storage paths.
 * Separated from 'use server' modules to ensure clean compilation across server/client bundles.
 */

/**
 * Extracts the file path from either a full Supabase URL or a relative path.
 * Example inputs:
 * - "user_id/1729000000.webp" -> "user_id/1729000000.webp"
 * - "https://xyz.supabase.co/storage/v1/object/public/receipts/user_id/1729000000.webp" -> "user_id/1729000000.webp"
 * - "https://xyz.supabase.co/storage/v1/object/sign/receipts/user_id/1729000000.webp?token=..." -> already signed
 */
export function extractStoragePath(bucket: string, pathOrUrl: string): string {
  if (!pathOrUrl) return ''

  // If already relative
  if (!pathOrUrl.startsWith('http://') && !pathOrUrl.startsWith('https://')) {
    return pathOrUrl.replace(/^\/+/, '')
  }

  try {
    const url = new URL(pathOrUrl)
    // Matches /storage/v1/object/(public|sign)/{bucket}/(filePath)
    const marker = '/object/'
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex !== -1) {
      const rest = url.pathname.substring(markerIndex + marker.length)
      // rest is e.g. "public/receipts/user_id/123.webp" or "sign/receipts/..."
      const parts = rest.split('/')
      if (parts.length >= 3 && parts[1] === bucket) {
        return parts.slice(2).join('/')
      }
    }
  } catch {
    // If not a parseable URL, fallback to raw string
  }

  return pathOrUrl
}
