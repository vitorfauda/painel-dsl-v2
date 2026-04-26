import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: any;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight break-words">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
