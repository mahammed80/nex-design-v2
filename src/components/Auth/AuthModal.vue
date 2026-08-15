<script setup lang="ts">
import { useAuthStore } from '@/app/auth/store'
import SignInForm from './SignInForm.vue'
import SignUpForm from './SignUpForm.vue'
import ForgotPasswordForm from './ForgotPasswordForm.vue'
import type { AuthViewMode } from '@/app/auth/types'

const { isAuthModalOpen, activeAuthView, closeAuthModal } = useAuthStore()

function setView(mode: AuthViewMode) {
  activeAuthView.value = mode
}
</script>

<template>
  <div v-if="isAuthModalOpen" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-6 space-y-6 shadow-2xl relative overflow-hidden">
      <!-- Top Brand bar -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-0.5 shadow-md">
            <div class="h-full w-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <svg class="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
          </div>
          <span class="text-sm font-bold text-white tracking-wide">NexDesign Account</span>
        </div>

        <button @click="closeAuthModal" class="text-zinc-400 hover:text-white text-lg">✕</button>
      </div>

      <!-- View Switcher -->
      <SignInForm v-if="activeAuthView === 'signin'" @switch-view="setView" />
      <SignUpForm v-else-if="activeAuthView === 'signup'" @switch-view="setView" />
      <ForgotPasswordForm v-else-if="activeAuthView === 'forgot_password'" @switch-view="setView" />
    </div>
  </div>
</template>
