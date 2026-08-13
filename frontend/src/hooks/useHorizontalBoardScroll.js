import { useEffect, useRef } from 'react'

export default function useHorizontalBoardScroll(topScrollRef, boardRef) {
  const syncLockRef = useRef(null)
  const dragCleanupRef = useRef(null)

  useEffect(() => {
    const top = topScrollRef.current
    const board = boardRef.current
    if (!top || !board) return

    const releaseLock = (source) => {
      requestAnimationFrame(() => {
        if (syncLockRef.current === source) {
          syncLockRef.current = null
        }
      })
    }

    const syncScroll = (source, target) => {
      if (syncLockRef.current === source) return

      syncLockRef.current = source
      if (Math.abs(target.scrollLeft - source.scrollLeft) > 1) {
        target.scrollLeft = source.scrollLeft
      }
      releaseLock(source)
    }

    const handleTopScroll = () => syncScroll(top, board)
    const handleBoardScroll = () => syncScroll(board, top)

    const startDragScroll = (container, event) => {
      if (event.button !== 0) return
      if (container.scrollWidth <= container.clientWidth + 1) return

      const interactiveTarget = event.target.closest(
        'button, a, input, textarea, select, [contenteditable="true"], [draggable="true"]',
      )
      if (interactiveTarget) return

      const startX = event.clientX
      const startScrollLeft = container.scrollLeft
      let hasMoved = false

      container.classList.add('cursor-grabbing')
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'

      const stopDragging = () => {
        container.classList.remove('cursor-grabbing')
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', stopDragging)
        dragCleanupRef.current = null
      }

      const handleMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX
        if (Math.abs(deltaX) > 3) {
          hasMoved = true
        }

        if (!hasMoved) return

        container.scrollLeft = startScrollLeft - deltaX
        moveEvent.preventDefault()
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', stopDragging)
      dragCleanupRef.current = stopDragging
    }

    const handleTopMouseDown = (event) => startDragScroll(top, event)
    const handleBoardMouseDown = (event) => startDragScroll(board, event)

    top.addEventListener('scroll', handleTopScroll, { passive: true })
    board.addEventListener('scroll', handleBoardScroll, { passive: true })
    top.addEventListener('mousedown', handleTopMouseDown)
    board.addEventListener('mousedown', handleBoardMouseDown)

    return () => {
      top.removeEventListener('scroll', handleTopScroll)
      board.removeEventListener('scroll', handleBoardScroll)
      top.removeEventListener('mousedown', handleTopMouseDown)
      board.removeEventListener('mousedown', handleBoardMouseDown)
      dragCleanupRef.current?.()
    }
  }, [topScrollRef, boardRef])
}
