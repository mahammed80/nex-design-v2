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
        <div class="flex items-center gap-3">
          <img src="/nexus-logo.webp" alt="Nexus Design Studios" class="h-8 w-auto rounded-md" />
          <div>
            <span class="text-sm font-bold text-white tracking-wide block">NexDesign Account</span>
            <span class="text-[9px] font-semibold text-rose-400 uppercase tracking-wider block">Powered by Nexus Design Studios</span>
          </div>
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
