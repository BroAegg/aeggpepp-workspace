'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Calendar, Heart, Download, Trash2, Grid, LayoutList, Upload, Image as ImageIcon, ChevronLeft, ChevronRight, Loader2, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGalleryItems, createGalleryItem, updateGalleryItem, deleteGalleryItem } from '@/lib/actions/gallery'
import type { GalleryItem } from '@/types'

type ViewMode = 'grid' | 'timeline'
type PhotoWithLike = GalleryItem & { liked?: boolean }

export default function GalleryPage() {
  const [photos, setPhotos] = useState<PhotoWithLike[]>([])
  const [loading, setLoading] = useState(true)
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

  // Fetch photos on mount
  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    setLoading(true)
    const data = await getGalleryItems()
    // Load liked state from localStorage
    const likedIds = JSON.parse(localStorage.getItem('gallery_likes') || '[]')
    setPhotos(data.map(p => ({ ...p, liked: likedIds.includes(p.id) })))
    setLoading(false)
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
    const result = await deleteGalleryItem(id)
    if (result.success) {
      setPhotos(photos.filter(p => p.id !== id))
      setSelectedPhoto(null)
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
    formData.append('file', selectedFile)

    const result = await createGalleryItem(formData)

    if (result.success) {
      await fetchPhotos()
      setShowUploadModal(false)
      setSelectedFile(null)
      setPreviewUrl(null)
      formRef.current?.reset()
    }
    setUploading(false)
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
      <Header title="Gallery Timeline" emoji="📸" />

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
