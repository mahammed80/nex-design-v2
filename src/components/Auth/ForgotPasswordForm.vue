<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'switchView', view: 'signin'): void
}>()

const email = ref('')
const isSubmitted = ref(false)

function handleSubmit() {
  if (!email.value.trim()) return
  isSubmitted.value = true
}
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <h2 class="text-lg font-bold text-white tracking-tight">Reset your password</h2>
      <p class="text-xs text-zinc-400">Enter your email and we'll send you instructions to reset your password</p>
    </div>

    <div v-if="isSubmitted" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-2">
      <div class="font-bold flex items-center gap-1.5">
        <span>✉️ Check your inbox</span>
      </div>
      <p>
        If an account exists for <span class="font-bold text-white">{{ email }}</span>, you will receive a password reset link shortly.
      </p>
      <button @click="$emit('switchView', 'signin')" class="text-xs text-violet-400 font-semibold hover:underline pt-2 block">
        Return to Sign In
      </button>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-4 text-xs">
      <div>
        <label class="block text-zinc-400 mb-1 font-medium">Account Email Address</label>
        <input
          v-model="email"
          type="email"
          required
          placeholder="name@company.com"
          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
        />
      </div>

      <button
        type="submit"
        class="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-white shadow-lg shadow-violet-600/20 transition"
      >
        Send Reset Link
      </button>

      <div class="text-center text-xs text-zinc-400 pt-2">
        Remembered your password?
        <button @click="$emit('switchView', 'signin')" class="text-violet-400 font-semibold hover:underline ml-1">
          Back to Sign In
        </button>
      </div>
    </form>
  </div>
</template>
