'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImageUp, Printer, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/Toast';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { DoctorPrintSettings } from '@/lib/printing';
import { UserRole } from '@/types';

interface FormValues {
  name: string;
  degree: string;
  clinic_name: string;
  phone_1: string;
  phone_2: string;
  address: string;
  public_email: string;
  show_duration: boolean;
  paper_size: 'A4' | 'LETTER';
}

type TextField = Exclude<keyof FormValues, 'show_duration' | 'paper_size'>;

function initialForm(settings: DoctorPrintSettings): FormValues {
  return {
    name: settings.name_override ?? settings.default_name,
    degree: settings.degree_override ?? settings.default_degree ?? '',
    clinic_name: settings.clinic_name ?? '',
    phone_1: settings.phone_1 ?? '',
    phone_2: settings.phone_2 ?? '',
    address: settings.address ?? '',
    public_email: settings.public_email ?? '',
    show_duration: settings.show_duration,
    paper_size: settings.paper_size,
  };
}

export default function PrintSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['doctor', 'print-settings'],
    queryFn: async () => (await api.get<DoctorPrintSettings>('/doctor/print-settings')).data,
    enabled: user?.role === UserRole.DOCTOR,
  });
  const [draft, setDraft] = useState<FormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const form = draft ?? (settings ? initialForm(settings) : null);

  useEffect(() => {
    if (!userLoading && user?.role !== UserRole.DOCTOR) router.replace('/doctor');
  }, [userLoading, user?.role, router]);

  useEffect(() => {
    if (!settings?.logo_present) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    api.get<Blob>('/doctor/print-settings/logo', { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setLogoUrl(objectUrl);
      }).catch(() => {
        if (!cancelled) setLogoUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings?.logo_present, logoVersion]);

  const update = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    if (form) setDraft({ ...form, [field]: value });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !settings) return;
    if (!form.name.trim()) {
      toast.error('Indica el nombre que aparecerá en el documento');
      return;
    }
    setSaving(true);
    try {
      const clean = (value: string) => value.trim() || null;
      await api.put('/doctor/print-settings', {
        name_override: clean(form.name) === clean(settings.default_name) ? null : clean(form.name),
        degree_override: clean(form.degree) === clean(settings.default_degree ?? '') ? null : clean(form.degree),
        clinic_name: clean(form.clinic_name),
        phone_1: clean(form.phone_1),
        phone_2: clean(form.phone_2),
        address: clean(form.address),
        public_email: clean(form.public_email),
        show_duration: form.show_duration,
        paper_size: form.paper_size,
      });
      await queryClient.invalidateQueries({ queryKey: ['doctor', 'print-settings'] });
      setDraft(null);
      toast.success('Configuración de impresión guardada');
    } catch {
      toast.error('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('Usa una imagen PNG o JPEG de hasta 2 MB');
      return;
    }
    setLogoBusy(true);
    try {
      const data = new FormData();
      data.append('file', file);
      await api.post('/doctor/print-settings/logo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await queryClient.invalidateQueries({ queryKey: ['doctor', 'print-settings'] });
      setLogoVersion((version) => version + 1);
      toast.success('Logo actualizado');
    } catch {
      toast.error('No se pudo subir el logo');
    } finally {
      setLogoBusy(false);
    }
  };

  const removeLogo = async () => {
    setLogoBusy(true);
    try {
      await api.delete('/doctor/print-settings/logo');
      await queryClient.invalidateQueries({ queryKey: ['doctor', 'print-settings'] });
      setLogoUrl(null);
      toast.success('Logo eliminado');
    } catch {
      toast.error('No se pudo eliminar el logo');
    } finally {
      setLogoBusy(false);
    }
  };

  if (!userLoading && user?.role !== UserRole.DOCTOR) return null;
  if (isError) return <div className="mx-auto max-w-3xl p-8 text-sm text-red-700">No se pudo cargar la configuración. <Button type="button" variant="outline" onClick={() => void refetch()}>Reintentar</Button></div>;
  if (userLoading || isLoading || !form) return <div className="p-8 text-sm text-slate-500">Cargando configuración…</div>;

  const fields: { key: TextField; label: string; placeholder?: string; type?: string }[] = [
    { key: 'name', label: 'Nombre y apellido del doctor' },
    { key: 'degree', label: 'Grado / especialidad' },
    { key: 'clinic_name', label: 'Hospital / clínica' },
    { key: 'phone_1', label: 'Teléfono 1', type: 'tel' },
    { key: 'phone_2', label: 'Teléfono 2', type: 'tel' },
    { key: 'address', label: 'Dirección' },
    { key: 'public_email', label: 'Correo público', type: 'email', placeholder: 'Opcional; no se toma del correo de acceso' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <div className="flex items-center gap-3 text-emerald-900"><Printer className="h-7 w-7" /><h1 className="text-2xl font-semibold">Configuración de impresión</h1></div>
        <p className="mt-2 text-sm text-slate-600">Estos datos aparecerán en recetas y órdenes clínicas. Cada impresión usará la configuración actual.</p>
      </div>
      <form onSubmit={save} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(({ key, label, placeholder, type }) => (
            <label key={key} className={`block space-y-1.5 ${key === 'address' ? 'sm:col-span-2' : ''}`}>
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <Input value={form[key]} onChange={(event) => update(key, event.target.value)} type={type ?? 'text'} placeholder={placeholder} maxLength={key === 'address' ? 500 : key.startsWith('phone') ? 50 : 200} required={key === 'name'} />
            </label>
          ))}
        </div>
        <div className="grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Logo</p>
            <div className="flex items-center gap-4">
              {settings?.logo_present && logoUrl ? <Image src={logoUrl} alt="Logo del doctor" width={80} height={80} unoptimized className="h-20 w-20 rounded-md border border-slate-200 object-contain" /> : <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400"><ImageUp className="h-7 w-7" /></div>}
              <div className="space-y-2">
                <input type="file" accept="image/png,image/jpeg" disabled={logoBusy} onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.target.value = ''; }} className="block max-w-[220px] text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-emerald-50 file:px-2 file:py-1.5 file:text-emerald-800" />
                <p className="text-xs text-slate-500">PNG o JPEG, máximo 2 MB. Aparece arriba y como marca de agua.</p>
                {settings?.logo_present && <Button type="button" size="sm" variant="danger-ghost" disabled={logoBusy} onClick={removeLogo}><Trash2 className="mr-1 h-4 w-4" /> Quitar logo</Button>}
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Tamaño de papel</span><select value={form.paper_size} onChange={(event) => update('paper_size', event.target.value as 'A4' | 'LETTER')} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="A4">A4 (predeterminado)</option><option value="LETTER">Carta</option></select></label>
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={form.show_duration} onChange={(event) => update('show_duration', event.target.checked)} className="h-4 w-4 accent-emerald-700" /> Mostrar duración en recetas cuando esté registrada</label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">Fecha de emisión</p>
              <p className="mt-1 text-xs text-slate-600">Se toma automáticamente de la fecha original de creación de cada receta u orden. Una reimpresión conserva esa fecha.</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-5"><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar configuración'}</Button></div>
      </form>
      <section className="space-y-3" aria-label="Muestra del membrete">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Muestra del membrete</h2>
          <p className="text-xs text-slate-500">Los datos del paciente y el contenido se completan en cada PDF.</p>
        </div>
        <div className="relative mx-auto flex min-h-[520px] max-w-[620px] flex-col overflow-hidden border-2 border-slate-700 bg-white text-slate-800 shadow-sm">
          {settings?.logo_present && logoUrl && <Image src={logoUrl} alt="" width={240} height={240} unoptimized className="pointer-events-none absolute left-1/2 top-1/2 max-h-60 max-w-60 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.08]" />}
          <div className="relative flex justify-between gap-4 border-b border-slate-500 p-4">
            <div className="flex min-w-0 items-start gap-3">
              {settings?.logo_present && logoUrl && <Image src={logoUrl} alt="" width={58} height={58} unoptimized className="h-14 w-14 shrink-0 object-contain" />}
              <div className="min-w-0"><p className="text-xs text-slate-500">Doctor</p><p className="font-semibold">{form.name || 'Nombre y apellido'}</p><p className="text-xs text-slate-500">{form.degree}</p></div>
            </div>
            <div className="max-w-[45%] text-right"><p className="font-semibold">{form.clinic_name || 'Hospital / clínica'}</p><p className="text-xs text-slate-500">{[form.phone_1, form.phone_2].filter(Boolean).join(' / ')}</p><p className="text-xs text-slate-500">{form.address}</p></div>
          </div>
          <div className="relative grid grid-cols-4 gap-2 px-4 py-5 text-xs"><span>Paciente<br /><strong>Nombre completo</strong></span><span>Edad<br /><strong>—</strong></span><span>Sexo<br /><strong>—</strong></span><span>DNI<br /><strong>—</strong></span></div>
          <div className="relative mx-4 flex items-end justify-between border-b border-emerald-600 pb-1"><span className="text-lg text-emerald-700">RECETA MÉDICA</span><span className="text-[10px] text-slate-500">Fecha de emisión original</span></div>
          <div className="relative flex-1 p-4 text-sm text-slate-400">1. Medicamento y dosis<br />&nbsp;&nbsp;&nbsp;Frecuencia: …{form.show_duration && <><br />&nbsp;&nbsp;&nbsp;Duración: …</>}</div>
          <div className="relative mb-5 ml-auto mr-4 w-40 border-t border-slate-600 pt-1 text-center text-xs text-slate-500">Firma y Sello</div>
          <div className="relative border-t border-slate-500 px-3 py-2 text-center text-[10px] text-slate-500">{[form.name && `Dr. ${form.name}`, form.public_email, form.phone_1].filter(Boolean).join(' | ')}</div>
        </div>
      </section>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">El PDF incluirá la fecha de emisión, los datos disponibles del paciente y una línea para Firma y Sello. El número de colegiación no aparece.</div>
    </div>
  );
}
