export type EmailTemplateId =
  | 'welcome_signup'
  | 'subscription_activated'
  | 'subscription_canceled'
  | 'password_reset'
  | 'plugin_published'
  | 'collaboration_invite'
  | 'payment_receipt'

export interface EmailTemplate {
  id: EmailTemplateId
  name: string
  subject: string
  category: 'onboarding' | 'billing' | 'security' | 'developer' | 'collaboration'
  bodyHtml: string
  bodyText: string
  variables: string[]
}

export type EmailDeliveryStatus = 'delivered' | 'queued' | 'failed'

export interface EmailLog {
  id: string
  templateId: EmailTemplateId
  recipientEmail: string
  recipientName: string
  subject: string
  status: EmailDeliveryStatus
  variables: Record<string, string>
  sentAt: number
}
