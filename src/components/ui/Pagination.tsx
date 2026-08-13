import { Button } from './Button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-md py-sm border-t border-hairline text-caption text-ink-muted">
      <span>
        Menampilkan {start}–{end} dari {total} data
      </span>
      <div className="flex items-center gap-xs">
        <Button variant="ghost" compact disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Sebelumnya
        </Button>
        <span className="text-body-sm text-ink px-xs">
          {page} / {totalPages}
        </span>
        <Button variant="ghost" compact disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
