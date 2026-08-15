<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/app/auth/store'

const emit = defineEmits<{
  (e: 'switchView', view: 'signup' | 'forgot_password'): void
}>()

const { signIn } = useAuthStore()

const email = ref('mohamed@example.com')
const password = ref('••••••••••••')
const showPassword = ref(false)
const rememberMe = ref(true)
const errorMessage = ref('')

function handleSignIn() {
  errorMessage.value = ''
  const res = signIn(email.value, password.value)
  if (!res.success) {
    errorMessage.value = res.message
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <h2 class="text-lg font-bold text-white tracking-tight">Sign in to NexDesign</h2>
      <p class="text-xs text-zinc-400">Enter your account credentials to access your workspace</p>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
      {{ errorMessage }}
    </div>

    <!-- Form Inputs -->
    <form @submit.prevent="handleSignIn" class="space-y-4 text-xs">
      <div>
        <label class="block text-zinc-400 mb-1 font-medium">Work Email</label>
        <input
          v-model="email"
          type="email"
          required
          placeholder="name@company.com"
          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-zinc-400 font-medium">Password</label>
          <button
            type="button"
            @click="$emit('switchView', 'forgot_password')"
            class="text-[11px] text-violet-400 hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            placeholder="••••••••••••"
            class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {{ showPassword ? '🙈' : '👁️' }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1">
        <label class="flex items-center gap-2 text-zinc-300 cursor-pointer">
          <input v-model="rememberMe" type="checkbox" class="rounded bg-zinc-950 border-white/10 text-violet-600 w-4 h-4" />
          <span>Remember this device</span>
        </label>
      </div>

      <button
        type="submit"
        class="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-semibold text-white shadow-lg shadow-violet-600/20 transition"
      >
        Sign In
      </button>
    </form>

    <!-- Social OAuth Divider -->
    <div class="relative flex items-center justify-center my-4">
      <div class="w-full border-t border-white/10"></div>
      <span class="absolute px-3 bg-zinc-900 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
        or continue with
      </span>
    </div>

    <!-- Social OAuth Buttons -->
    <div class="grid grid-cols-2 gap-3 text-xs">
      <button
        type="button"
        @click="handleSignIn"
        class="py-2 px-3 rounded-xl bg-zinc-950 hover:bg-white/5 border border-white/10 text-zinc-200 flex items-center justify-center gap-2 font-medium transition"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Google
      </button>

      <button
        type="button"
        @click="handleSignIn"
        class="py-2 px-3 rounded-xl bg-zinc-950 hover:bg-white/5 border border-white/10 text-zinc-200 flex items-center justify-center gap-2 font-medium transition"
      >
        <svg class="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
        GitHub
      </button>
    </div>

    <!-- Toggle to Sign Up -->
    <div class="text-center text-xs text-zinc-400 pt-2">
      Don't have an account yet?
      <button @click="$emit('switchView', 'signup')" class="text-violet-400 font-semibold hover:underline ml-1">
        Create one now
      </button>
    </div>
  </div>
</template>
