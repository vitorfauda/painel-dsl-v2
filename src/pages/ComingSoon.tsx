import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export default function ComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <PageHeader icon={Construction} title={title} subtitle={subtitle} />
      <div className="holo-card p-16 text-center">
        <div className="h-16 w-16 rounded-2xl bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center mx-auto mb-4">
          <Construction size={28} className="text-accent-gold" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Em construção</h2>
        <p className="text-text-muted max-w-md mx-auto">
          Essa tela está sendo migrada do painel antigo com o novo visual.
          Em breve aqui.
        </p>
      </div>
    </div>
  );
}
