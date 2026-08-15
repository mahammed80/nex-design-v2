import { ref, computed } from 'vue'
import type { EmailTemplateId, EmailTemplate } from './types'
import { templatesStorage, emailLogsStorage, sendEmail, compileTemplate } from './service'

const activeSubTab = ref<'templates' | 'logs'>('templates')
const selectedTemplateId = ref<EmailTemplateId>('welcome_signup')
const emailSearchQuery = ref('')

const selectedTemplate = computed<EmailTemplate>(() => {
  const found = templatesStorage.value.find((t) => t.id === selectedTemplateId.value)
  return found || templatesStorage.value[0]
})

const filteredLogs = computed(() => {
  if (!emailSearchQuery.value.trim()) {
    return emailLogsStorage.value
  }
  const q = emailSearchQuery.value.toLowerCase()
  return emailLogsStorage.value.filter(
    (log) =>
      log.recipientEmail.toLowerCase().includes(q) ||
      log.recipientName.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q) ||
      log.templateId.toLowerCase().includes(q)
  )
})

function updateTemplate(id: EmailTemplateId, updates: Partial<EmailTemplate>) {
  const idx = templatesStorage.value.findIndex((t) => t.id === id)
  if (idx !== -1) {
    templatesStorage.value[idx] = { ...templatesStorage.value[idx], ...updates }
  }
}

function dispatchTestEmail(templateId: EmailTemplateId, email: string, name: string) {
  return sendEmail(templateId, email, name, {
    planName: 'Pro Designer',
    price: '19',
    billingCycle: 'monthly',
    pluginName: 'AI UI Component Builder',
    version: '1.4.0',
    inviterName: 'Mohamed Ahmed',
    projectName: 'E-commerce Mobile App',
    receiptId: '8942-019'
  })
}

function clearLogs() {
  emailLogsStorage.value = []
}

export function useEmailStore() {
  return {
    activeSubTab,
    selectedTemplateId,
    selectedTemplate,
    templatesList: templatesStorage,
    emailLogsList: emailLogsStorage,
    filteredLogs,
    emailSearchQuery,

    updateTemplate,
    dispatchTestEmail,
    clearLogs,
    compileTemplate
  }
}
