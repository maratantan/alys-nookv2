'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Download,
  File as FileIcon,
  FileText,
  Film,
  Folder,
  FolderHeart,
  FolderPlus,
  Image as ImageIcon,
  Music,
  Search,
  StickyNote,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { deleteFile, saveFile, useStoredFile } from '@/lib/file-store'
import { createId, formatBytes, usePersistentState } from '@/lib/use-persistent-state'
import { cn } from '@/lib/utils'
import { EmptyState, IconBlob, NookButton, Panel, PillToggle, inputClass } from './ui'

type Doc = {
  id: string
  title: string
  kind: 'note' | 'file'
  content?: string
  fileId?: string
  mimeType?: string
  size?: number
  folderId: string | null
  createdAt: number
  updatedAt: number
}
type DocFolder = { id: string; name: string }

function isTextLike(mime = '', name = '') {
  return mime.startsWith('text/') || mime === 'application/json' || /\.(md|txt|csv|json|log)$/i.test(name)
}

function docIcon(doc: Doc) {
  if (doc.kind === 'note') return StickyNote
  const m = doc.mimeType ?? ''
  if (m.startsWith('image/')) return ImageIcon
  if (m.startsWith('video/')) return Film
  if (m.startsWith('audio/')) return Music
  if (m === 'application/pdf' || isTextLike(m, doc.title)) return FileText
  return FileIcon
}

function TextPreview({ blob }: { blob: Blob }) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    blob.text().then((t) => !cancelled && setText(t))
    return () => {
      cancelled = true
    }
  }, [blob])
  return (
    <pre className="h-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-relaxed">
      {text ?? 'Loading...'}
    </pre>
  )
}

function FilePreview({ doc }: { doc: Doc }) {
  const { url, blob, missing } = useStoredFile(doc.fileId)
  const mime = doc.mimeType ?? ''

  if (missing) return <p className="p-6 text-sm text-muted-foreground">This file could not be found in browser storage.</p>
  if (!url || !blob) return <p className="p-6 text-sm text-muted-foreground">Opening...</p>

  if (mime.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={doc.title} className="mx-auto max-h-full object-contain p-4" />
  }
  if (mime === 'application/pdf') return <iframe src={url} title={doc.title} className="size-full min-h-[60vh]" />
  if (mime.startsWith('video/')) return <video src={url} controls className="max-h-full w-full bg-foreground" aria-label={doc.title} />
  if (mime.startsWith('audio/')) return <div className="p-6"><audio src={url} controls className="w-full" aria-label={doc.title} /></div>
  if (isTextLike(mime, doc.title)) return <TextPreview blob={blob} />

  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <FileIcon className="size-10" aria-hidden="true" />
      <p className="font-semibold">No preview for this file type.</p>
      <a href={url} download={doc.title} className="font-bold text-primary underline underline-offset-4">
        Download it instead
      </a>
    </div>
  )
}

