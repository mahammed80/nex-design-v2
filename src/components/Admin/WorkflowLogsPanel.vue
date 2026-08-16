<script setup lang="ts">
import { ref } from 'vue'
import { useAdminStore } from '@/app/admin/store'
import type { WorkflowLogRecord } from '@/app/admin/types'

const {
  workflowLogs,
  workflowSearchQuery,
  workflowSessionFilter,
  workflowStatusFilter,
  filteredWorkflowLogs,
  addWorkflowLog
} = useAdminStore()

const isAddModalOpen = ref(false)
const newAgentRole = ref('Design Architect')
const newAction = ref('design_skeleton')
const newSessionType = ref<'acp' | 'mcp' | 'in-app'>('acp')
const newTargetNodeId = ref('')
const newCredits = ref(15)
const newStatus = ref<'success' | 'failed' | 'running'>('success')
const newDetails = ref('')

function handleCreateLog() {
  if (!newDetails.value.trim()) return
  addWorkflowLog({
    sessionType: newSessionType.value,
    agentRole: newAgentRole.value,
    action: newAction.value,
    targetNodeId: newTargetNodeId.value.trim() || undefined,
    aiCreditsSpent: newCredits.value,
    status: newStatus.value,
    details: newDetails.value.trim()
  })
  isAddModalOpen.value = false
  newDetails.value = ''
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Summary Stats -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-[#fafafa] tracking-tight">Workflow & Telemetry Audit</h2>
        <p class="text-xs text-[#a1a1aa] mt-1">
          Monitor live agentic workflow executions, ACP/MCP session protocols, AI credit consumption, and audit passes.
        </p>
      </div>
      <button
        @click="isAddModalOpen = true"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 transition shrink-0"
      >
        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Simulate Workflow Execution
      </button>
    </div>

    <!-- Quick Telemetry Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-2xl border border-white/5 bg-[#18181b] p-4">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">Total Workflow Executions</div>
        <div class="text-2xl font-bold text-[#fafafa] mt-1">{{ workflowLogs.length }}</div>
        <div class="text-[10px] text-emerald-400 mt-1">✓ ACP + MCP agent sessions</div>
      </div>
      <div class="rounded-2xl border border-white/5 bg-[#18181b] p-4">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">AI Credits Consumed</div>
        <div class="text-2xl font-bold text-violet-400 mt-1">
          {{ workflowLogs.reduce((acc, l) => acc + l.aiCreditsSpent, 0) }}
        </div>
        <div class="text-[10px] text-[#a1a1aa] mt-1">Tracked across active sessions</div>
      </div>
      <div class="rounded-2xl border border-white/5 bg-[#18181b] p-4">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">Successful Audit Passes</div>
        <div class="text-2xl font-bold text-emerald-400 mt-1">
          {{ workflowLogs.filter((l) => l.status === 'success').length }}
        </div>
        <div class="text-[10px] text-[#71717a] mt-1">Deterministic slop check clean</div>
      </div>
      <div class="rounded-2xl border border-white/5 bg-[#18181b] p-4">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">Failed Audit Checks</div>
        <div class="text-2xl font-bold text-rose-400 mt-1">
          {{ workflowLogs.filter((l) => l.status === 'failed').length }}
        </div>
        <div class="text-[10px] text-rose-400/80 mt-1">Requires refactoring or retry</div>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-white/5 bg-[#18181b]">
      <div class="relative flex-1">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="workflowSearchQuery"
          type="text"
          placeholder="Filter by agent role, action name, or details..."
          class="w-full h-9 pl-9 pr-3 rounded-xl border border-white/5 bg-[#121215] text-xs text-[#eae8e4] placeholder-[#71717a] focus:outline-none focus:border-violet-500/50"
        />
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <select
          v-model="workflowSessionFilter"
          class="h-9 px-3 rounded-xl border border-white/5 bg-[#121215] text-xs text-[#eae8e4] focus:outline-none focus:border-violet-500/50"
        >
          <option value="all">All Protocols</option>
          <option value="acp">ACP Subprocess</option>
          <option value="mcp">MCP WebSocket</option>
          <option value="in-app">In-App Chat</option>
        </select>

        <select
          v-model="workflowStatusFilter"
          class="h-9 px-3 rounded-xl border border-white/5 bg-[#121215] text-xs text-[#eae8e4] focus:outline-none focus:border-violet-500/50"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
        </select>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="rounded-2xl border border-white/5 bg-[#18181b] overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-white/5 bg-[#121215] text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
              <th class="py-3 px-4">Time</th>
              <th class="py-3 px-4">Protocol</th>
              <th class="py-3 px-4">Agent Role</th>
              <th class="py-3 px-4">Action</th>
              <th class="py-3 px-4">Target Node</th>
              <th class="py-3 px-4">AI Credits</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr
              v-for="log in filteredWorkflowLogs"
              :key="log.id"
              class="hover:bg-white/[0.02] transition"
            >
              <td class="py-3 px-4 font-mono text-[11px] text-[#a1a1aa]">
                {{ formatDate(log.timestamp) }}
              </td>
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase"
                  :class="{
                    'bg-violet-500/10 text-violet-300 border border-violet-500/20': log.sessionType === 'acp',
                    'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20': log.sessionType === 'mcp',
                    'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20': log.sessionType === 'in-app'
                  }"
                >
                  {{ log.sessionType }}
                </span>
              </td>
              <td class="py-3 px-4 font-medium text-[#fafafa]">
                {{ log.agentRole }}
              </td>
              <td class="py-3 px-4 font-mono text-[#a1a1aa]">
                {{ log.action }}
              </td>
              <td class="py-3 px-4 font-mono text-[11px] text-[#71717a]">
                {{ log.targetNodeId || '—' }}
              </td>
              <td class="py-3 px-4 font-mono text-violet-300 font-semibold">
                {{ log.aiCreditsSpent }} pts
              </td>
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  :class="{
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': log.status === 'success',
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20': log.status === 'failed',
                    'bg-amber-500/10 text-amber-300 border border-amber-500/20': log.status === 'running'
                  }"
                >
                  <span
                    class="size-1.5 rounded-full"
                    :class="{
                      'bg-emerald-400': log.status === 'success',
                      'bg-rose-400': log.status === 'failed',
                      'bg-amber-400 animate-pulse': log.status === 'running'
                    }"
                  />
                  {{ log.status }}
                </span>
              </td>
              <td class="py-3 px-4 text-[#a1a1aa] max-w-xs truncate" :title="log.details">
                {{ log.details }}
              </td>
            </tr>
            <tr v-if="filteredWorkflowLogs.length === 0">
              <td colspan="8" class="py-12 text-center text-xs text-[#71717a]">
                No workflow log records match your filter criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Simulate Workflow Modal -->
    <div
      v-if="isAddModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="isAddModalOpen = false"
    >
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-2xl space-y-4">
        <h3 class="text-base font-bold text-[#fafafa]">Simulate Workflow Execution</h3>
        
        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-[10px] font-semibold text-[#a1a1aa] uppercase mb-1">Protocol</label>
            <select
              v-model="newSessionType"
              class="w-full h-9 px-3 rounded-xl border border-white/5 bg-[#121215] text-[#eae8e4] focus:outline-none"
            >
              <option value="acp">ACP Subprocess</option>
              <option value="mcp">MCP Server</option>
              <option value="in-app">In-App Chat</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-semibold text-[#a1a1aa] uppercase mb-1">Agent Role</label>
            <input
              v-model="newAgentRole"
              type="text"
              class="w-full h-9 px-3 rounded-xl border border-white/5 bg-[#121215] text-[#eae8e4] focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-[10px] font-semibold text-[#a1a1aa] uppercase mb-1">Action Name</label>
            <input
              v-model="newAction"
              type="text"
              class="w-full h-9 px-3 rounded-xl border border-white/5 bg-[#121215] text-[#eae8e4] focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-[10px] font-semibold text-[#a1a1aa] uppercase mb-1">Target Node ID (Optional)</label>
            <input
              v-model="newTargetNodeId"
              type="text"
              placeholder="e.g. node-frame-101"
              class="w-full h-9 px-3 rounded-xl border border-white/5 bg-[#121215] text-[#eae8e4] focus:outline-none font-mono"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-[#a1a1aa] uppercase mb-1">Credits Spent</label>
              <input
                v-model.number="newCredits"
                type="number"
                class="w-full h-9 px-3 rounded-xl border border-white/5 bg-[#121215] text-[#eae8e4] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-[#a1a1aa] uppercase mb-1">Execution Status</label>
              <select
                v-model="newStatus"
                class="w-full h-9 px-3 rounded-xl border border-white/5 bg-[#121215] text-[#eae8e4] focus:outline-none"
              >
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-semibold text-[#a1a1aa] uppercase mb-1">Details & Result Summary</label>
            <textarea
              v-model="newDetails"
              rows="3"
              placeholder="Enter execution summary or error trace..."
              class="w-full p-2.5 rounded-xl border border-white/5 bg-[#121215] text-[#eae8e4] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            @click="isAddModalOpen = false"
            class="px-4 py-2 rounded-xl border border-white/5 bg-[#121215] text-xs font-semibold text-[#a1a1aa] hover:text-white transition"
          >
            Cancel
          </button>
          <button
            @click="handleCreateLog"
            class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition shadow-lg shadow-violet-600/20"
          >
            Log Execution
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
