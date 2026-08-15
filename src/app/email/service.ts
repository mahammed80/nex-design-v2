import { useLocalStorage } from '@vueuse/core'
import type { EmailTemplate, EmailTemplateId, EmailLog } from './types'
import { DEFAULT_EMAIL_TEMPLATES } from './templates'

const TEMPLATES_STORAGE_KEY = 'nex-design:email:templates'
const LOGS_STORAGE_KEY = 'nex-design:email:logs'

const DEFAULT_LOGS: EmailLog[] = [
  {
    id: 'log-seed-1',
    templateId: 'welcome_signup',
    recipientEmail: 'mohamed@example.com',
    recipientName: 'Mohamed Ahmed',
    subject: 'Welcome to NexDesign, Mohamed Ahmed! 🚀',
    status: 'delivered',
    variables: { userName: 'Mohamed Ahmed', actionUrl: 'http://localhost:5173/' },
    sentAt: Date.now() - 86400000 * 2
  },
  {
    id: 'log-seed-2',
    templateId: 'subscription_activated',
    recipientEmail: 'sarah.c@designstudio.io',
    recipientName: 'Sarah Chen',
    subject: 'Your Team Collaboration Plan is Active! 🎉',
    status: 'delivered',
    variables: { userName: 'Sarah Chen', planName: 'Team Collaboration', price: '49', billingCycle: 'annual' },
    sentAt: Date.now() - 86400000 * 5
  }
]

export const templatesStorage = useLocalStorage<EmailTemplate[]>(
  TEMPLATES_STORAGE_KEY,
  DEFAULT_EMAIL_TEMPLATES
)

export const emailLogsStorage = useLocalStorage<EmailLog[]>(LOGS_STORAGE_KEY, DEFAULT_LOGS)

export function compileTemplate(rawText: string, variables: Record<string, string>): string {
  let result = rawText
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(regex, val)
  }
  // Replace remaining unfulfilled variables with fallback strings
  result = result.replace(/{{\s*\w+\s*}}/g, '')
  return result
}

export function sendEmail(
  templateId: EmailTemplateId,
  recipientEmail: string,
  recipientName: string,
  variables: Record<string, string> = {}
): EmailLog {
  const tpl = templatesStorage.value.find((t) => t.id === templateId) || DEFAULT_EMAIL_TEMPLATES[0]

  const mergedVariables: Record<string, string> = {
    userName: recipientName || 'Designer',
    userEmail: recipientEmail,
    appName: 'NexDesign',
    actionUrl: window.location.origin,
    date: new Date().toLocaleDateString(),
    ...variables
  }

  const compiledSubject = compileTemplate(tpl.subject, mergedVariables)

  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
  const id = `log-${hex}`

  const logEntry: EmailLog = {
    id,
    templateId,
    recipientEmail,
    recipientName,
    subject: compiledSubject,
    status: 'delivered',
    variables: mergedVariables,
    sentAt: Date.now()
  }

  emailLogsStorage.value.unshift(logEntry)
  return logEntry
}
