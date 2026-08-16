import type { ProjectRecord } from '@/app/dashboard/db'

export type SyncOperationKind = 'create' | 'update' | 'delete'

export interface ProjectSyncOperation {
  id: string
  accountId: string
  projectId: string
  remoteId: string | null
  kind: SyncOperationKind
  localRevision: number
  createdAt: number
  attempts: number
}

const DB_NAME = 'nex-design-sync-v1'
const STORE_NAME = 'outbox'

function openSyncDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export async function enqueueProjectSync(
  accountId: string,
  project: Pick<ProjectRecord, 'id' | 'remoteId' | 'localRevision'>,
  kind: SyncOperationKind
): Promise<void> {
  const database = await openSyncDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const request = transaction.objectStore(STORE_NAME).put({
      id: crypto.randomUUID(),
      accountId,
      projectId: project.id,
      remoteId: project.remoteId ?? null,
      kind,
      localRevision: project.localRevision ?? 1,
      createdAt: Date.now(),
      attempts: 0
    } satisfies ProjectSyncOperation)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function listProjectSyncOperations(
  accountId: string
): Promise<ProjectSyncOperation[]> {
  const database = await openSyncDb()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const operations = (request.result as ProjectSyncOperation[])
        .filter((operation) => operation.accountId === accountId)
        .sort((left, right) => left.createdAt - right.createdAt)
      resolve(operations)
    }
  })
}

export async function removeProjectSyncOperation(id: string): Promise<void> {
  const database = await openSyncDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const request = transaction.objectStore(STORE_NAME).delete(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
