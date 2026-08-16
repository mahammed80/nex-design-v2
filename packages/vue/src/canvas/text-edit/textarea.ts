import { watch } from 'vue'
import type { ShallowRef } from 'vue'

import type { Editor } from '@nex-design/core/editor'

export function createHiddenTextArea() {
  const textarea = document.createElement('textarea')
  textarea.style.cssText =
    'position:fixed;opacity:0;width:1px;height:1px;padding:0;border:0;top:50%;left:50%;overflow:hidden;resize:none;'
  textarea.autocomplete = 'off'
  textarea.setAttribute('autocorrect', 'off')
  textarea.setAttribute('autocapitalize', 'none')
  textarea.spellcheck = false
  textarea.tabIndex = -1
  textarea.setAttribute('aria-label', 'Canvas text editor input')
  document.body.appendChild(textarea)
  return textarea
}

export function focusTextAreaOnCanvasPointerDown(
  textareaRef: ShallowRef<HTMLTextAreaElement | null>,
  store: Editor
) {
  if (store.state.editingTextId && textareaRef.value) {
    requestAnimationFrame(() => textareaRef.value?.focus())
  }
}

export function useTextEditingSession({
  store,
  textareaRef,
  resetBlink,
  stopBlink,
  resetComposition,
  onInput,
  onCompositionStart,
  onCompositionEnd,
  onKeyDown
}: {
  store: Editor
  textareaRef: ShallowRef<HTMLTextAreaElement | null>
  resetBlink: () => void
  stopBlink: () => void
  resetComposition: () => void
  onInput: (e: Event) => void
  onCompositionStart: (e: Event) => void
  onCompositionEnd: (e: CompositionEvent) => void
  onKeyDown: (e: KeyboardEvent) => void
}) {
  watch(
    () => store.state.editingTextId,
    (id, _, onCleanup) => {
      if (id) {
        const el = createHiddenTextArea()
        textareaRef.value = el

        el.addEventListener('input', onInput)
        el.addEventListener('compositionstart', onCompositionStart)
        el.addEventListener('compositionend', onCompositionEnd)
        el.addEventListener('keydown', onKeyDown)

        el.focus()
        resetBlink()

        onCleanup(() => {
          stopBlink()
          el.removeEventListener('input', onInput)
          el.removeEventListener('compositionstart', onCompositionStart)
          el.removeEventListener('compositionend', onCompositionEnd)
          el.removeEventListener('keydown', onKeyDown)
          el.remove()
          textareaRef.value = null
          resetComposition()
        })
      }
    }
  )
}
