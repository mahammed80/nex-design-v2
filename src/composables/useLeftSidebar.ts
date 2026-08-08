import { ref } from 'vue'

const activeLeftTab = ref<'layers' | 'fonts'>('layers')

export function useLeftSidebar() {
  return { activeLeftTab }
}
