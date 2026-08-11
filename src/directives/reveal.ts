import type { Directive } from 'vue'

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed')
      } else {
        entry.target.classList.remove('revealed')
      }
    })
  },
  {
    threshold: 0.05,
    rootMargin: '0px 0px -50px 0px' // Trigger slightly before it is fully in view
  }
)

export const vReveal: Directive = {
  mounted(el) {
    revealObserver.observe(el)
  },
  unmounted(el) {
    revealObserver.unobserve(el)
  }
}
export default vReveal
