'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { FamilyHistoryCondition, FamilyMemberType } from '@/types';
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const PREDEFINED_CONDITIONS = [
  'Diabetes',
  'Hipertensión',
  'Cáncer',
  'Enfermedad Cardíaca',
  'Enfermedad Cerebrovascular (ACV)',
  'Asma',
  'Enfermedad Renal',
  'Enfermedad Hepática',
  'Enfermedad Mental',
  'Epilepsia',
  'Tuberculosis',
  'Otra',
];

const FAMILY_MEMBER_OPTIONS: { value: FamilyMemberType; label: string }[] = [
  { value: FamilyMemberType.PADRE, label: 'Padre' },
  { value: FamilyMemberType.MADRE, label: 'Madre' },
  { value: FamilyMemberType.HERMANO_A, label: 'Hermano/a' },
  { value: FamilyMemberType.ABUELO_PATERNO, label: 'Abuelo paterno' },
  { value: FamilyMemberType.ABUELA_PATERNA, label: 'Abuela paterna' },
  { value: FamilyMemberType.ABUELO_MATERNO, label: 'Abuelo materno' },
  { value: FamilyMemberType.ABUELA_MATERNA, label: 'Abuela materna' },
  { value: FamilyMemberType.TIO_A, label: 'Tío/a' },
  { value: FamilyMemberType.OTRO, label: 'Otro' },
];

interface FamilyHistoryTabProps {
  onRefresh: () => void;
}

