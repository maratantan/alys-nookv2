'use client'

import { useEffect, useState } from 'react'

const DB_NAME = 'alys-nook-files'
const STORE = 'files'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

export async function saveFile(id: string, blob: Blob) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getFile(id: string) {
  const db = await openDb()
  return new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteFile(id: string) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function useStoredFile(id?: string) {
  const [state, setState] = useState<{ url: string | null; blob: Blob | null; missing: boolean }>({
    url: null,
    blob: null,
    missing: false,
  })

  useEffect(() => {
    if (!id) {
      setState({ url: null, blob: null, missing: false })
      return
    }
    let cancelled = false
    let objectUrl: string | null = null
    getFile(id)
      .then((blob) => {
        if (cancelled) return
        if (!blob) {
          setState({ url: null, blob: null, missing: true })
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setState({ url: objectUrl, blob, missing: false })
      })
      .catch(() => {
        if (!cancelled) setState({ url: null, blob: null, missing: true })
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  return state
}
