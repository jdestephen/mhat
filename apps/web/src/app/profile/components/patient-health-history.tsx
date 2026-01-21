'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import { 
  PatientProfile, 
  Allergy, 
  Condition,
  AllergySeverity,
  AllergySource,
  AllergyStatus,
  ConditionStatus,
  ConditionSource,
  AllergyType
} from '@/types';
import { X, Plus, AlertCircle } from 'lucide-react';

interface PatientHealthHistoryProps {
  profile: PatientProfile;
  onRefresh: () => void;
}

export function PatientHealthHistory({ profile, onRefresh }: PatientHealthHistoryProps) {
  // Helper function to capitalize first letter
  const capitalize = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const [options, setOptions] = useState<any>(null);
  
  // Allergy Form State
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [newAllergy, setNewAllergy] = useState<Partial<Allergy>>({
      type: AllergyType.OTHER,
      severity: AllergySeverity.UNKNOWN,
      source: AllergySource.NOT_SURE,
      status: AllergyStatus.UNVERIFIED
  });

  // Condition Form State
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondition, setNewCondition] = useState<Partial<Condition>>({
      status: ConditionStatus.ACTIVE,
      source: ConditionSource.SUSPECTED,
      since_year: ''
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await api.get('/catalog/options');
      setOptions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAllergy = async () => {
    if (!newAllergy.allergen) return;
    
    // Validate that code and code_system are present (required for FHIR compliance)
    if (!newAllergy.code || !newAllergy.code_system) {
      alert('Please select an allergy from the autocomplete dropdown to ensure proper coding.');
      return;
    }
    
    try {
      await api.post('/profiles/patient/allergies', newAllergy);
      setShowAddAllergy(false);
      setNewAllergy({
          type: AllergyType.OTHER,
          severity: AllergySeverity.UNKNOWN,
          source: AllergySource.NOT_SURE,
          status: AllergyStatus.UNVERIFIED,
          allergen: ''
      });
      onRefresh();
    } catch (error) {
       console.error(error);
       alert("Failed to add allergy");
    }
  };

  const handleAddCondition = async () => {
    if (!newCondition.name) return;
    
    // Validate that code and code_system are present (required for FHIR compliance)
    if (!newCondition.code || !newCondition.code_system) {
      alert('Please select a condition from the autocomplete dropdown to ensure proper coding.');
      return;
    }
    
    try {
      await api.post('/profiles/patient/conditions', newCondition);
      setShowAddCondition(false);
      setNewCondition({
          status: ConditionStatus.ACTIVE,
          source: ConditionSource.SUSPECTED,
          since_year: '',
          name: ''
      });
      onRefresh();
    } catch (error) {
       console.error(error);
       alert("Failed to add condition");
    }
  };

  return (
    <div className="space-y-8">
      {/* Conditions Section */}
      <div className="border border-[var(--border-light)] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
          <h2 className="text-lg font-semibold text-emerald-900">Conditions</h2>
          <Button variant="outline" size="sm" onClick={() => setShowAddCondition(!showAddCondition)}>
            {showAddCondition ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showAddCondition ? 'Cancel' : 'Add Condition'}
          </Button>
        </div>

        {showAddCondition && (
          <div className="mb-6 p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Condition</label>
                <Autocomplete
                  endpoint="/catalog/conditions"
                  placeholder="Search condition (e.g. Asma)"
                  onSelect={(opt) => setNewCondition({ 
                    ...newCondition, 
                    name: opt.display,
                    code: opt.code,
                    code_system: opt.code_system
                  })}
                  onChange={(val) => setNewCondition({ ...newCondition, name: val, code: undefined, code_system: undefined })}
                  value={newCondition.name}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select
                  options={[
                    { value: ConditionStatus.ACTIVE, label: 'Activa' },
                    { value: ConditionStatus.CONTROLLED, label: 'Controlada' },
                    { value: ConditionStatus.RESOLVED, label: 'Resuelta' },
                    { value: ConditionStatus.UNKNOWN, label: 'No sé' }
                  ]}
                  value={newCondition.status}
                  onChange={(val) => setNewCondition({ ...newCondition, status: val as ConditionStatus })}
                  placeholder="Select status..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Since (Year)</label>
                <Input
                  placeholder="e.g. 2015"
                  value={newCondition.since_year || ''}
                  onChange={(e) => setNewCondition({ ...newCondition, since_year: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleAddCondition}>Save Condition</Button>
          </div>
        )}

        <div className="space-y-2">
          {profile.conditions?.length === 0 && <p className="text-slate-500 italic">No conditions recorded.</p>}
          {profile.conditions?.map((cond) => (
            <div key={cond.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
              <div>
                <p className="font-medium text-slate-800">{cond.name}</p>
                <p className="text-xs text-slate-500">
                  Since: {cond.since_year || 'Unknown'}
                </p>
              </div>
              <div className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-700">
                {capitalize(cond.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Allergies Section */}
      <div className="border border-[var(--border-light)] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
           <h2 className="text-lg font-semibold text-emerald-900">Allergies</h2>
           <Button variant="outline" size="sm" onClick={() => setShowAddAllergy(!showAddAllergy)}>
             {showAddAllergy ? <X className="w-4 h-4 mr-1"/> : <Plus className="w-4 h-4 mr-1"/>}
             {showAddAllergy ? 'Cancel' : 'Add Allergy'}
           </Button>
        </div>

        {showAddAllergy && (
            <div className="mb-6 p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Allergen</label>
                        <Autocomplete 
                           endpoint="/catalog/allergies"
                           placeholder="Search allergy (e.g. Maní)"
                           onSelect={(opt) => {
                               setNewAllergy({
                                 ...newAllergy, 
                                 allergen: opt.display,
                                 code: opt.code,
                                 code_system: opt.code_system
                               });
                           }}
                           onChange={(val) => setNewAllergy({...newAllergy, allergen: val, code: undefined, code_system: undefined})}
                           value={newAllergy.allergen}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">Severity</label>
                        <Select
                          options={[
                            { value: AllergySeverity.MILD, label: 'Leve' },
                            { value: AllergySeverity.MODERATE, label: 'Moderada' },
                            { value: AllergySeverity.SEVERE, label: 'Grave' },
                            { value: AllergySeverity.UNKNOWN, label: 'No sé' }
                          ]}
                          value={newAllergy.severity}
                          onChange={(val) => setNewAllergy({...newAllergy, severity: val as AllergySeverity})}
                          placeholder="Select severity..."
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Reaction</label>
                         <Input 
                           placeholder="e.g. Ronchas"
                           value={newAllergy.reaction || ''}
                           onChange={(e) => setNewAllergy({...newAllergy, reaction: e.target.value})}
                         />
                    </div>
                </div>
                <Button onClick={handleAddAllergy}>Save Allergy</Button>
            </div>
        )}

        <div className="space-y-2">
           {profile.allergies?.length === 0 && <p className="text-slate-500 italic">No allergies recorded.</p>}
           {profile.allergies?.map((allergy) => (
               <div key={allergy.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                   <div>
                       <p className="font-medium text-slate-800">{allergy.allergen}</p>
                       <p className="text-xs text-slate-500">
                          {capitalize(allergy.severity)} • {allergy.reaction || 'No reaction specified'}
                       </p>
                   </div>
                   <div className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-700">
                       {allergy.status}
                   </div>
               </div>
           ))}
        </div>
      </div>
    </div>
  );
}