export function FamilyHistoryTab({ onRefresh }: FamilyHistoryTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [conditions, setConditions] = useState<FamilyHistoryCondition[]>([]);
  const [expandedCondition, setExpandedCondition] = useState<string | null>(null);
  const [customConditionName, setCustomConditionName] = useState('');

  useEffect(() => {
    fetchFamilyHistory();
  }, []);

  const fetchFamilyHistory = async () => {
    try {
      const res = await api.get<FamilyHistoryCondition[]>('/profiles/patient/family-history');
      setConditions(res.data);
    } catch (error) {
      console.error('Error fetching family history', error);
    } finally {
      setLoading(false);
    }
  };

  const isConditionActive = (conditionName: string) => {
    return conditions.some((c) => c.condition_name === conditionName);
  };

  const getCondition = (conditionName: string) => {
    return conditions.find((c) => c.condition_name === conditionName);
  };

  const toggleCondition = async (conditionName: string) => {
    const existing = getCondition(conditionName);
    if (existing) {
      // Remove
      setSaving(conditionName);
      try {
        await api.delete(`/profiles/patient/family-history/${existing.id}`);
        setConditions((prev) => prev.filter((c) => c.id !== existing.id));
        if (expandedCondition === conditionName) setExpandedCondition(null);
        onRefresh();
      } catch (error) {
        console.error('Error deleting condition', error);
      } finally {
        setSaving(null);
      }
    } else {
      // Add with empty members — expanded for selection
      setSaving(conditionName);
      try {
        const res = await api.post<FamilyHistoryCondition>('/profiles/patient/family-history', {
          condition_name: conditionName,
          family_members: [],
        });
        setConditions((prev) => [...prev, res.data]);
        setExpandedCondition(conditionName);
        onRefresh();
      } catch (error) {
        console.error('Error adding condition', error);
      } finally {
        setSaving(null);
      }
    }
  };

  const addCustomCondition = async () => {
    if (!customConditionName.trim()) return;
    const name = customConditionName.trim();
    if (isConditionActive(name)) return;

    setSaving(name);
    try {
      const res = await api.post<FamilyHistoryCondition>('/profiles/patient/family-history', {
        condition_name: name,
        family_members: [],
      });
      setConditions((prev) => [...prev, res.data]);
      setExpandedCondition(name);
      setCustomConditionName('');
      onRefresh();
    } catch (error) {
      console.error('Error adding custom condition', error);
    } finally {
      setSaving(null);
    }
  };

  const toggleFamilyMember = async (conditionName: string, member: string) => {
    const condition = getCondition(conditionName);
    if (!condition) return;

    const hasMemeber = condition.family_members.includes(member);
    const newMembers = hasMemeber
      ? condition.family_members.filter((m) => m !== member)
      : [...condition.family_members, member];

    try {
      const res = await api.put<FamilyHistoryCondition>(
        `/profiles/patient/family-history/${condition.id}`,
        { family_members: newMembers }
      );
      setConditions((prev) => prev.map((c) => (c.id === condition.id ? res.data : c)));
    } catch (error) {
      console.error('Error updating family members', error);
    }
  };

  const updateNotes = async (conditionName: string, notes: string) => {
    const condition = getCondition(conditionName);
    if (!condition) return;

    try {
      const res = await api.put<FamilyHistoryCondition>(
        `/profiles/patient/family-history/${condition.id}`,
        { notes: notes || null }
      );
      setConditions((prev) => prev.map((c) => (c.id === condition.id ? res.data : c)));
    } catch (error) {
      console.error('Error updating notes', error);
    }
  };

  // Get conditions that are NOT in the predefined list (custom ones)
  const customConditions = conditions.filter(
    (c) => !PREDEFINED_CONDITIONS.includes(c.condition_name)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 mb-4">
        Selecciona las condiciones que se presentan en tu familia e indica qué familiares las padecen.
      </p>

      {/* Predefined conditions checklist */}
      <div className="space-y-2">
        {PREDEFINED_CONDITIONS.filter((c) => c !== 'Otra').map((conditionName) => {
          const active = isConditionActive(conditionName);
          const condition = getCondition(conditionName);
          const isExpanded = expandedCondition === conditionName;
          const isSaving = saving === conditionName;

          return (
            <div
              key={conditionName}
              className={`border rounded-lg transition-all ${
                active ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
              }`}
            >
              {/* Condition toggle row */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCondition(conditionName)}
                    disabled={isSaving}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      active
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    {active && <span className="text-xs font-bold">✓</span>}
                  </button>
                  <span className={`text-sm font-medium ${active ? 'text-emerald-900' : 'text-slate-700'}`}>
                    {conditionName}
                  </span>
                </div>
                {active && (
                  <div className="flex items-center gap-2">
                    {condition && condition.family_members.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {condition.family_members.length} familiar{condition.family_members.length > 1 ? 'es' : ''}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedCondition(isExpanded ? null : conditionName)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded detail: family member selection + notes */}
              {active && isExpanded && condition && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                  <label className="block text-xs font-medium text-slate-600 mb-2">Selecciona los familiares:</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {FAMILY_MEMBER_OPTIONS.map((member) => {
                      const isSelected = condition.family_members.includes(member.value);
                      return (
                        <button
                          key={member.value}
                          type="button"
                          onClick={() => toggleFamilyMember(conditionName, member.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {member.label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notas (opcional):</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                    value={condition.notes || ''}
                    onChange={(e) => updateNotes(conditionName, e.target.value)}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom conditions */}
      {customConditions.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-semibold text-slate-700">Otras condiciones</h4>
          {customConditions.map((condition) => {
            const isExpanded = expandedCondition === condition.condition_name;

            return (
              <div
                key={condition.id}
                className="border border-emerald-300 bg-emerald-50/30 rounded-lg"
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-emerald-900">{condition.condition_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {condition.family_members.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {condition.family_members.length} familiar{condition.family_members.length > 1 ? 'es' : ''}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedCondition(isExpanded ? null : condition.condition_name)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCondition(condition.condition_name)}
                      className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                    <label className="block text-xs font-medium text-slate-600 mb-2">Selecciona los familiares:</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {FAMILY_MEMBER_OPTIONS.map((member) => {
                        const isSelected = condition.family_members.includes(member.value);
                        return (
                          <button
                            key={member.value}
                            type="button"
                            onClick={() => toggleFamilyMember(condition.condition_name, member.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {member.label}
                          </button>
                        );
                      })}
                    </div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Notas (opcional):</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                      value={condition.notes || ''}
                      onChange={(e) => updateNotes(condition.condition_name, e.target.value)}
                      placeholder="Observaciones adicionales..."
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add custom condition */}
      <div className="border border-dashed border-slate-300 rounded-lg p-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Agregar otra condición</h4>
        <div className="flex gap-2">
          <Input
            value={customConditionName}
            onChange={(e) => setCustomConditionName(e.target.value)}
            placeholder="Nombre de la condición"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustomCondition();
            }}
          />
          <Button
            onClick={addCustomCondition}
            disabled={!customConditionName.trim() || saving !== null}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