function DocViewer({
  doc,
  folders,
  onChange,
  onDelete,
  onClose,
}: {
  doc: Doc
  folders: DocFolder[]
  onChange: (patch: Partial<Doc>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const { url } = useStoredFile(doc.kind === 'file' ? doc.fileId : undefined)

  const download = () => {
    const href = doc.kind === 'note' ? URL.createObjectURL(new Blob([doc.content ?? ''], { type: 'text/plain' })) : url
    if (!href) return
    const a = document.createElement('a')
    a.href = href
    a.download = doc.kind === 'note' ? `${doc.title || 'note'}.txt` : doc.title
    a.click()
    if (doc.kind === 'note') setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  return (
    <Panel className="flex min-h-[70vh] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <NookButton variant="ghost" size="icon" onClick={onClose} aria-label="Back to documents">
          <ArrowLeft />
        </NookButton>
        <label htmlFor="doc-title" className="sr-only">Document title</label>
        <input
          id="doc-title"
          value={doc.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-1 font-display text-xl focus:bg-background/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="doc-folder" className="sr-only">Folder</label>
        <select
          id="doc-folder"
          value={doc.folderId ?? ''}
          onChange={(e) => onChange({ folderId: e.target.value || null })}
          className={cn(inputClass, 'h-9 w-auto py-0')}
        >
          <option value="">Unfiled</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <span className="text-xs font-semibold text-muted-foreground">
          {doc.kind === 'note' ? 'Note' : formatBytes(doc.size)} - updated {new Date(doc.updatedAt).toLocaleDateString()}
        </span>
        <div className="ml-auto flex gap-2">
          <NookButton variant="secondary" size="sm" onClick={download}>
            <Download /> Download
          </NookButton>
          <NookButton variant="danger" size="sm" onClick={onDelete}>
            <Trash2 /> Delete
          </NookButton>
        </div>
      </div>
      <div className="sketch-sm flex min-h-0 flex-1 flex-col overflow-hidden bg-background/50 shadow-none">
        {doc.kind === 'note' ? (
          <>
            <label htmlFor="doc-content" className="sr-only">Note content</label>
            <textarea
              id="doc-content"
              value={doc.content ?? ''}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder="Start writing... it saves automatically."
              className="min-h-[50vh] flex-1 resize-none bg-[repeating-linear-gradient(transparent,transparent_31px,color-mix(in_oklab,var(--primary)_25%,transparent)_31px,color-mix(in_oklab,var(--primary)_25%,transparent)_32px)] bg-transparent p-4 text-base leading-8 focus:outline-none"
            />
          </>
        ) : (
          <FilePreview doc={doc} />
        )}
      </div>
    </Panel>
  )
}

export function Documents() {
  const [docs, setDocs] = usePersistentState<Doc[]>('documents', [])
  const [folders, setFolders] = usePersistentState<DocFolder[]>('doc-folders', [])
  const [activeFolder, setActiveFolder] = useState<string | 'all' | 'unfiled'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const targetFolder = activeFolder === 'all' || activeFolder === 'unfiled' ? null : activeFolder
  const openDoc = docs.find((d) => d.id === openId) ?? null
  const visible = docs
    .filter((d) => {
      if (activeFolder === 'unfiled') return d.folderId === null
      if (activeFolder !== 'all') return d.folderId === activeFolder
      return true
    })
    .filter((d) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return d.title.toLowerCase().includes(q) || (d.content ?? '').toLowerCase().includes(q)
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const updateDoc = (id: string, patch: Partial<Doc>) =>
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)))

  const newNote = () => {
    const now = Date.now()
    const doc: Doc = { id: createId(), title: 'Untitled note', kind: 'note', content: '', folderId: targetFolder, createdAt: now, updatedAt: now }
    setDocs((prev) => [...prev, doc])
    setOpenId(doc.id)
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    const added: Doc[] = []
    for (const file of Array.from(files)) {
      const fileId = createId()
      try {
        await saveFile(fileId, file)
        const now = Date.now()
        added.push({
          id: createId(),
          title: file.name,
          kind: 'file',
          fileId,
          mimeType: file.type,
          size: file.size,
          folderId: targetFolder,
          createdAt: now,
          updatedAt: now,
        })
      } catch {
        // Skip files the browser could not store.
      }
    }
    if (added.length) setDocs((prev) => [...prev, ...added])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeDoc = (doc: Doc) => {
    if (doc.fileId) deleteFile(doc.fileId).catch(() => {})
    setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    if (openId === doc.id) setOpenId(null)
  }

  const addFolder = (e: FormEvent) => {
    e.preventDefault()
    const name = newFolder.trim()
    if (!name) return
    const folder = { id: createId(), name }
    setFolders((prev) => [...prev, folder])
    setActiveFolder(folder.id)
    setNewFolder('')
  }

  const removeFolder = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id))
    setDocs((prev) => prev.map((d) => (d.folderId === id ? { ...d, folderId: null } : d)))
    if (activeFolder === id) setActiveFolder('all')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <Panel className="flex flex-col gap-3 self-start">
        <div className="flex items-center gap-3">
          <IconBlob icon={FolderHeart} className="size-9" />
          <h3 className="font-display text-xl">Folders</h3>
        </div>
        <ul className="flex flex-row flex-wrap gap-2 lg:flex-col">
          <li>
            <PillToggle active={activeFolder === 'all'} onClick={() => setActiveFolder('all')} className="w-full justify-between">
              All documents <span className="text-xs opacity-70">{docs.length}</span>
            </PillToggle>
          </li>
          <li>
            <PillToggle active={activeFolder === 'unfiled'} onClick={() => setActiveFolder('unfiled')} className="w-full justify-between">
              Unfiled <span className="text-xs opacity-70">{docs.filter((d) => !d.folderId).length}</span>
            </PillToggle>
          </li>
          {folders.map((f) => (
            <li key={f.id} className="flex items-center gap-1">
              <PillToggle active={activeFolder === f.id} onClick={() => setActiveFolder(f.id)} className="w-full justify-between">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Folder className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{f.name}</span>
                </span>
                <span className="text-xs opacity-70">{docs.filter((d) => d.folderId === f.id).length}</span>
              </PillToggle>
              <NookButton variant="danger" size="icon" className="size-7" onClick={() => removeFolder(f.id)} aria-label={`Delete folder ${f.name}`}>
                <X />
              </NookButton>
            </li>
          ))}
        </ul>
        <form onSubmit={addFolder} className="flex gap-2">
          <label htmlFor="new-folder" className="sr-only">New folder name</label>
          <input id="new-folder" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="New folder" className={inputClass} />
          <NookButton type="submit" variant="secondary" size="icon" aria-label="Create folder" disabled={!newFolder.trim()}>
            <FolderPlus />
          </NookButton>
        </form>
      </Panel>

      {openDoc ? (
        <DocViewer
          doc={openDoc}
          folders={folders}
          onChange={(patch) => updateDoc(openDoc.id, patch)}
          onDelete={() => removeDoc(openDoc)}
          onClose={() => setOpenId(null)}
        />
      ) : (
        <Panel className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="doc-search" className="sr-only">Search documents</label>
              <input
                id="doc-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your shelf"
                className={cn(inputClass, 'pl-9')}
              />
            </div>
            <div className="flex gap-2">
              <NookButton variant="secondary" onClick={newNote}>
                <StickyNote /> New note
              </NookButton>
              <input
                ref={fileInputRef}
                id="doc-upload"
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <NookButton onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload /> {uploading ? 'Saving...' : 'Upload'}
              </NookButton>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={FolderHeart} title={query ? 'No matches found' : 'Your shelf is empty'}>
              {query ? 'Try a different search word.' : 'Write a quick note or upload PDFs, images, and text files.'}
            </EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((d) => {
                const Icon = docIcon(d)
                const folder = folders.find((f) => f.id === d.folderId)
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(d.id)}
                      className="sketch-sm flex h-full w-full cursor-pointer flex-col gap-3 bg-background/60 p-4 text-left transition-transform hover:-translate-y-0.5 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <IconBlob icon={Icon} className={d.kind === 'note' ? 'bg-accent' : 'bg-secondary'} />
                        {folder ? (
                          <span className="truncate rounded-full border-2 border-border bg-card px-2 py-0.5 text-[11px] font-bold">{folder.name}</span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 font-bold break-words">{d.title || 'Untitled'}</p>
                      {d.kind === 'note' ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{d.content?.trim() || 'Empty note'}</p>
                      ) : null}
                      <p className="mt-auto text-xs font-semibold text-muted-foreground">
                        {d.kind === 'note' ? 'Note' : formatBytes(d.size)} - {new Date(d.updatedAt).toLocaleDateString()}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}
    </div>
  )
}
