'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PersonalReference, RelationshipType } from '@/types';
import api from '@/lib/api';
import { Trash2, Pencil, X, Plus } from 'lucide-react';

const RELATIONSHIP_OPTIONS = [
  { value: RelationshipType.PADRE, label: 'Padre' },
  { value: RelationshipType.MADRE, label: 'Madre' },
  { value: RelationshipType.HERMANO_A, label: 'Hermano/a' },
  { value: RelationshipType.ESPOSO_A, label: 'Esposo/a' },
  { value: RelationshipType.HIJO_A, label: 'Hijo/a' },
  { value: RelationshipType.TIO_A, label: 'Tío/a' },
  { value: RelationshipType.ABUELO_A, label: 'Abuelo/a' },
  { value: RelationshipType.AMIGO_A, label: 'Amigo/a' },
  { value: RelationshipType.GUARDIAN, label: 'Guardián' },
  { value: RelationshipType.OTRO, label: 'Otro' },
];

const MAX_REFERENCES = 3;

interface PersonalReferencesTabProps {
  references: PersonalReference[];
  onRefresh: () => void;
}

interface RefFormData {
  name: string;
  phone: string;
  relationship_type: RelationshipType | '';
}

const EMPTY_FORM: RefFormData = { name: '', phone: '', relationship_type: '' };

function getRelationshipLabel(type: RelationshipType): string {
  return RELATIONSHIP_OPTIONS.find((o) => o.value === type)?.label || type;
}

export function PersonalReferencesTab({ references, onRefresh }: PersonalReferencesTabProps) {
  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [formData, setFormData] = React.useState<RefFormData>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<number | null>(null);

  const canAdd = references.length < MAX_REFERENCES;

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (ref: PersonalReference) => {
    setEditId(ref.id);
    setFormData({
      name: ref.name,
      phone: ref.phone,
      relationship_type: ref.relationship_type,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData(EMPTY_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.relationship_type) {
      alert('Todos los campos son requeridos');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/profiles/patient/references/${editId}`, formData);
      } else {
        await api.post('/profiles/patient/references', formData);
      }
      closeForm();
      onRefresh();
    } catch (error: unknown) {
      console.error(error);
      const axiosError = error as { response?: { data?: { detail?: string } } };
      alert(axiosError?.response?.data?.detail || 'Error al guardar referencia');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (refId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta referencia?')) return;
    setDeleting(refId);
    try {
      await api.delete(`/profiles/patient/references/${refId}`);
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar referencia');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {references.length} de {MAX_REFERENCES} referencias
        </p>
        {canAdd && !showForm && (
          <Button
            type="button"
            onClick={openCreate}
            className="bg-emerald-900 hover:bg-emerald-800 text-white hover:cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="border border-emerald-200 bg-emerald-50/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-emerald-900">
              {editId ? 'Editar Referencia' : 'Nueva Referencia'}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-600 hover:cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Celular</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Número de celular"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parentesco</label>
              <Select
                options={RELATIONSHIP_OPTIONS}
                value={formData.relationship_type}
                onChange={(val) =>
                  setFormData((p) => ({ ...p, relationship_type: val as RelationshipType }))
                }
                placeholder="Selecciona parentesco..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                onClick={closeForm}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-900 hover:bg-emerald-800 text-white hover:cursor-pointer"
              >
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reference Cards */}
      {references.length === 0 && !showForm && (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">No hay referencias personales registradas</p>
          <p className="text-xs mt-1">Agrega hasta {MAX_REFERENCES} referencias de contacto</p>
        </div>
      )}

      {references.map((ref) => (
        <div
          key={ref.id}
          className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white hover:border-emerald-200 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800 truncate">{ref.name}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-sm text-slate-500">{ref.phone}</span>
              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {getRelationshipLabel(ref.relationship_type)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            <button
              type="button"
              onClick={() => openEdit(ref)}
              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors hover:cursor-pointer"
              aria-label="Editar referencia"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(ref.id)}
              disabled={deleting === ref.id}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors hover:cursor-pointer disabled:opacity-50"
              aria-label="Eliminar referencia"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
