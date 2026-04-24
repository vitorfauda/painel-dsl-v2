import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DownloadCloud, Save, Package, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime } from '@/lib/utils';

type Config = {
  version: string;
  downloadUrl: string;
  tutorialUrl: string;
  updatedAt: string | null;
};

const KEY_VERSION = 'latest_extension_version';
const KEY_DOWNLOAD = 'extension_download_url';
const KEY_TUTORIAL = 'update_tutorial_url';

export default function ExtensionVersion() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<Config>({ version: '', downloadUrl: '', tutorialUrl: '', updatedAt: null });
  const [form, setForm] = useState({ version: '', downloadUrl: '', tutorialUrl: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_config').select('*').in('key', [KEY_VERSION, KEY_DOWNLOAD, KEY_TUTORIAL]);
    const map: Record<string, { value: string; updated_at: string }> = {};
    (data || []).forEach((r: any) => { map[r.key] = { value: r.value, updated_at: r.updated_at }; });
    const cfg = {
      version: map[KEY_VERSION]?.value || '',
      downloadUrl: map[KEY_DOWNLOAD]?.value || '',
      tutorialUrl: map[KEY_TUTORIAL]?.value || '',
      updatedAt: map[KEY_VERSION]?.updated_at || null,
    };
    setCurrent(cfg);
    setForm({ version: cfg.version, downloadUrl: cfg.downloadUrl, tutorialUrl: cfg.tutorialUrl });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!/^\d+\.\d+\.\d+$/.test(form.version)) { toast.error('Versão deve estar no formato X.Y.Z (ex: 2.5.1)'); return; }
    if (!form.downloadUrl) { toast.error('URL de download obrigatória'); return; }

    setSaving(true);
    const updates = [
      { key: KEY_VERSION, value: form.version },
      { key: KEY_DOWNLOAD, value: form.downloadUrl },
      { key: KEY_TUTORIAL, value: form.tutorialUrl || form.downloadUrl },
    ];

    for (const u of updates) {
      const { error } = await supabase.from('app_config').upsert({ ...u, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) { toast.error(`Falha em ${u.key}: ${error.message}`); setSaving(false); return; }
    }

    toast.success(`Versão ${form.version} publicada! Clientes antigos serão bloqueados em até 10 min.`);
    setSaving(false);
    load();
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><LoaderRing size={40} /></div>;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader icon={DownloadCloud} title="Versão da extensão" subtitle="Publique uma nova versão e bloqueie as antigas automaticamente" />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
        {/* Form */}
        <div className="holo-card p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-muted mb-2">Versão (X.Y.Z)</label>
              <input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="2.5.1" className="input-dsl font-mono" />
              <div className="text-xs text-text-dim mt-1">Formato semver: major.minor.patch</div>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-2">URL de download do ZIP</label>
              <input value={form.downloadUrl} onChange={e => setForm({ ...form, downloadUrl: e.target.value })} placeholder="https://drive.google.com/..." className="input-dsl" />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-2">URL do tutorial (opcional)</label>
              <input value={form.tutorialUrl} onChange={e => setForm({ ...form, tutorialUrl: e.target.value })} placeholder="https://drive.google.com/..." className="input-dsl" />
              <div className="text-xs text-text-dim mt-1">Se vazio, usa a URL de download</div>
            </div>

            <button onClick={save} disabled={saving} className="cta-neon w-full flex items-center justify-center gap-2 mt-2">
              {saving ? <LoaderRing size={18} /> : <span className="relative z-10 flex items-center gap-2"><Save size={14} /> Publicar versão</span>}
            </button>
          </div>
        </div>

        {/* Status atual */}
        <aside className="space-y-4">
          <div className="holo-card holo-permanent p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} className="text-primary" />
              <h3 className="font-display font-bold text-sm">Versão atual</h3>
            </div>
            <div className="text-4xl font-display font-bold font-tabular mb-2">{current.version || '—'}</div>
            {current.updatedAt && <div className="text-xs text-text-muted">Atualizada em {formatDateTime(current.updatedAt)}</div>}
            {current.downloadUrl && (
              <a href={current.downloadUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80">
                <ExternalLink size={12} /> Abrir no Drive
              </a>
            )}
          </div>

          <div className="holo-card p-5">
            <h3 className="font-display font-bold text-sm mb-3">Checklist</h3>
            <div className="space-y-2 text-xs">
              {['Build local', 'Upload do ZIP', 'Teste rápido', 'Salvar versão', 'Avisar clientes VIP'].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-text-muted">
                  <Check size={12} className="text-primary" /> {step}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
