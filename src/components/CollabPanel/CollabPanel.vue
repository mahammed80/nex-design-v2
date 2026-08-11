  <script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CollabAvatarStack from '@/components/CollabPanel/CollabAvatarStack.vue'
import CollabSharePopover from '@/components/CollabPanel/CollabSharePopover.vue'
import { provideCollabPanel } from '@/components/CollabPanel/context'

provideCollabPanel()

const router = useRouter()

const activeAccount = ref(localStorage.getItem('nex-design:active-account') || localStorage.getItem('nex-design:user-name') || 'Mohamed')
const accounts = ref<string[]>(JSON.parse(localStorage.getItem('nex-design:accounts') || '[]'))

if (accounts.value.length === 0) {
  accounts.value = [activeAccount.value]
  localStorage.setItem('nex-design:accounts', JSON.stringify(accounts.value))
}

const isAddAccountOpen = ref(false)
const newAccountName = ref('')

function switchAccount(name: string) {
  activeAccount.value = name
  localStorage.setItem('nex-design:active-account', name)
  localStorage.setItem('nex-design:user-name', name)
  window.location.reload()
}

function openAddAccount() {
  newAccountName.value = ''
  isAddAccountOpen.value = true
}

function addAccount() {
  const name = newAccountName.value.trim()
  if (!name) return
  if (!accounts.value.includes(name)) {
    accounts.value.push(name)
    localStorage.setItem('nex-design:accounts', JSON.stringify(accounts.value))
  }
  isAddAccountOpen.value = false
  switchAccount(name)
}

function signOut() {
  localStorage.removeItem('nex-design:active-account')
  localStorage.removeItem('nex-design:user-name')
  router.push('/landing')
}
</script>

<template>
  <div class="flex w-full items-center justify-end gap-2">
    <CollabAvatarStack />
    <div class="flex-1" />
    <CollabSharePopover />

    <!-- User Profile Account Dropdown inside Design Editor -->
    <div class="relative group/editor-account shrink-0 select-none">
      <button
        type="button"
        class="w-7 h-7 rounded-full bg-accent/20 border border-accent/35 flex items-center justify-center font-bold text-accent text-xs cursor-pointer hover:bg-accent/30 transition-all uppercase"
        title="Account Settings"
      >
        {{ activeAccount[0] }}
      </button>
      
      <!-- Dropdown Menu -->
      <div class="absolute right-0 top-full mt-1.5 w-44 rounded-lg border border-border bg-panel p-1 shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover/editor-account:opacity-100 group-hover/editor-account:translate-y-0 group-hover/editor-account:pointer-events-auto transition-all duration-150 z-50 text-surface before:absolute before:inset-x-0 before:h-2 before:bottom-full">
        <div class="px-2 py-1 text-[9px] font-semibold text-muted uppercase tracking-wider border-b border-border mb-1">Accounts</div>
        <!-- Active Account name display -->
        <div class="px-2 py-1 text-xs font-bold truncate text-surface bg-hover/30 rounded mb-1">{{ activeAccount }}</div>
        
        <!-- List other accounts -->
        <button
          v-for="acc in accounts.filter(a => a !== activeAccount)"
          :key="acc"
          @click="switchAccount(acc)"
          type="button"
          class="w-full text-left px-2 py-1.5 rounded text-xs text-muted hover:bg-hover hover:text-surface transition-colors truncate flex items-center gap-1.5"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-border" />
          {{ acc }}
        </button>
        <button
          @click="openAddAccount"
          type="button"
          class="w-full text-left px-2 py-1.5 rounded text-xs text-white hover:bg-accent/10 transition-colors flex items-center gap-1.5"
        >
          <icon-lucide-plus class="size-3" />
          Add Account
        </button>
        <button
          @click="signOut"
          type="button"
          class="w-full text-left px-2 py-1.5 rounded text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-border mt-1 pt-1.5 flex items-center gap-1.5"
        >
          <icon-lucide-log-out class="size-3" />
          Sign Out
        </button>
      </div>
    </div>

    <!-- Add Account Dialog -->
    <Teleport to="body">
      <div
        v-if="isAddAccountOpen"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <div class="w-full max-w-sm rounded-xl border border-border bg-panel p-6 shadow-2xl animate-scale-up text-surface">
          <h3 class="text-sm font-bold text-[#fafafa] mb-4">Add Account</h3>
          <div class="space-y-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-semibold text-muted uppercase tracking-wider">Account Name</label>
              <input
                v-model="newAccountName"
                type="text"
                placeholder="e.g. Sarah"
                class="h-9 px-3 rounded border border-border bg-input text-xs text-surface focus:outline-none focus:border-accent"
                @keydown.enter="addAccount"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 mt-6">
            <button
              @click="isAddAccountOpen = false"
              type="button"
              class="h-9 px-4 rounded border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              @click="addAccount"
              type="button"
              class="h-9 px-4 rounded bg-accent hover:bg-accent/80 text-white text-xs font-bold transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
