<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/app/auth/store'
import type { PreferredOS, UserType } from '@/app/auth/types'

const emit = defineEmits<{
  (e: 'switchView', view: 'signin'): void
}>()

const { signUp } = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const userType = ref<UserType>('student')
const institution = ref('')
const facultyMajor = ref('')
const graduationYear = ref(2026)
const preferredOs = ref<PreferredOS>('windows')
const primaryUseCase = ref('UI/UX & Prototyping')
const agreeTerms = ref(true)
const errorMessage = ref('')
const isSubmitting = ref(false)

const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years: number[] = []
  if (userType.value === 'student') {
    for (let y = currentYear; y <= currentYear + 6; y++) years.push(y)
  } else {
    for (let y = currentYear; y >= currentYear - 25; y--) years.push(y)
  }
  return years
})

async function handleSignUp() {
  if (!agreeTerms.value) {
    errorMessage.value = 'You must agree to the Terms of Service & Privacy Policy.'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long.'
    return
  }

  if (confirmPassword.value && password.value !== confirmPassword.value) {
    errorMessage.value = 'Password and Confirm Password do not match.'
    return
  }

  if (!institution.value.trim() || !facultyMajor.value.trim()) {
    errorMessage.value =
      userType.value === 'student'
        ? 'Please specify your University / College and Faculty / Major.'
        : 'Please specify your Alma Mater / Company and Specialization.'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const res = await signUp(name.value, email.value, password.value, 'plan-pro', {
      userType: userType.value,
      institution: institution.value.trim(),
      facultyMajor: facultyMajor.value.trim(),
      graduationYear: Number(graduationYear.value),
      preferredOs: preferredOs.value,
      primaryUseCase: primaryUseCase.value
    })
    if (!res.success) {
      errorMessage.value = res.message
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
    <div class="space-y-1">
      <h2 class="text-lg font-bold text-white tracking-tight">Create your NexDesign Account</h2>
      <p class="text-xs text-zinc-400">Join the waitlist & unlock early access to the desktop suite</p>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
      {{ errorMessage }}
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSignUp" class="space-y-3.5 text-xs">
      <!-- Profile Type Switcher -->
      <div>
        <label class="block text-zinc-400 mb-1 font-medium">Profile Type *</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="userType = 'student'"
            class="p-2.5 rounded-xl border text-left transition flex items-center gap-2"
            :class="
              userType === 'student'
                ? 'bg-rose-600/15 border-rose-500 text-rose-200 font-semibold'
                : 'bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20'
            "
          >
            <span class="text-sm">🎓</span>
            <div>
              <div class="text-xs font-bold text-white leading-tight">Student</div>
              <div class="text-[9px] text-zinc-400">University / College</div>
            </div>
          </button>

          <button
            type="button"
            @click="userType = 'graduate'"
            class="p-2.5 rounded-xl border text-left transition flex items-center gap-2"
            :class="
              userType === 'graduate'
                ? 'bg-rose-600/15 border-rose-500 text-rose-200 font-semibold'
                : 'bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20'
            "
          >
            <span class="text-sm">💼</span>
            <div>
              <div class="text-xs font-bold text-white leading-tight">Graduate & Pro</div>
              <div class="text-[9px] text-zinc-400">Alumni or Studio</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Account Info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-zinc-400 mb-1 font-medium">Full Name *</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="e.g. Alex Johnson"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>

        <div>
          <label class="block text-zinc-400 mb-1 font-medium">Work or Student Email *</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="alex@university.edu"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>
      </div>

      <!-- Passwords -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-zinc-400 mb-1 font-medium">Password *</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="At least 8 characters"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>

        <div>
          <label class="block text-zinc-400 mb-1 font-medium">Confirm Password *</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            placeholder="Repeat password"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>
      </div>

      <!-- Academic / Organization Details -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-zinc-400 mb-1 font-medium">
            {{ userType === 'student' ? 'University / College *' : 'Alma Mater / Company *' }}
          </label>
          <input
            v-model="institution"
            type="text"
            required
            placeholder="e.g. Cairo University, MIT"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>

        <div>
          <label class="block text-zinc-400 mb-1 font-medium">
            {{ userType === 'student' ? 'Faculty / Major *' : 'Specialization *' }}
          </label>
          <input
            v-model="facultyMajor"
            type="text"
            required
            placeholder="e.g. Computer Science, Design"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>
      </div>

      <!-- Year and OS Selection -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-zinc-400 mb-1 font-medium">
            {{ userType === 'student' ? 'Graduation Year *' : 'Graduated in Year *' }}
          </label>
          <select
            v-model="graduationYear"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition cursor-pointer"
          >
            <option v-for="year in yearOptions" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-zinc-400 mb-1 font-medium">Preferred OS *</label>
          <select
            v-model="preferredOs"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition cursor-pointer"
          >
            <option value="windows">Windows (x64)</option>
            <option value="mac_arm">macOS (Apple Silicon M-Series)</option>
            <option value="mac_intel">macOS (Intel)</option>
            <option value="linux">Linux</option>
          </select>
        </div>
      </div>

      <div class="pt-1">
        <label class="flex items-start gap-2 text-zinc-400 cursor-pointer">
          <input v-model="agreeTerms" type="checkbox" class="mt-0.5 rounded bg-zinc-950 border-white/10 text-rose-600 w-4 h-4 shrink-0" />
          <span>I agree to the <a href="https://nex-design.online" target="_blank" class="text-rose-400 hover:underline">Terms of Service</a> and <a href="https://nex-design.online" target="_blank" class="text-rose-400 hover:underline">Privacy Policy</a>.</span>
        </label>
      </div>

      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 font-semibold text-white shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
      >
        {{ isSubmitting ? 'Reserving Early Access…' : 'Create Account & Reserve Early Access' }}
      </button>
    </form>

    <!-- Toggle to Sign In -->
    <div class="text-center text-xs text-zinc-400 pt-2 border-t border-white/5">
      Already have an account?
      <button @click="emit('switchView', 'signin')" class="text-rose-400 font-semibold hover:underline ml-1">
        Sign in
      </button>
    </div>
  </div>
</template>
