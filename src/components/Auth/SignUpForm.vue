<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/app/auth/store'

const emit = defineEmits<{
  (e: 'switchView', view: 'signin'): void
}>()

const { signUp } = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const planId = ref('plan-pro')
const agreeTerms = ref(true)
const errorMessage = ref('')

function handleSignUp() {
  if (!agreeTerms.value) {
    errorMessage.value = 'You must agree to the Terms of Service & Privacy Policy.'
    return
  }

  errorMessage.value = ''
  const res = signUp(name.value, email.value, password.value, planId.value)
  if (!res.success) {
    errorMessage.value = res.message
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <h2 class="text-lg font-bold text-white tracking-tight">Create your NexDesign Account</h2>
      <p class="text-xs text-zinc-400">Join thousands of designers building fast, vector-first interfaces</p>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
      {{ errorMessage }}
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSignUp" class="space-y-4 text-xs">
      <div>
        <label class="block text-zinc-400 mb-1 font-medium">Full Name *</label>
        <input
          v-model="name"
          type="text"
          required
          placeholder="e.g. Alex Johnson"
          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
        />
      </div>

      <div>
        <label class="block text-zinc-400 mb-1 font-medium">Work Email *</label>
        <input
          v-model="email"
          type="email"
          required
          placeholder="alex@designstudio.io"
          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
        />
      </div>

      <div>
        <label class="block text-zinc-400 mb-1 font-medium">Create Password *</label>
        <input
          v-model="password"
          type="password"
          required
          placeholder="At least 8 characters"
          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
        />
      </div>

      <!-- Plan Selection -->
      <div>
        <label class="block text-zinc-400 mb-1.5 font-medium">Starting Plan Tier</label>
        <div class="grid grid-cols-2 gap-3">
          <div
            @click="planId = 'plan-free'"
            class="p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between"
            :class="planId === 'plan-free' ? 'bg-violet-600/10 border-violet-500 text-white' : 'bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20'"
          >
            <div class="font-bold text-xs">Free Starter</div>
            <div class="text-[10px] opacity-70 mt-1">$0 / mo • 3 Projects</div>
          </div>

          <div
            @click="planId = 'plan-pro'"
            class="p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between"
            :class="planId === 'plan-pro' ? 'bg-violet-600/10 border-violet-500 text-white' : 'bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20'"
          >
            <div class="font-bold text-xs flex items-center justify-between">
              Pro Designer
              <span class="text-[9px] bg-violet-600 text-white px-1.5 py-0.2 rounded uppercase">14d Trial</span>
            </div>
            <div class="text-[10px] opacity-70 mt-1">$19 / mo • Unlimited</div>
          </div>
        </div>
      </div>

      <div class="pt-1">
        <label class="flex items-start gap-2 text-zinc-400 cursor-pointer">
          <input v-model="agreeTerms" type="checkbox" class="mt-0.5 rounded bg-zinc-950 border-white/10 text-violet-600 w-4 h-4 shrink-0" />
          <span>I agree to the <a href="#" class="text-violet-400 hover:underline">Terms of Service</a> and <a href="#" class="text-violet-400 hover:underline">Privacy Policy</a>.</span>
        </label>
      </div>

      <button
        type="submit"
        class="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-semibold text-white shadow-lg shadow-violet-600/20 transition"
      >
        Create Account & Get Started
      </button>
    </form>

    <!-- Toggle to Sign In -->
    <div class="text-center text-xs text-zinc-400 pt-2">
      Already have an account?
      <button @click="$emit('switchView', 'signin')" class="text-violet-400 font-semibold hover:underline ml-1">
        Sign in
      </button>
    </div>
  </div>
</template>
