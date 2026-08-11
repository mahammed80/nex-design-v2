import { onMounted, onUnmounted } from 'vue'

export function useScrollReveal() {
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    const elements = document.querySelectorAll(
      '.reveal-up, .reveal-down, .reveal-left, .reveal-right, .reveal-scale'
    )

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer?.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.05, // Trigger as soon as 5% of the element enters viewport
        rootMargin: '0px 0px -60px 0px'
      }
    )

    elements.forEach((el) => {
      observer?.observe(el)
    })
  })

  onUnmounted(() => {
    observer?.disconnect()
  })
}
