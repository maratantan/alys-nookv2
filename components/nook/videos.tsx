'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Clapperboard, Film, Link as LinkIcon, ListVideo, Play, Plus, Trash2, Upload, X } from 'lucide-react'
import { deleteFile, saveFile, useStoredFile } from '@/lib/file-store'
import { createId, usePersistentState } from '@/lib/use-persistent-state'
import { cn } from '@/lib/utils'
import { EmptyState, IconBlob, NookButton, Panel, PillToggle, inputClass } from './ui'

type VideoSource = 'youtube' | 'vimeo' | 'url' | 'upload'
type Video = {
  id: string
  title: string
  source: VideoSource
  url?: string
  embedId?: string
  fileId?: string
  playlistId: string | null
  addedAt: number
}
type Playlist = { id: string; name: string }

function parseVideoUrl(raw: string): Pick<Video, 'source' | 'url' | 'embedId'> | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  const yt = raw.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return { source: 'youtube', url: url.href, embedId: yt[1] }
  const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { source: 'vimeo', url: url.href, embedId: vimeo[1] }
  return { source: 'url', url: url.href }
}

function defaultTitle(source: VideoSource, url?: string) {
  if (source === 'youtube') return 'YouTube video'
  if (source === 'vimeo') return 'Vimeo video'
  try {
    const name = new URL(url ?? '').pathname.split('/').pop()
    return name ? decodeURIComponent(name) : 'Video'
  } catch {
    return 'Video'
  }
}

function VideoPlayer({ video }: { video: Video }) {
  const { url: fileUrl, missing } = useStoredFile(video.source === 'upload' ? video.fileId : undefined)

  if (video.source === 'youtube') {
    return (
      <iframe
        key={video.id}
        src={`https://www.youtube-nocookie.com/embed/${video.embedId}?rel=0`}
        title={video.title}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }
  if (video.source === 'vimeo') {
    return (
      <iframe
        key={video.id}
        src={`https://player.vimeo.com/video/${video.embedId}`}
        title={video.title}
        className="size-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    )
  }
  const src = video.source === 'upload' ? fileUrl : video.url
  if (!src) {
    return (
      <div className="flex size-full items-center justify-center text-sm font-semibold text-card">
        {missing ? 'This uploaded video could not be found.' : 'Loading video...'}
      </div>
    )
  }
  return <video key={video.id} src={src} controls className="size-full bg-foreground" aria-label={video.title} />
}

function Thumbnail({ video }: { video: Video }) {
  if (video.source === 'youtube') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://i.ytimg.com/vi/${video.embedId}/mqdefault.jpg`}
        alt=""
        className="size-full object-cover"
        loading="lazy"
      />
    )
  }
  return (
    <div className="flex size-full items-center justify-center bg-secondary">
      {video.source === 'upload' ? <Film className="size-6" aria-hidden="true" /> : <Clapperboard className="size-6" aria-hidden="true" />}
    </div>
  )
}

