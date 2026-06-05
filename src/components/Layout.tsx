import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/stores/authStore'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { perfil } = useAuthStore()
  const isJefatura = perfil?.rol === 'jefatura'

  return (
    <div className="min-h-screen min-w-[1280px] flex flex-col bg-bg">
      <TopBar />
      
      <div className={`flex-1 grid ${isJefatura ? 'grid-cols-[280px_1fr]' : 'grid-cols-1'}`}>
        {isJefatura && <Sidebar />}
        
        <main className="p-7 xl:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
