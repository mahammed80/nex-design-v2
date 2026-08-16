import { readLinkedAccountSession } from '@/app/dashboard/accounts/access'
import { getActiveProfileId } from '@/app/dashboard/accounts/session'
import { createProjectRepository } from '@/app/dashboard/projects/repository'

import { listProjectSyncOperations, removeProjectSyncOperation } from './outbox'

const configuredBaseUrl = import.meta.env.VITE_NEXDESIGN_ACCOUNT_API?.trim()

export async function flushProjectSyncOutbox(): Promise<void> {
  const session = readLinkedAccountSession()
  const profileId = getActiveProfileId()
  if (!session || !profileId || !configuredBaseUrl || !navigator.onLine) return
  const repository = createProjectRepository(profileId)
  const operations = await listProjectSyncOperations(session.accountId)
  for (const operation of operations) {
    const project =
      operation.kind === 'delete' ? undefined : await repository.get(operation.projectId)
    if (operation.kind !== 'delete' && !project) {
      await removeProjectSyncOperation(operation.id)
      continue
    }
    const form = new FormData()
    form.set('operation', JSON.stringify(operation))
    if (project) {
      form.set(
        'metadata',
        JSON.stringify({
          id: project.id,
          remoteId: project.remoteId ?? null,
          name: project.name,
          localRevision: project.localRevision ?? 1,
          remoteRevision: project.remoteRevision ?? 0,
          updatedAt: project.updatedAt
        })
      )
      form.set(
        'document',
        new Blob([project.document], { type: 'application/octet-stream' }),
        `${project.name}.fig`
      )
    }
    const response = await fetch(`${configuredBaseUrl}/projects/sync`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-NexDesign-Device': session.deviceId
      },
      body: form,
      signal: AbortSignal.timeout(15_000)
    })
    if (response.status === 401 || response.status === 403) return
    if (response.status === 409)
      throw new Error(`Project ${operation.projectId} has a sync conflict`)
    if (!response.ok) throw new Error(`Project sync failed (${response.status})`)
    await removeProjectSyncOperation(operation.id)
  }
}
