import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const PageHeaderContext = createContext(null)

export function PageHeaderProvider({ children }) {
  const [headerContent, setHeaderContent] = useState(null)

  const value = useMemo(
    () => ({ headerContent, setHeaderContent }),
    [headerContent]
  )

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext)

  if (!context) {
    throw new Error('usePageHeader must be used within PageHeaderProvider')
  }

  return context
}

export function usePageHeaderContent(content) {
  const { setHeaderContent } = usePageHeader()

  useEffect(() => {
    setHeaderContent(content)
    return () => setHeaderContent(null)
  }, [content, setHeaderContent])
}
