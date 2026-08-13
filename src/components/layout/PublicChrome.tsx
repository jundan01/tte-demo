export function PublicHeader() {
  return (
    <header className="h-[56px] flex items-center px-md bg-canvas border-b border-hairline">
      <div className="flex items-center gap-sm">
        <div className="w-8 h-8 bg-primary flex items-center justify-center text-on-primary text-body-emphasis" aria-hidden="true">
          C
        </div>
        <span className="text-body-emphasis text-ink">Bidang Persandian — Kota Cirebon</span>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-surface-1 px-md py-lg text-caption text-ink-muted text-center">
      <p>Bidang Persandian, Dinas Komunikasi dan Informatika Kota Cirebon</p>
      <p>© {new Date().getFullYear()} Pemerintah Kota Cirebon — Sistem Monitoring TTE (Demo)</p>
    </footer>
  );
}
