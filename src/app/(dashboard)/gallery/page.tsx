'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Calendar, Heart, Download, Trash2, Grid, LayoutList, Upload, Image as ImageIcon, ChevronLeft, ChevronRight, Loader2, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGalleryItems, createGalleryItem, updateGalleryItem, deleteGalleryItem } from '@/lib/actions/gallery'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { GalleryItem } from '@/types'

type ViewMode = 'grid' | 'timeline'
type PhotoWithLike = GalleryItem & { liked?: boolean }

/**
 * ⚡ Client-side WebP image compressor
 * Resizes images down to 1920px max dimension and converts to WebP.
 * Cuts 8MB-10MB mobile photos down to < 400KB in ~100ms.
 */
async function compressImage(file: File, maxDimension = 1920, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 300 * 1024) return file
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file

  return new Promise((resolve) => {
    const img = new window.Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp'
            const compressedFile = new File([blob], cleanName, {
              type: 'image/webp',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/webp',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export default function GalleryPage() {
  const {
    gallery: cachedGallery,
    galleryLoaded,
    setGalleryData,
    removeGalleryOptimistic,
  } = useWorkspaceStore()

  const [photos, setPhotos] = useState<PhotoWithLike[]>(() => {
    const likedIds = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('gallery_likes') || '[]') : []
    return cachedGallery.map(p => ({ ...p, liked: likedIds.includes(p.id) }))
  })
  const [loading, setLoading] = useState(!galleryLoaded && cachedGallery.length === 0)
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithLike | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionText, setCaptionText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Fetch photos on mount (SWR: revalidate in background)
  useEffect(() => {
    fetchPhotos()

    const handleOnline = () => fetchPhotos()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const fetchPhotos = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false)
      return
    }
    if (!galleryLoaded && cachedGallery.length === 0) setLoading(true)
    try {
      const data = await getGalleryItems()
      const likedIds = JSON.parse(localStorage.getItem('gallery_likes') || '[]')
      const mapped = data.map(p => ({ ...p, liked: likedIds.includes(p.id) }))
      setPhotos(mapped)
      setGalleryData(data)
    } catch (err) {
      console.error('Failed to fetch gallery items:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleLike = (id: string) => {
    const likedIds = JSON.parse(localStorage.getItem('gallery_likes') || '[]')
    const newLikedIds = likedIds.includes(id)
      ? likedIds.filter((lid: string) => lid !== id)
      : [...likedIds, id]
    localStorage.setItem('gallery_likes', JSON.stringify(newLikedIds))
    setPhotos(photos.map(p => p.id === id ? { ...p, liked: !p.liked } : p))
    if (selectedPhoto?.id === id) {
      setSelectedPhoto({ ...selectedPhoto, liked: !selectedPhoto.liked })
    }
  }

  const handleDelete = async (id: string) => {
    const previousPhotos = photos
    // ⚡ Optimistic Delete (0ms instant removal)
    setPhotos(photos.filter(p => p.id !== id))
    removeGalleryOptimistic(id)
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null)
    }

    try {
      const result = await deleteGalleryItem(id)
      if (result && 'error' in result && result.error) {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Failed to delete photo, rolling back:', err)
      setPhotos(previousPhotos)
      setGalleryData(previousPhotos)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be under 10MB')
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpload = async (formData: FormData) => {
    if (!selectedFile) return

    setUploading(true)

    try {
      // ⚡ Compress image client-side before sending to Supabase
      const compressed = await compressImage(selectedFile)
      formData.set('file', compressed)

      const result = await createGalleryItem(formData)

      if (result && 'error' in result) {
        alert(`Upload failed: ${result.error}`)
        setUploading(false)
        return
      }

      if (result.success) {
        await fetchPhotos()
        setShowUploadModal(false)
        setSelectedFile(null)
        setPreviewUrl(null)
        formRef.current?.reset()
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Make sure the "gallery" storage bucket exists in Supabase and has proper policies.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (photo: PhotoWithLike) => {
    try {
      const response = await fetch(photo.image_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = photo.caption || `photo-${photo.id}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleUpdateCaption = async (photoId: string, caption: string) => {
    const formData = new FormData()
    formData.set('caption', caption)
    const result = await updateGalleryItem(photoId, formData)
    if (result.success) {
      setPhotos(photos.map(p => p.id === photoId ? { ...p, caption } : p))
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto({ ...selectedPhoto, caption })
      }
      setEditingCaption(false)
    }
  }

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
    const newIndex = direction === 'prev'
      ? (currentIndex - 1 + photos.length) % photos.length
      : (currentIndex + 1) % photos.length
    setSelectedPhoto(photos[newIndex])
  }

  // Group photos by month for timeline view
  const groupedPhotos = photos.reduce((acc, photo) => {
    const dateStr = photo.taken_at || photo.created_at
    const month = new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })
    if (!acc[month]) acc[month] = []
    acc[month].push(photo)
    return acc
  }, {} as Record<string, PhotoWithLike[]>)

  return (
    <>
      <Header title="Gallery Timeline" icon={ImageIcon} />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4 mr-1" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
            >
              <LayoutList className="w-4 h-4 mr-1" />
              Timeline
            </Button>
          </div>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Photo
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Gallery Content */}
        {!loading && viewMode === 'grid' ? (
          /* Grid View */
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                layoutId={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-square group cursor-pointer rounded-xl overflow-hidden bg-secondary"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.image_url}
                  alt={photo.caption || 'Photo'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform md:translate-y-full md:group-hover:translate-y-0 transition-transform">
                  <p className="text-sm font-medium truncate">{photo.caption || 'No caption'}</p>
                  <p className="text-xs text-white/70">{new Date(photo.taken_at || photo.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                {photo.liked && (
                  <div className="absolute top-2 right-2">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : !loading ? (
          /* Timeline View */
          <div className="space-y-8">
            {Object.entries(groupedPhotos).map(([month, monthPhotos]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">{month}</h2>
                  <span className="text-sm text-muted-foreground">({monthPhotos.length} photos)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-8 border-l-2 border-border">
                  {monthPhotos.map((photo) => (
                    <motion.div
                      key={photo.id}
                      whileHover={{ scale: 1.02 }}
                      className="relative aspect-square cursor-pointer rounded-lg overflow-hidden bg-secondary"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={photo.image_url}
                        alt={photo.caption || 'Photo'}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Empty State */}
        {!loading && photos.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No photos yet</h3>
            <p className="text-muted-foreground mb-6">Start capturing your memories together!</p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload First Photo
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            {/* Navigation Buttons */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); navigatePhoto('prev') }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); navigatePhoto('next') }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            {/* Close Button */}
            <button
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Photo Content */}
            <motion.div
              layoutId={selectedPhoto.id}
              className="max-w-4xl max-h-[80vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.image_url}
                alt={selectedPhoto.caption || 'Photo'}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />

              {/* Photo Info */}
              <div className="mt-4 text-center">
                <p className="text-white text-lg font-medium">
                  {editingCaption ? (
                    <span className="flex items-center gap-2 justify-center">
                      <input
                        type="text"
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateCaption(selectedPhoto.id, captionText)
                          if (e.key === 'Escape') setEditingCaption(false)
                        }}
                      />
                      <button onClick={() => handleUpdateCaption(selectedPhoto.id, captionText)} className="text-emerald-400 hover:text-emerald-300">✓</button>
                      <button onClick={() => setEditingCaption(false)} className="text-red-400 hover:text-red-300">✗</button>
                    </span>
                  ) : (
                    <span className="cursor-pointer hover:underline" onClick={() => { setEditingCaption(true); setCaptionText(selectedPhoto.caption || '') }}>
                      {selectedPhoto.caption || 'No caption (click to edit)'}
                    </span>
                  )}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {new Date(selectedPhoto.taken_at || selectedPhoto.created_at).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      selectedPhoto.liked
                        ? "text-red-500 bg-red-500/20"
                        : "text-white/70 hover:text-red-500 hover:bg-red-500/20"
                    )}
                    onClick={() => toggleLike(selectedPhoto.id)}
                  >
                    <Heart className={cn("w-6 h-6", selectedPhoto.liked && "fill-current")} />
                  </button>
                  <button
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    onClick={() => { setEditingCaption(true); setCaptionText(selectedPhoto.caption || '') }}
                  >
                    <Edit2 className="w-6 h-6" />
                  </button>
                  <button
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    onClick={() => handleDownload(selectedPhoto)}
                  >
                    <Download className="w-6 h-6" />
                  </button>
                  <button
                    className="p-2 rounded-full text-white/70 hover:text-red-500 hover:bg-red-500/20 transition-colors"
                    onClick={() => handleDelete(selectedPhoto.id)}
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Upload Photo</h2>
                <button
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); setPreviewUrl(null) }}
                  className="p-1 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <form ref={formRef} action={handleUpload}>
                {/* Dropzone / Preview */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null) }}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-foreground font-medium mb-1">Drop your photo here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                )}

                {/* Form Fields */}
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Caption</label>
                    <input
                      type="text"
                      name="caption"
                      placeholder="Add a caption..."
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Date Taken</label>
                    <input
                      type="date"
                      name="taken_at"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowUploadModal(false); setSelectedFile(null); setPreviewUrl(null) }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={!selectedFile || uploading}>
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Upload</>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
