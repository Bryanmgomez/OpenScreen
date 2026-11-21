import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'

export function AppShell() {
  return (
    <div className="shell">
      <TitleBar />
      <div className="shell__body">
        <Sidebar />
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
