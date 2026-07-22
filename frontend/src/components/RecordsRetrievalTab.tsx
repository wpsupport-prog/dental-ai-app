import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, User, ShieldCheck, HeartPulse, Stethoscope, Activity, Utensils, ChevronDown, ChevronUp, Edit2, Save, X, Check } from 'lucide-react';
import axios from 'axios';
import DentalChart from './DentalChart';

import { filterPatientRecords } from '../utils/recordFilters';

export const RecordsRetrievalTab: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  // Editing state
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccessId, setSaveSuccessId] = useState<number | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/v1/forms/records');
      setRecords(res.data || []);
      
	  
	  
    } catch (err) {
      console.error('Error fetching patient records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const toggleExpand = (id: number) => {
    if (editingRecordId === id) return; // Don't collapse while editing
    setExpandedRecordId(expandedRecordId === id ? null : id);
  };

  const startEditing = (rec: any) => {
    setEditingRecordId(rec.id);
    setExpandedRecordId(rec.id);
    setEditFormData({ ...rec });
  };

  const cancelEditing = () => {
    setEditingRecordId(null);
    setEditFormData({});
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveRecordUpdate = async (id: number) => {
    setSaving(true);
    try {
      // Strip read-only metadata properties before sending JSON payload
      const { id: _, document_id, created_at, updated_at, ...cleanPayload } = editFormData;

      await axios.put(`http://localhost:8000/api/v1/forms/records/${id}`, cleanPayload);
      
      setSaveSuccessId(id);
      setEditingRecordId(null);
      await fetchRecords();

      setTimeout(() => {
        setSaveSuccessId(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating patient record:', err.response?.data || err.message);
      alert(`Failed to update record in database: ${err.response?.data?.detail || 'Server error'}`);
    } finally {
      setSaving(false);
    }
  };

	const filteredRecords = filterPatientRecords(records, searchQuery);
	

  return (
    <div className="space-y-6">
      {/* Search & Action Bar */}
      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="relative w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
			<input
			type="text"
			placeholder="Search patient name, mobile no, or PhilHealth ID..."
			value={searchQuery}
			onChange={(e) => setSearchQuery(e.target.value)}
			className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
		  />
        </div>

        <button
          onClick={fetchRecords}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Records
        </button>
      </div>

      {/* Record Cards List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading saved records from database...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">No matching patient records found in registry.</div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((rec) => {
            const isExpanded = expandedRecordId === rec.id;
            const isEditing = editingRecordId === rec.id;
            const data = isEditing ? editFormData : rec;

            return (
              <div
                key={rec.id}
                className={`bg-slate-950 border rounded-xl overflow-hidden transition ${
                  isEditing ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-800'
                }`}
              >
                {/* Header Summary Bar */}
                <div
                  onClick={() => toggleExpand(rec.id)}
                  className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-900/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-950 border border-blue-800 rounded-lg text-blue-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                        {rec.surname}, {rec.first_name} {rec.middle_initial}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        DOB: {rec.dob || 'N/A'} | Age/Sex: {rec.age} / {rec.sex} | Address: {rec.address || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {saveSuccessId === rec.id && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded">
                        <Check className="w-3.5 h-3.5" /> Updated
                      </span>
                    )}

                    {!isEditing ? (
                      <button
                        onClick={() => startEditing(rec)}
                        className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Record
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveRecordUpdate(rec.id)}
                          disabled={saving}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                        >
                          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-md font-mono">
                      {rec.document_id}
                    </span>

                    <button onClick={() => toggleExpand(rec.id)} className="text-slate-400 p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Field View */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-800/80 bg-slate-900/40 space-y-6">
                    
                    {/* 1. Demographics & Personal Information */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                          <User className="w-4 h-4" /> Personal Information
                        </span>
                        {isEditing && <span className="text-[11px] text-amber-400 font-mono">Editing Mode Active</span>}
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-xs bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
                        <div>
                          <label className="text-slate-400 block mb-1">Surname:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.surname || ''}
                              onChange={(e) => handleFieldChange('surname', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100 font-bold">{data.surname || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">First Name:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.first_name || ''}
                              onChange={(e) => handleFieldChange('first_name', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100 font-bold">{data.first_name || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Middle Name:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.middle_initial || ''}
                              onChange={(e) => handleFieldChange('middle_initial', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100 font-bold">{data.middle_initial || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Civil Status:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.civil_status || ''}
                              onChange={(e) => handleFieldChange('civil_status', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100 font-bold">{data.civil_status || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Date of Birth:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.dob || ''}
                              onChange={(e) => handleFieldChange('dob', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100">{data.dob || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Age / Sex:</label>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Age"
                                value={data.age || ''}
                                onChange={(e) => handleFieldChange('age', e.target.value)}
                                className="w-1/2 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                              />
                              <input
                                type="text"
                                placeholder="Sex"
                                value={data.sex || ''}
                                onChange={(e) => handleFieldChange('sex', e.target.value)}
                                className="w-1/2 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                              />
                            </div>
                          ) : (
                            <p className="text-slate-100">{data.age} / {data.sex}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Place of Birth:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.place_of_birth || ''}
                              onChange={(e) => handleFieldChange('place_of_birth', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100">{data.place_of_birth || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Address:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.address || ''}
                              onChange={(e) => handleFieldChange('address', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100">{data.address || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Occupation:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.occupation || ''}
                              onChange={(e) => handleFieldChange('occupation', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100">{data.occupation || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Parent / Guardian:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.parent_guardian || ''}
                              onChange={(e) => handleFieldChange('parent_guardian', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100">{data.parent_guardian || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Signed Name:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.signed_name || ''}
                              onChange={(e) => handleFieldChange('signed_name', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold"
                            />
                          ) : (
                            <p className="text-emerald-400 font-bold">{data.signed_name || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">PhilHealth No:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.philhealth_no || ''}
                              onChange={(e) => handleFieldChange('philhealth_no', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-blue-300 font-mono"
                            />
                          ) : (
                            <p className="text-blue-300 font-mono">{data.philhealth_no || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Yakap Provider:</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.yakap_provider || ''}
                              onChange={(e) => handleFieldChange('yakap_provider', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            <p className="text-slate-100">{data.yakap_provider || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">CP NO. (Contact):</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={data.contact_no || ''}
                              onChange={(e) => handleFieldChange('contact_no', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-blue-400 font-mono"
                            />
                          ) : (
                            <p className="text-blue-400 font-mono">{data.contact_no || 'N/A'}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Record Created:</label>
                          <p className="text-slate-400 font-mono">{data.created_at || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Memberships & Vitals */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Memberships */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                          <ShieldCheck className="w-4 h-4" /> Memberships
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/70 p-3.5 rounded-lg border border-slate-800/80">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.nhts_pr}
                              onChange={(e) => handleFieldChange('nhts_pr', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">NHTS-PR</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.four_ps}
                              onChange={(e) => handleFieldChange('four_ps', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">4Ps</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.indigenous_people}
                              onChange={(e) => handleFieldChange('indigenous_people', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Indigenous (IP)</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.pwds}
                              onChange={(e) => handleFieldChange('pwds', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">PWDs</span>
                          </label>
                        </div>
                      </div>

                      {/* Vital Signs */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                          <HeartPulse className="w-4 h-4" /> Vital Signs
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-xs bg-slate-900/70 p-3.5 rounded-lg border border-slate-800/80 font-mono">
                          <div>
                            <label className="text-slate-400 block mb-1">BP:</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={data.blood_pressure || ''}
                                onChange={(e) => handleFieldChange('blood_pressure', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                              />
                            ) : (
                              <p className="text-slate-100 font-bold">{data.blood_pressure || 'N/A'}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-slate-400 block mb-1">Pulse:</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={data.pulse_rate || ''}
                                onChange={(e) => handleFieldChange('pulse_rate', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                              />
                            ) : (
                              <p className="text-slate-100 font-bold">{data.pulse_rate || 'N/A'}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-slate-400 block mb-1">Temp (°C):</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={data.temperature || ''}
                                onChange={(e) => handleFieldChange('temperature', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                              />
                            ) : (
                              <p className="text-slate-100 font-bold">{data.temperature ? `${data.temperature} °C` : 'N/A'}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-slate-400 block mb-1">HT (Height):</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={data.height || ''}
                                onChange={(e) => handleFieldChange('height', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                              />
                            ) : (
                              <p className="text-slate-100 font-bold">{data.height || 'N/A'}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-slate-400 block mb-1">WT (Weight):</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={data.weight || ''}
                                onChange={(e) => handleFieldChange('weight', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                              />
                            ) : (
                              <p className="text-slate-100 font-bold">{data.weight || 'N/A'}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Medical History */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                        <Stethoscope className="w-4 h-4" /> Medical History
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
                        {/* Allergies */}
                        <div className="col-span-2 grid grid-cols-3 items-center gap-2 pb-1 border-b border-slate-800/50">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.allergies_checked}
                              onChange={(e) => handleFieldChange('allergies_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Allergies:</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Specified details..."
                              value={data.allergies_specified || ''}
                              onChange={(e) => handleFieldChange('allergies_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.allergies_checked ? (data.allergies_specified || 'Yes') : 'No'}</p>
                          )}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isEditing}
                            checked={!!data.hypertension_cva}
                            onChange={(e) => handleFieldChange('hypertension_cva', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span className="text-slate-300">Hypertension / CVA</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isEditing}
                            checked={!!data.diabetes_mellitus}
                            onChange={(e) => handleFieldChange('diabetes_mellitus', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span className="text-slate-300">Diabetes Mellitus</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isEditing}
                            checked={!!data.blood_disorder}
                            onChange={(e) => handleFieldChange('blood_disorder', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span className="text-slate-300">Blood Disorders</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isEditing}
                            checked={!!data.cardiovascular_heart_diseases}
                            onChange={(e) => handleFieldChange('cardiovascular_heart_diseases', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span className="text-slate-300">Cardiovascular / Heart</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isEditing}
                            checked={!!data.thyroid_disorders}
                            onChange={(e) => handleFieldChange('thyroid_disorders', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span className="text-slate-300">Thyroid Disorders</span>
                        </label>

                        {/* Hepatitis */}
                        <div className="col-span-2 grid grid-cols-3 items-center gap-2 pt-1 border-t border-slate-800/50">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.hepatitis_checked}
                              onChange={(e) => handleFieldChange('hepatitis_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Hepatitis:</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Type specified..."
                              value={data.hepatitis_specified || ''}
                              onChange={(e) => handleFieldChange('hepatitis_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.hepatitis_checked ? (data.hepatitis_specified || 'Yes') : 'No'}</p>
                          )}
                        </div>

                        {/* Malignancy */}
                        <div className="col-span-2 grid grid-cols-3 items-center gap-2 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.malignancy_checked}
                              onChange={(e) => handleFieldChange('malignancy_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Malignancy:</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Details specified..."
                              value={data.malignancy_specified || ''}
                              onChange={(e) => handleFieldChange('malignancy_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.malignancy_checked ? (data.malignancy_specified || 'Yes') : 'No'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4. History of Hospitalization */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                        <Activity className="w-4 h-4" /> History of Previous Hospitalization
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-xs bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
                        {/* Medical Admission */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.medical_hospitalization_checked}
                              onChange={(e) => handleFieldChange('medical_hospitalization_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Medical (Last Admission & Cause):</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Details..."
                              value={data.medical_hospitalization_specified || ''}
                              onChange={(e) => handleFieldChange('medical_hospitalization_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.medical_hospitalization_checked ? (data.medical_hospitalization_specified || 'Yes') : 'None'}</p>
                          )}
                        </div>

                        {/* Surgical */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.surgical_checked}
                              onChange={(e) => handleFieldChange('surgical_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Surgical (Post-Operative):</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Details..."
                              value={data.surgical_specified || ''}
                              onChange={(e) => handleFieldChange('surgical_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.surgical_checked ? (data.surgical_specified || 'Yes') : 'None'}</p>
                          )}
                        </div>

                        {/* Blood Transfusion */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.blood_transfusion_checked}
                              onChange={(e) => handleFieldChange('blood_transfusion_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Blood Transfusion (Month & Year):</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Details..."
                              value={data.blood_transfusion_specified || ''}
                              onChange={(e) => handleFieldChange('blood_transfusion_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.blood_transfusion_checked ? (data.blood_transfusion_specified || 'Yes') : 'None'}</p>
                          )}
                        </div>

                        {/* Tattoo */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.tattoo_checked}
                              onChange={(e) => handleFieldChange('tattoo_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Tattoo:</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Details..."
                              value={data.tattoo_specified || ''}
                              onChange={(e) => handleFieldChange('tattoo_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.tattoo_checked ? (data.tattoo_specified || 'Yes') : 'None'}</p>
                          )}
                        </div>

                        {/* Others */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.others_checked}
                              onChange={(e) => handleFieldChange('others_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Others (Please specify):</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Details..."
                              value={data.others_specified || ''}
                              onChange={(e) => handleFieldChange('others_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.others_checked ? (data.others_specified || 'Yes') : 'None'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 5. Dietary Habits / Social History */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                        <Utensils className="w-4 h-4" /> Dietary Habits / Social History
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-xs bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
                        {/* Sugar Beverages */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.sugar_beverages_checked}
                              onChange={(e) => handleFieldChange('sugar_beverages_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Sugar Beverages/Food:</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Amount, Frequency & Duration..."
                              value={data.sugar_beverages_specified || ''}
                              onChange={(e) => handleFieldChange('sugar_beverages_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.sugar_beverages_checked ? (data.sugar_beverages_specified || 'Yes') : 'No'}</p>
                          )}
                        </div>

                        {/* Alcohol */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.use_alcohol_checked}
                              onChange={(e) => handleFieldChange('use_alcohol_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Use of Alcohol:</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Amount, Frequency & Duration..."
                              value={data.use_alcohol_specified || ''}
                              onChange={(e) => handleFieldChange('use_alcohol_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.use_alcohol_checked ? (data.use_alcohol_specified || 'Yes') : 'No'}</p>
                          )}
                        </div>

                        {/* Tobacco */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.use_tobacco_checked}
                              onChange={(e) => handleFieldChange('use_tobacco_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Use of Tobacco:</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Amount, Frequency & Duration..."
                              value={data.use_tobacco_specified || ''}
                              onChange={(e) => handleFieldChange('use_tobacco_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.use_tobacco_checked ? (data.use_tobacco_specified || 'Yes') : 'No'}</p>
                          )}
                        </div>

                        {/* Betel Nut */}
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={!!data.betel_nut_checked}
                              onChange={(e) => handleFieldChange('betel_nut_checked', e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <span className="text-slate-300">Betel Nut Chewing:</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Amount, Frequency & Duration..."
                              value={data.betel_nut_specified || ''}
                              onChange={(e) => handleFieldChange('betel_nut_specified', e.target.value)}
                              className="col-span-2 bg-slate-950 border border-slate-700 rounded-md p-1.5 text-emerald-400 font-mono text-xs"
                            />
                          ) : (
                            <p className="col-span-2 text-emerald-400 font-mono">{data.betel_nut_checked ? (data.betel_nut_specified || 'Yes') : 'No'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 6. Oral Health Condition Chart Logs (Saved Group View & Editing) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                        <Stethoscope className="w-4 h-4" /> Oral Health Condition Chart Logs
                      </div>

                      {isEditing ? (
                        <DentalChart
                          visits={data.dental_chart || []}
                          setVisits={(updatedVisits) =>
                            handleFieldChange(
                              'dental_chart',
                              typeof updatedVisits === 'function' ? updatedVisits(data.dental_chart || []) : updatedVisits
                            )
                          }
                        />
                      ) : (
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                          {(data.dental_chart && data.dental_chart.length > 0) ? (
                            <DentalChart
                              visits={data.dental_chart}
                              setVisits={() => {}} // Read-only mode
                            />
                          ) : (
                            <p className="text-xs text-slate-500 text-center py-4">No oral health chart logs recorded for this patient.</p>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecordsRetrievalTab;