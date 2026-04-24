import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions, icon: Icon }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: any;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold">{title}</h1>
          {subtitle && <p className="text-text-muted mt-1 text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
