import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions, icon: Icon }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: any;
}) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:justify-between gap-4 mb-6 sm:mb-8">
      <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
        {Icon && (
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold break-words">{title}</h1>
          {subtitle && <p className="text-text-muted mt-1 text-xs sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2 flex-wrap w-full sm:w-auto">{actions}</div>}
    </div>
  );
}
