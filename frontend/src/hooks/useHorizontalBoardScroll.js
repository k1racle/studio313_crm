import { useEffect, useRef } from 'react'

export default function useHorizontalBoardScroll(topScrollRef, boardRef) {
  const syncLockRef = useRef(null)

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

    const handleWheel = (event) => {
      const target = event.currentTarget
      const canScrollHorizontally = target.scrollWidth > target.clientWidth + 1
      if (!canScrollHorizontally) return

      const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (!dominantDelta) return

      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return
      }

      event.preventDefault()
      target.scrollBy({ left: dominantDelta, behavior: 'auto' })
    }

    top.addEventListener('scroll', handleTopScroll, { passive: true })
    board.addEventListener('scroll', handleBoardScroll, { passive: true })
    top.addEventListener('wheel', handleWheel, { passive: false })
    board.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      top.removeEventListener('scroll', handleTopScroll)
      board.removeEventListener('scroll', handleBoardScroll)
      top.removeEventListener('wheel', handleWheel)
      board.removeEventListener('wheel', handleWheel)
    }
  }, [topScrollRef, boardRef])
}
