'use server'

import { createClient } from '@/lib/supabase/server'

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
    const marker = `/object/`
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

/**
 * Generates a time-limited signed URL for private storage buckets.
 * Default expiration is 3600 seconds (1 hour).
 */
export async function getSignedStorageUrl(
  bucket: string,
  pathOrUrl: string | null | undefined,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!pathOrUrl) return null

  // If already a signed URL with active token, return as-is
  if (pathOrUrl.includes('token=') || pathOrUrl.includes('Signature=')) {
    return pathOrUrl
  }

  // External third-party URL (e.g. Google avatar or unsplash)
  if (pathOrUrl.startsWith('http') && !pathOrUrl.includes('supabase.co')) {
    return pathOrUrl
  }

  const cleanPath = extractStoragePath(bucket, pathOrUrl)
  if (!cleanPath) return pathOrUrl

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresInSeconds)

    if (error || !data?.signedUrl) {
      console.warn(`[Storage] Failed to create signed URL for ${bucket}/${cleanPath}:`, error?.message)
      return pathOrUrl // fallback to original path/url
    }

    return data.signedUrl
  } catch (err) {
    console.error(`[Storage] Unexpected error generating signed URL for ${bucket}:`, err)
    return pathOrUrl
  }
}

/**
 * Server action callable from client components to get a fresh signed URL
 */
export async function createSignedUrlAction(bucket: string, pathOrUrl: string, expiresIn: number = 3600) {
  return await getSignedStorageUrl(bucket, pathOrUrl, expiresIn)
}
