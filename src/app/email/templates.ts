import type { EmailTemplate } from './types'

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome_signup',
    name: 'Welcome & Registration',
    subject: 'Welcome to NexDesign, {{userName}}! 🚀',
    category: 'onboarding',
    variables: ['userName', 'userEmail', 'appName', 'actionUrl'],
    bodyText:
      'Hi {{userName}},\n\nWelcome to NexDesign! Your account has been created. Start creating vector designs and AI UI components now.\n\nOpen Workspace: {{actionUrl}}\n\nThe NexDesign Team',
    bodyHtml: `
<div style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #a855f7; font-size: 24px; margin: 0;">NexDesign</h1>
      <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Vector Canvas & AI Design Platform</p>
    </div>
    <h2 style="color: #ffffff; font-size: 20px;">Welcome aboard, {{userName}}! 👋</h2>
    <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
      Thank you for creating an account with NexDesign. You now have access to high-performance Skia WASM vector editing, AI UI component generation, and real-time collaboration.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #9333ea, #4f46e5); color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Launch Workspace</a>
    </div>
    <p style="color: #71717a; font-size: 12px; text-align: center; border-top: 1px solid #27272a; padding-top: 16px; margin-top: 32px;">
      If you did not sign up for NexDesign, you can ignore this email.
    </p>
  </div>
</div>`
  },
  {
    id: 'subscription_activated',
    name: 'Subscription Activation',
    subject: 'Your {{planName}} Plan is Active! 🎉',
    category: 'billing',
    variables: ['userName', 'planName', 'price', 'billingCycle', 'actionUrl'],
    bodyText:
      'Hi {{userName}},\n\nYour subscription to {{planName}} is now active at ${{price}}/{{billingCycle}}.\n\nEnjoy unlimited projects and AI credits!\n\nThe NexDesign Team',
    bodyHtml: `
<div style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="background-color: #2e1065; color: #c084fc; border: 1px solid #581c87; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold;">PLAN ACTIVATED</span>
    </div>
    <h2 style="color: #ffffff; font-size: 20px;">Your {{planName}} Plan is Live, {{userName}}!</h2>
    <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
      Your subscription to <strong>{{planName}}</strong> (\${{price}}/{{billingCycle}}) has been successfully activated. You have unlocked unlimited projects, advanced vector exports, and monthly AI generation quotas.
    </p>
    <div style="margin: 24px 0; background-color: #09090b; border: 1px solid #27272a; padding: 16px; border-radius: 12px;">
      <div style="color: #a1a1aa; font-size: 12px;">Active Subscription Tier</div>
      <div style="color: #38bdf8; font-size: 18px; font-weight: bold; margin-top: 4px;">{{planName}}</div>
    </div>
    <div style="margin: 32px 0; text-align: center;">
      <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #9333ea, #4f46e5); color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Go to Workspace</a>
    </div>
  </div>
</div>`
  },
  {
    id: 'subscription_canceled',
    name: 'Subscription Cancellation',
    subject: 'Subscription Status Update for {{userName}}',
    category: 'billing',
    variables: ['userName', 'planName', 'actionUrl'],
    bodyText:
      'Hi {{userName}},\n\nYour subscription to {{planName}} has been canceled. Your projects remain safe on your PC.\n\nThe NexDesign Team',
    bodyHtml: `
<div style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; padding: 32px;">
    <h2 style="color: #ffffff; font-size: 20px;">Subscription Canceled</h2>
    <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
      Hi {{userName}}, your subscription to <strong>{{planName}}</strong> has been canceled. All your design files remain 100% saved locally on your computer.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="{{actionUrl}}" style="background-color: #27272a; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Reactivate Subscription</a>
    </div>
  </div>
</div>`
  },
  {
    id: 'password_reset',
    name: 'Password Reset Request',
    subject: 'Reset your NexDesign password 🔐',
    category: 'security',
    variables: ['userName', 'actionUrl'],
    bodyText:
      'Hi {{userName}},\n\nWe received a request to reset your password. Click the link below to set a new password:\n\nReset Password: {{actionUrl}}\n\nThe NexDesign Team',
    bodyHtml: `
<div style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; padding: 32px;">
    <h2 style="color: #ffffff; font-size: 20px;">Password Reset Request 🔐</h2>
    <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
      Hi {{userName}}, we received a request to reset the password for your NexDesign account. Click the button below to choose a new password.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="{{actionUrl}}" style="background-color: #9333ea; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Reset Password</a>
    </div>
    <p style="color: #71717a; font-size: 12px;">Link expires in 60 minutes.</p>
  </div>
</div>`
  },
  {
    id: 'plugin_published',
    name: 'Plugin Approved & Published',
    subject: 'Your plugin "{{pluginName}}" is live! 🔌',
    category: 'developer',
    variables: ['userName', 'pluginName', 'version', 'actionUrl'],
    bodyText:
      'Congratulations {{userName}}! Your plugin "{{pluginName}}" v{{version}} is now live on the NexDesign Marketplace.\n\nThe NexDesign Team',
    bodyHtml: `
<div style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; padding: 32px;">
    <h2 style="color: #ffffff; font-size: 20px;">Plugin Published! 🔌</h2>
    <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
      Great news {{userName}}! Your plugin <strong>{{pluginName}}</strong> (v{{version}}) has been approved and published to the NexDesign Marketplace.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">View in Marketplace</a>
    </div>
  </div>
</div>`
  },
  {
    id: 'collaboration_invite',
    name: 'Canvas Collaboration Invite',
    subject: '{{inviterName}} invited you to edit a design room 🎨',
    category: 'collaboration',
    variables: ['userName', 'inviterName', 'projectName', 'actionUrl'],
    bodyText:
      'Hi {{userName}},\n\n{{inviterName}} invited you to collaborate in real-time on "{{projectName}}".\n\nJoin Session: {{actionUrl}}\n\nThe NexDesign Team',
    bodyHtml: `
<div style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; padding: 32px;">
    <h2 style="color: #ffffff; font-size: 20px;">Real-Time Collaboration Invite 🎨</h2>
    <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
      Hi {{userName}}, <strong>{{inviterName}}</strong> has invited you to collaborate on the project <strong>{{projectName}}</strong>.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Join Live Canvas Room</a>
    </div>
  </div>
</div>`
  },
  {
    id: 'payment_receipt',
    name: 'Payment Receipt',
    subject: 'Payment Receipt from NexDesign 📄',
    category: 'billing',
    variables: ['userName', 'planName', 'price', 'receiptId', 'date'],
    bodyText:
      'Hi {{userName}},\n\nThank you for your payment of ${{price}} for {{planName}} (Receipt #{{receiptId}}).\n\nThe NexDesign Team',
    bodyHtml: `
<div style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; padding: 32px;">
    <h2 style="color: #ffffff; font-size: 20px;">Payment Receipt 📄</h2>
    <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
      Thank you for your payment, {{userName}}. Here are your invoice details:
    </p>
    <div style="margin: 24px 0; background-color: #09090b; border: 1px solid #27272a; padding: 16px; border-radius: 12px; font-size: 13px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #a1a1aa;">Receipt ID:</span>
        <span style="color: #ffffff; font-mono: true;">#{{receiptId}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #a1a1aa;">Plan:</span>
        <span style="color: #ffffff;">{{planName}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #a1a1aa;">Date:</span>
        <span style="color: #ffffff;">{{date}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #27272a; padding-top: 8px; font-weight: bold;">
        <span style="color: #a1a1aa;">Total Paid:</span>
        <span style="color: #a855f7; font-size: 16px;">\${{price}}</span>
      </div>
    </div>
  </div>
</div>`
  }
]
