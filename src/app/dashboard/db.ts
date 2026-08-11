const DB_NAME = 'nexx_design_db'
const DB_VERSION = 1
const STORE_NAME = 'projects'

export interface ProjectRecord {
  id: string
  name: string
  thumbnail: string // Base64 dataURL
  starred: boolean
  createdAt: number
  updatedAt: number
  document: Uint8Array // Serialized FIG file binary bytes
}

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export function getAllProjectsFromDb(db: IDBDatabase): Promise<ProjectRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

export function getProjectFromDb(db: IDBDatabase, id: string): Promise<ProjectRecord | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export function createProjectInDb(db: IDBDatabase, record: ProjectRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(record)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export function updateProjectInDb(
  db: IDBDatabase,
  id: string,
  updates: Partial<Omit<ProjectRecord, 'id'>>
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const project = await getProjectFromDb(db, id)
      if (!project) {
        reject(new Error(`Project ${id} not found`))
        return
      }
      const updatedRecord = { ...project, ...updates }
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(updatedRecord)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    } catch (e) {
      reject(e)
    }
  })
}

export function deleteProjectInDb(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function duplicateProjectInDb(db: IDBDatabase, id: string): Promise<ProjectRecord> {
  const original = await getProjectFromDb(db, id)
  if (!original) {
    throw new Error(`Project ${id} not found`)
  }
  const duplicated: ProjectRecord = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name} Copy`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  await createProjectInDb(db, duplicated)
  return duplicated
}

// Convert a Uint8Array byte array to base64 DataURL helper
export function uint8ArrayToBase64(arr: Uint8Array): string {
  let bin = ''
  const len = arr.byteLength
  for (let i = 0; i < len; i++) {
    bin += String.fromCharCode(arr[i])
  }
  return `data:image/png;base64,${window.btoa(bin)}`
}