export function Videos() {
  const [videos, setVideos] = usePersistentState<Video[]>('videos', [])
  const [playlists, setPlaylists] = usePersistentState<Playlist[]>('playlists', [])
  const [activePlaylist, setActivePlaylist] = useState<string | 'all'>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [addMode, setAddMode] = useState<'link' | 'upload'>('link')
  const [link, setLink] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkError, setLinkError] = useState('')
  const [newPlaylist, setNewPlaylist] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const targetPlaylist = activePlaylist === 'all' ? null : activePlaylist
  const visible = videos
    .filter((v) => activePlaylist === 'all' || v.playlistId === activePlaylist)
    .sort((a, b) => b.addedAt - a.addedAt)
  const playing = videos.find((v) => v.id === playingId) ?? null

  const addLink = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseVideoUrl(link)
    if (!parsed) {
      setLinkError('That does not look like a valid link.')
      return
    }
    const video: Video = {
      id: createId(),
      title: linkTitle.trim() || defaultTitle(parsed.source, parsed.url),
      ...parsed,
      playlistId: targetPlaylist,
      addedAt: Date.now(),
    }
    setVideos((prev) => [...prev, video])
    setPlayingId(video.id)
    setLink('')
    setLinkTitle('')
    setLinkError('')
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    const added: Video[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) continue
      const fileId = createId()
      try {
        await saveFile(fileId, file)
        added.push({
          id: createId(),
          title: file.name.replace(/\.[^.]+$/, ''),
          source: 'upload',
          fileId,
          playlistId: targetPlaylist,
          addedAt: Date.now(),
        })
      } catch {
        // Skip files the browser could not store.
      }
    }
    if (added.length) {
      setVideos((prev) => [...prev, ...added])
      setPlayingId(added[0].id)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeVideo = (video: Video) => {
    if (video.fileId) deleteFile(video.fileId).catch(() => {})
    setVideos((prev) => prev.filter((v) => v.id !== video.id))
    if (playingId === video.id) setPlayingId(null)
  }

  const moveVideo = (id: string, playlistId: string | null) =>
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, playlistId } : v)))

  const addPlaylist = (e: FormEvent) => {
    e.preventDefault()
    const name = newPlaylist.trim()
    if (!name) return
    const playlist = { id: createId(), name }
    setPlaylists((prev) => [...prev, playlist])
    setActivePlaylist(playlist.id)
    setNewPlaylist('')
  }

  const removePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id))
    setVideos((prev) => prev.map((v) => (v.playlistId === id ? { ...v, playlistId: null } : v)))
    if (activePlaylist === id) setActivePlaylist('all')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <Panel className="flex flex-col gap-3 self-start">
        <div className="flex items-center gap-3">
          <IconBlob icon={ListVideo} className="size-9" />
          <h3 className="font-display text-xl">Playlists</h3>
        </div>
        <ul className="flex flex-row flex-wrap gap-2 lg:flex-col">
          <li>
            <PillToggle active={activePlaylist === 'all'} onClick={() => setActivePlaylist('all')} className="w-full justify-between">
              All videos <span className="text-xs opacity-70">{videos.length}</span>
            </PillToggle>
          </li>
          {playlists.map((p) => (
            <li key={p.id} className="group flex items-center gap-1">
              <PillToggle active={activePlaylist === p.id} onClick={() => setActivePlaylist(p.id)} className="w-full justify-between">
                <span className="truncate">{p.name}</span>
                <span className="text-xs opacity-70">{videos.filter((v) => v.playlistId === p.id).length}</span>
              </PillToggle>
              <NookButton variant="danger" size="icon" className="size-7" onClick={() => removePlaylist(p.id)} aria-label={`Delete playlist ${p.name}`}>
                <X />
              </NookButton>
            </li>
          ))}
        </ul>
        <form onSubmit={addPlaylist} className="flex gap-2">
          <label htmlFor="new-playlist" className="sr-only">New playlist name</label>
          <input
            id="new-playlist"
            value={newPlaylist}
            onChange={(e) => setNewPlaylist(e.target.value)}
            placeholder="New playlist"
            className={inputClass}
          />
          <NookButton type="submit" variant="secondary" size="icon" aria-label="Create playlist" disabled={!newPlaylist.trim()}>
            <Plus />
          </NookButton>
        </form>
      </Panel>

      <div className="flex min-w-0 flex-col gap-5">
        <Panel className="flex flex-col gap-3">
          <div className="sketch-sm aspect-video w-full overflow-hidden bg-foreground">
            {playing ? (
              <VideoPlayer video={playing} />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-card">
                <Play className="size-10" aria-hidden="true" />
                <p className="font-display text-xl">Pick something cozy to watch</p>
                <p className="text-sm opacity-80">Add a link or upload a video below.</p>
              </div>
            )}
          </div>
          {playing ? <h3 className="font-display text-xl text-balance">{playing.title}</h3> : null}
        </Panel>

        <Panel className="flex flex-col gap-3">
          <div className="flex gap-2">
            <PillToggle active={addMode === 'link'} onClick={() => setAddMode('link')}>
              <LinkIcon className="size-4" aria-hidden="true" /> Add link
            </PillToggle>
            <PillToggle active={addMode === 'upload'} onClick={() => setAddMode('upload')}>
              <Upload className="size-4" aria-hidden="true" /> Upload
            </PillToggle>
          </div>
          {addMode === 'link' ? (
            <form onSubmit={addLink} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="video-link" className="sr-only">Video link</label>
              <input
                id="video-link"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value)
                  setLinkError('')
                }}
                placeholder="Paste a YouTube, Vimeo, or .mp4 link"
                className={cn(inputClass, 'sm:flex-[2]')}
                aria-invalid={!!linkError}
                aria-describedby={linkError ? 'video-link-error' : undefined}
              />
              <label htmlFor="video-title" className="sr-only">Title (optional)</label>
              <input
                id="video-title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Title (optional)"
                className={cn(inputClass, 'sm:flex-1')}
              />
              <NookButton type="submit" disabled={!link.trim()}>
                <Plus /> Add
              </NookButton>
            </form>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                className="sr-only"
                id="video-upload"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <label
                htmlFor="video-upload"
                className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background/50 px-4 py-6 text-center transition-colors hover:bg-secondary"
              >
                <Upload className="size-6" aria-hidden="true" />
                <span className="font-bold">{uploading ? 'Saving to your nook...' : 'Choose video files'}</span>
                <span className="text-xs text-muted-foreground">Stored privately in this browser</span>
              </label>
            </div>
          )}
          {linkError ? <p id="video-link-error" className="text-sm font-semibold text-destructive">{linkError}</p> : null}
        </Panel>

        <Panel>
          {visible.length === 0 ? (
            <EmptyState icon={Clapperboard} title="No videos here yet">
              {activePlaylist === 'all' ? 'Your video shelf is waiting to be filled.' : 'Videos you add now will land in this playlist.'}
            </EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((v) => (
                <li key={v.id} className={cn('sketch-sm flex flex-col overflow-hidden bg-background/60', playingId === v.id && 'ring-2 ring-primary ring-offset-2 ring-offset-card')}>
                  <button
                    type="button"
                    onClick={() => setPlayingId(v.id)}
                    className="group relative aspect-video w-full cursor-pointer overflow-hidden border-b-2 border-border"
                    aria-label={`Play ${v.title}`}
                  >
                    <Thumbnail video={v} />
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/25">
                      <span className="blob flex size-11 items-center justify-center border-2 border-border bg-card opacity-90 transition-transform group-hover:scale-110">
                        <Play className="size-5 fill-current" aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-col gap-2 p-3">
                    <p className="line-clamp-2 text-sm font-bold">{v.title}</p>
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`pl-${v.id}`}>Playlist for {v.title}</label>
                      <select
                        id={`pl-${v.id}`}
                        value={v.playlistId ?? ''}
                        onChange={(e) => moveVideo(v.id, e.target.value || null)}
                        className={cn(inputClass, 'h-8 py-0 text-xs')}
                      >
                        <option value="">No playlist</option>
                        {playlists.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <NookButton variant="danger" size="icon" className="size-8" onClick={() => removeVideo(v)} aria-label={`Delete ${v.title}`}>
                        <Trash2 />
                      </NookButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
