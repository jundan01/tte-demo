import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

function TopBar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { profile, signOut } = useAuth();
  return (
    <header className="h-[48px] flex items-center justify-between px-md bg-canvas border-b border-hairline">
      <div className="flex items-center gap-sm">
        <button className="lg:hidden text-ink" onClick={onMenuClick} aria-label="Buka navigasi">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-body-emphasis text-ink">{title}</h1>
      </div>
      <div className="flex items-center gap-sm">
        <span className="text-body-sm text-ink-muted hidden sm:inline">{profile?.name ?? profile?.email}</span>
        <Button variant="ghost" compact onClick={signOut}>
          Keluar
        </Button>
      </div>
    </header>
  );
}

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-surface-1">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-lg">{children}</main>
      </div>
    </div>
  );
}
