<script setup lang="ts">
import { ref } from 'vue'
import { useEmailStore } from '@/app/email/store'
import type { EmailTemplateId } from '@/app/email/types'

const {
  activeSubTab,
  selectedTemplateId,
  selectedTemplate,
  templatesList,
  filteredLogs,
  emailSearchQuery,
  updateTemplate,
  dispatchTestEmail,
  clearLogs,
  compileTemplate
} = useEmailStore()

// Test Email Modal State
const isTestModalOpen = ref(false)
const testEmail = ref('test.designer@example.com')
const testName = ref('Alex Rivera')
const testSentSuccess = ref(false)

function handleSaveSubject(newSubject: string) {
  updateTemplate(selectedTemplateId.value, { subject: newSubject })
}

function handleSaveBodyHtml(newHtml: string) {
  updateTemplate(selectedTemplateId.value, { bodyHtml: newHtml })
}

function handleSendTest() {
  if (!testEmail.value.trim()) return
  dispatchTestEmail(selectedTemplateId.value, testEmail.value.trim(), testName.value.trim() || 'Tester')
  testSentSuccess.value = true
  setTimeout(() => {
    testSentSuccess.value = false
    isTestModalOpen.value = false
  }, 1200)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Sub-tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div>
        <h2 class="text-xl font-bold text-white tracking-tight">Email System Governance</h2>
        <p class="text-xs text-zinc-400 mt-1">Manage transactional email templates, live HTML previews, and delivery logs</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Sub-tabs switcher -->
        <div class="flex p-1 rounded-xl bg-zinc-900 border border-white/10 text-xs">
          <button
            @click="activeSubTab = 'templates'"
            class="px-3.5 py-1.5 rounded-lg font-medium transition"
            :class="activeSubTab === 'templates' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'"
          >
            Email Templates ({{ templatesList.length }})
          </button>
          <button
            @click="activeSubTab = 'logs'"
            class="px-3.5 py-1.5 rounded-lg font-medium transition"
            :class="activeSubTab === 'logs' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'"
          >
            Delivery Logs ({{ filteredLogs.length }})
          </button>
        </div>

        <button
          @click="isTestModalOpen = true"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 transition"
        >
          <span>✉️</span>
          Send Test Email
        </button>
      </div>
    </div>

    <!-- TAB 1: TEMPLATE EDITOR & LIVE PREVIEW -->
    <div v-if="activeSubTab === 'templates'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left sidebar template picker -->
      <div class="lg:col-span-4 space-y-2">
        <div class="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 mb-2">
          Select Email Event Template
        </div>

        <div class="space-y-1">
          <button
            v-for="tpl in templatesList"
            :key="tpl.id"
            @click="selectedTemplateId = tpl.id"
            class="w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium text-left border transition"
            :class="[
              selectedTemplateId === tpl.id
                ? 'bg-violet-600/15 text-white border-violet-500/40 shadow-inner'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:bg-white/5 hover:text-zinc-200'
            ]"
          >
            <div>
              <div class="font-bold text-white leading-snug">{{ tpl.name }}</div>
              <div class="text-[10px] text-zinc-400 truncate max-w-[200px]">{{ tpl.subject }}</div>
            </div>

            <span class="px-2 py-0.5 text-[9px] font-mono uppercase rounded bg-zinc-800 text-zinc-300">
              {{ tpl.category }}
            </span>
          </button>
        </div>
      </div>

      <!-- Right main template editor & live preview -->
      <div class="lg:col-span-8 space-y-5">
        <!-- Template Metadata & Subject -->
        <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 text-xs">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              {{ selectedTemplate.name }}
              <span class="text-[10px] font-mono text-violet-400">id: {{ selectedTemplate.id }}</span>
            </h3>
          </div>

          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Subject Line</label>
            <input
              :value="selectedTemplate.subject"
              @input="(e) => handleSaveSubject((e.target as HTMLInputElement).value)"
              type="text"
              class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white font-medium focus:outline-none focus:border-violet-500"
            />
          </div>

          <!-- Variable Placeholders -->
          <div>
            <span class="text-zinc-400 block mb-1 font-medium">Available Variables</span>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="v in selectedTemplate.variables"
                :key="v"
                class="px-2.5 py-1 rounded-md bg-violet-600/10 text-violet-300 border border-violet-500/20 font-mono text-[10px]"
              >
                &#123;&#123;{{ v }}&#125;&#125;
              </span>
            </div>
          </div>
        </div>

        <!-- Live HTML Preview -->
        <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <span class="text-xs font-bold text-white flex items-center gap-2">
              🖥️ Live Rendered HTML Email Preview
            </span>
            <span class="text-[10px] text-zinc-500">Variables automatically interpolated</span>
          </div>

          <div class="rounded-xl overflow-hidden border border-white/10 bg-zinc-950 min-h-[360px]">
            <div
              class="p-4"
              v-html="compileTemplate(selectedTemplate.bodyHtml, {
                userName: 'Mohamed Ahmed',
                planName: 'Pro Designer',
                price: '19',
                billingCycle: 'monthly',
                pluginName: 'AI Component Builder',
                version: '1.4.0',
                inviterName: 'Sarah Chen',
                projectName: 'Dashboard Redesign',
                receiptId: '8942-019',
                actionUrl: 'http://localhost:5173/',
                date: new Date().toLocaleDateString()
              })"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: SENT EMAIL DELIVERY AUDIT LOGS -->
    <div v-else class="space-y-4">
      <!-- Search & Actions Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
        <div class="w-full sm:w-80 relative">
          <svg class="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="emailSearchQuery"
            type="text"
            placeholder="Search logs by recipient, subject, or event..."
            class="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        <button
          @click="clearLogs"
          class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
        >
          Clear Delivery Logs
        </button>
      </div>

      <!-- Logs Table -->
      <div class="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 bg-zinc-950/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th class="py-3.5 px-4">Recipient</th>
                <th class="py-3.5 px-4">Event Template</th>
                <th class="py-3.5 px-4">Subject</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4 text-right">Sent Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-xs text-zinc-300">
              <tr v-for="log in filteredLogs" :key="log.id" class="hover:bg-white/5 transition">
                <td class="py-3.5 px-4 font-semibold text-white">
                  <div>{{ log.recipientName }}</div>
                  <div class="text-[11px] text-zinc-400 font-normal">{{ log.recipientEmail }}</div>
                </td>

                <td class="py-3.5 px-4 font-mono text-[11px] text-violet-400">
                  {{ log.templateId }}
                </td>

                <td class="py-3.5 px-4 text-zinc-200">
                  {{ log.subject }}
                </td>

                <td class="py-3.5 px-4">
                  <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {{ log.status }}
                  </span>
                </td>

                <td class="py-3.5 px-4 text-right text-zinc-400 text-[11px]">
                  {{ new Date(log.sentAt).toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SEND TEST EMAIL MODAL -->
    <div v-if="isTestModalOpen" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div class="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-6 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 class="text-base font-bold text-white">Dispatch Test Email</h3>
          <button @click="isTestModalOpen = false" class="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div v-if="testSentSuccess" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 text-center font-bold">
          ✓ Test Email Dispatched & Logged!
        </div>

        <div v-else class="space-y-4 text-xs">
          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Selected Template</label>
            <div class="p-2.5 rounded-xl bg-zinc-950 border border-white/10 font-bold text-violet-400">
              {{ selectedTemplate.name }} ({{ selectedTemplate.id }})
            </div>
          </div>

          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Recipient Name</label>
            <input v-model="testName" type="text" class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white" />
          </div>

          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Recipient Email</label>
            <input v-model="testEmail" type="email" class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white" />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button @click="isTestModalOpen = false" class="px-4 py-2 rounded-xl bg-white/5 text-xs font-semibold text-zinc-300">
            Cancel
          </button>
          <button @click="handleSendTest" class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow">
            Send Test
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
