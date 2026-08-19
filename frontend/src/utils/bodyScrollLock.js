let lockCount = 0
let savedOverflow = ''
let savedTouchAction = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') {
    return () => {}
  }

  const { body } = document

  if (lockCount === 0) {
    savedOverflow = body.style.overflow
    savedTouchAction = body.style.touchAction
  }

  lockCount += 1
  body.style.overflow = 'hidden'
  body.style.touchAction = 'none'

  let released = false

  return () => {
    if (released || typeof document === 'undefined') return

    released = true
    lockCount = Math.max(0, lockCount - 1)

    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow
      document.body.style.touchAction = savedTouchAction
    }
  }
}
