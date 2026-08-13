import { NavLink } from 'react-router-dom';
import { cx } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/antrian', label: 'Antrian Verifikasi' },
  { to: '/admin/penerbitan', label: 'Penerbitan Sertifikat' },
  { to: '/admin/monitoring-h3', label: 'Monitoring H-3' },
  { to: '/admin/export', label: 'Export Laporan' },
  { to: '/admin/skpd', label: 'Manajemen SKPD' },
  { to: '/admin/akun', label: 'Manajemen Akun' },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-scrim z-30 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <nav
        className={cx(
          'fixed lg:static inset-y-0 left-0 z-40 w-[240px] bg-canvas border-r border-hairline flex flex-col transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navigasi Panel Superadmin"
      >
        <div className="h-[48px] flex items-center px-md border-b border-hairline">
          <span className="text-body-emphasis text-ink">TTE Cirebon</span>
        </div>
        <ul className="flex-1 py-xs">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cx(
                    'block px-md py-sm text-body-sm border-l-[3px]',
                    isActive
                      ? 'bg-surface-1 text-ink border-l-primary text-body-emphasis'
                      : 'text-ink-muted border-l-transparent hover:bg-surface-1'
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
