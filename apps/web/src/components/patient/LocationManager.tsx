'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { PatientLocation } from '@/types';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import type L from 'leaflet';
import {
  MapPin,
  Plus,
  Trash2,
  Star,
  Navigation,
  Pencil,
  ExternalLink,
} from 'lucide-react';

interface LocationManagerProps {
  locations: PatientLocation[];
  onRefresh: () => void;
  apiPrefix?: string;
}

interface LocationForm {
  label: string;
  latitude: number;
  longitude: number;
  address: string;
  notes: string;
  is_default: boolean;
}

const INITIAL_FORM: LocationForm = {
  label: '',
  latitude: 0,
  longitude: 0,
  address: '',
  notes: '',
  is_default: false,
};

export function LocationManager({
  locations,
  onRefresh,
  apiPrefix = '/profiles/patient/locations',
}: LocationManagerProps) {
  const { toast } = useToast();
  const { activeProfileId } = useActiveProfile();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const leafletRef = useRef<typeof L | null>(null);

  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LocationForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const withProfile = (url: string) => {
    if (!activeProfileId) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}profile_id=${activeProfileId}`;
  };

  // Dynamic Leaflet import (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadLeaflet = async () => {
      // Add Leaflet CSS if not present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Import Leaflet
      const leaflet = await import('leaflet');
      leafletRef.current = leaflet.default ?? leaflet;
      setLeafletLoaded(true);
    };

    loadLeaflet();
  }, []);

  // Initialize/update map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mode === 'view') return;
    const Leaf = leafletRef.current;
    if (!Leaf) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const defaultLat = form.latitude || 14.634915;
    const defaultLng = form.longitude || -90.506882;

    const map = Leaf.map(mapRef.current).setView([defaultLat, defaultLng], form.latitude ? 16 : 12);

    Leaf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Fix default icon
    const defaultIcon = Leaf.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41] as [number, number],
      iconAnchor: [12, 41] as [number, number],
    });

    let marker: L.Marker | null = null;
    if (form.latitude && form.longitude) {
      marker = Leaf.marker([form.latitude, form.longitude], { icon: defaultIcon, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker!.getLatLng();
        setForm((prev) => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
      });
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));

      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = Leaf.marker([lat, lng], { icon: defaultIcon, draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker!.getLatLng();
          setForm((prev) => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
        });
      }
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Force resize after mount
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletLoaded, mode]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Tu navegador no soporta geolocalización');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm((prev) => ({ ...prev, latitude, longitude }));

        // Update map
        const Leaf = leafletRef.current;
        const map = mapInstanceRef.current;
        if (map && Leaf) {
          map.setView([latitude, longitude], 16);

          // Update or create marker
          const defaultIcon = Leaf.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41] as [number, number],
            iconAnchor: [12, 41] as [number, number],
          });

          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            const marker = Leaf.marker([latitude, longitude], { icon: defaultIcon, draggable: true }).addTo(map);
            marker.on('dragend', () => {
              const pos = marker.getLatLng();
              setForm((prev) => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
            });
            markerRef.current = marker;
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAdd = () => {
    setMode('add');
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleEdit = (loc: PatientLocation) => {
    setMode('edit');
    setEditingId(loc.id);
    setForm({
      label: loc.label,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address || '',
      notes: loc.notes || '',
      is_default: loc.is_default,
    });
  };

  const handleCancel = () => {
    setMode('view');
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.warning('Ingresa un nombre para la ubicación');
      return;
    }
    if (!form.latitude || !form.longitude) {
      toast.warning('Selecciona una ubicación en el mapa');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: form.label,
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address || undefined,
        notes: form.notes || undefined,
        is_default: form.is_default,
      };

      if (mode === 'add') {
        await api.post(withProfile(apiPrefix), payload);
        toast.success('Ubicación guardada');
      } else if (mode === 'edit' && editingId) {
        await api.put(withProfile(`${apiPrefix}/${editingId}`), payload);
        toast.success('Ubicación actualizada');
      }

      handleCancel();
      onRefresh();
    } catch (error: unknown) {
      const errMsg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(errMsg || 'Error al guardar ubicación');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta ubicación?')) return;
    try {
      await api.delete(withProfile(`${apiPrefix}/${id}`));
      toast.success('Ubicación eliminada');
      onRefresh();
    } catch {
      toast.error('Error al eliminar ubicación');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api.put(withProfile(`${apiPrefix}/${id}/default`));
      toast.success('Ubicación predeterminada actualizada');
      onRefresh();
    } catch {
      toast.error('Error al actualizar ubicación predeterminada');
    }
  };

  const getGoogleMapsUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="border border-[var(--border-light)] rounded-lg p-3 sm:p-4">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
        <h2 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600" />
          Ubicaciones
        </h2>
        {mode === 'view' && locations.length < 5 && (
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Agregar Ubicación</span>
            <span className="sm:hidden">Agregar</span>
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(mode === 'add' || mode === 'edit') && (
        <div className="mb-6 p-3 sm:p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
          <h3 className="text-md font-semibold mb-4 text-emerald-900">
            {mode === 'add' ? 'Agregar Ubicación' : 'Editar Ubicación'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <Input
                placeholder="ej. Casa, Oficina, Casa de mamá"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <Input
                placeholder="ej. Zona 10, Ciudad de Guatemala"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                maxLength={500}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notas de Referencia</label>
              <Input
                placeholder="ej. Portón azul, segundo piso, timbre no funciona"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* Map */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Ubicación en Mapa *
                {form.latitude && form.longitude ? (
                  <span className="text-xs text-slate-400 ml-2">
                    ({form.latitude.toFixed(6)}, {form.longitude.toFixed(6)})
                  </span>
                ) : null}
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseCurrentLocation}
              >
                <Navigation className="w-3 h-3 mr-1" />
                Mi ubicación
              </Button>
            </div>
            <div
              ref={mapRef}
              className="w-full h-[300px] rounded-lg border border-slate-200 bg-slate-100"
              style={{ zIndex: 0 }}
            />
            <p className="text-xs text-slate-400 mt-1">
              Haz clic en el mapa para seleccionar o arrastra el marcador para ajustar
            </p>
          </div>

          {/* Default toggle */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="isDefault"
              checked={form.is_default}
              onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
            />
            <label htmlFor="isDefault" className="text-sm cursor-pointer">
              Marcar como ubicación principal
            </label>
          </div>

          <div className="flex flex-row w-full gap-2 justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-900 hover:bg-emerald-800 w-full sm:w-auto">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button onClick={handleCancel} variant="outline" className="w-full sm:w-auto">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Locations List */}
      {mode === 'view' && (
        <div className="space-y-2">
          {locations.length === 0 ? (
            <EmptyState
              icon={<MapPin className="w-10 h-10" />}
              title="Sin ubicaciones guardadas"
              description="Agrega ubicaciones para facilitar las visitas domiciliarias"
            />
          ) : (
            locations.map((loc) => (
              <div
                key={loc.id}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{loc.label}</p>
                    {loc.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <Star className="w-3 h-3" />
                        Principal
                      </span>
                    )}
                  </div>
                  {loc.address && (
                    <p className="text-xs text-slate-500 mt-0.5">{loc.address}</p>
                  )}
                  {loc.notes && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">{loc.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={getGoogleMapsUrl(loc.latitude, loc.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded hover:bg-emerald-50 transition-colors"
                    title="Abrir en Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {!loc.is_default && (
                    <button
                      onClick={() => handleSetDefault(loc.id)}
                      className="text-slate-400 hover:text-amber-500 p-1.5 rounded hover:bg-amber-50 transition-colors"
                      title="Marcar como principal"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(loc)}
                    className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded hover:bg-emerald-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
