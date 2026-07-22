import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, User, ShieldCheck, HeartPulse, Stethoscope, Activity, Utensils, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

export const RecordsRetrievalTab: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/v1/forms/records');
      setRecords(res.data || []);
      // Auto-expand the first record if available
      if (res.data && res.data.length > 0) {
        setExpandedRecordId(res.data[0].id);
      }
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
    setExpandedRecordId(expandedRecordId === id ? null : id);
  };

  const filteredRecords = records.filter((r) => {
    const fullName = `${r.first_name || ''} ${r.surname || ''} ${r.middle_initial || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || (r.philhealth_no || '').includes(searchQuery);
  });

  return (
    <div className="space-y-6">
      {/* Search & Action Bar */}
      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="relative w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name or PhilHealth ID..."
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

            return (
              <div
                key={rec.id}
                className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition"
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

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-md font-mono">
                      {rec.document_id}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Detailed Field View */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-800/80 bg-slate-900/40 space-y-6">
                    
                    {/* 1. Demographics & Personal Information */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                        <User className="w-4 h-4" /> Personal Information
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs bg-slate-900/70 p-4 rounded-lg border border-slate-800/80 font-mono">
                        <div><span className="text-slate-400">Surname:</span> <p className="text-slate-100 font-bold">{rec.surname || 'N/A'}</p></div>
                        <div><span className="text-slate-400">First Name:</span> <p className="text-slate-100 font-bold">{rec.first_name || 'N/A'}</p></div>
                        <div><span className="text-slate-400">Middle Name:</span> <p className="text-slate-100 font-bold">{rec.middle_initial || 'N/A'}</p></div>
                        <div><span className="text-slate-400">Civil Status:</span> <p className="text-slate-100 font-bold">{rec.civil_status || 'N/A'}</p></div>
                        
                        <div><span className="text-slate-400">Place of Birth:</span> <p className="text-slate-100">{rec.place_of_birth || 'N/A'}</p></div>
                        <div><span className="text-slate-400">Occupation:</span> <p className="text-slate-100">{rec.occupation || 'N/A'}</p></div>
                        <div><span className="text-slate-400">Parent / Guardian:</span> <p className="text-slate-100">{rec.parent_guardian || 'N/A'}</p></div>
                        <div><span className="text-slate-400">Signed Name:</span> <p className="text-emerald-400 font-bold">{rec.signed_name || 'N/A'}</p></div>

                        <div><span className="text-slate-400">PhilHealth No:</span> <p className="text-blue-300">{rec.philhealth_no || 'N/A'}</p></div>
                        <div><span className="text-slate-400">Yakap Provider:</span> <p className="text-slate-100">{rec.yakap_provider || 'N/A'}</p></div>
                        <div><span className="text-slate-400">CP NO. (Contact):</span> <p className="text-blue-400">{rec.contact_no || 'N/A'}</p></div>
                        <div><span className="text-slate-400">Record Created:</span> <p className="text-slate-400">{rec.created_at || 'N/A'}</p></div>
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
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${rec.nhts_pr ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                            <span className="text-slate-300">NHTS-PR:</span> <strong>{rec.nhts_pr ? 'Yes' : 'No'}</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${rec.four_ps ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                            <span className="text-slate-300">4Ps:</span> <strong>{rec.four_ps ? 'Yes' : 'No'}</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${rec.indigenous_people ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                            <span className="text-slate-300">Indigenous (IP):</span> <strong>{rec.indigenous_people ? 'Yes' : 'No'}</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${rec.pwds ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                            <span className="text-slate-300">PWDs:</span> <strong>{rec.pwds ? 'Yes' : 'No'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Vital Signs */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                          <HeartPulse className="w-4 h-4" /> Vital Signs
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/70 p-3.5 rounded-lg border border-slate-800/80 font-mono">
                          <div><span className="text-slate-400">BP:</span> <p className="text-slate-100 font-bold">{rec.blood_pressure || 'N/A'}</p></div>
                          <div><span className="text-slate-400">Pulse:</span> <p className="text-slate-100 font-bold">{rec.pulse_rate || 'N/A'}</p></div>
                          <div><span className="text-slate-400">Temp:</span> <p className="text-slate-100 font-bold">{rec.temperature ? `${rec.temperature} °C` : 'N/A'}</p></div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Medical History */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                        <Stethoscope className="w-4 h-4" /> Medical History
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-slate-400">Allergies:</span>
                          <p className="font-bold text-slate-100">{rec.allergies_checked ? `Yes (${rec.allergies_specified || 'Unspecified'})` : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Hypertension / CVA:</span>
                          <p className="font-bold text-slate-100">{rec.hypertension_cva ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Diabetes Mellitus:</span>
                          <p className="font-bold text-slate-100">{rec.diabetes_mellitus ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Blood Disorder:</span>
                          <p className="font-bold text-slate-100">{rec.blood_disorder ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Cardiovascular / Heart:</span>
                          <p className="font-bold text-slate-100">{rec.cardiovascular_heart_diseases ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Thyroid Disorders:</span>
                          <p className="font-bold text-slate-100">{rec.thyroid_disorders ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Hepatitis:</span>
                          <p className="font-bold text-slate-100">{rec.hepatitis_checked ? `Yes (${rec.hepatitis_specified || 'Unspecified'})` : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Malignancy:</span>
                          <p className="font-bold text-slate-100">{rec.malignancy_checked ? `Yes (${rec.malignancy_specified || 'Unspecified'})` : 'No'}</p>
                        </div>
                      </div>
                    </div>

                    {/* 4. History of Hospitalization */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                        <Activity className="w-4 h-4" /> History of Hospitalization
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-slate-400">Medical Admission:</span>
                          <p className="font-mono text-slate-100">{rec.medical_hospitalization_checked ? `Yes - ${rec.medical_hospitalization_specified}` : 'None'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Surgical (Post-Op):</span>
                          <p className="font-mono text-slate-100">{rec.surgical_checked ? `Yes - ${rec.surgical_specified}` : 'None'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Blood Transfusion:</span>
                          <p className="font-mono text-slate-100">{rec.blood_transfusion_checked ? `Yes - ${rec.blood_transfusion_specified}` : 'None'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Tattoo:</span>
                          <p className="font-mono text-slate-100">{rec.tattoo_checked ? `Yes - ${rec.tattoo_specified}` : 'None'}</p>
                        </div>
                      </div>
                    </div>

                    {/* 5. Dietary Habits / Social History */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
                        <Utensils className="w-4 h-4" /> Dietary Habits / Social History
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-slate-400">Sugar Beverages/Food:</span>
                          <p className="font-mono text-emerald-400">{rec.sugar_beverages_checked ? `Yes (${rec.sugar_beverages_specified || 'Specified'})` : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Use of Alcohol:</span>
                          <p className="font-mono text-emerald-400">{rec.use_alcohol_checked ? `Yes (${rec.use_alcohol_specified || 'Specified'})` : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Use of Tobacco:</span>
                          <p className="font-mono text-emerald-400">{rec.use_tobacco_checked ? `Yes (${rec.use_tobacco_specified || 'Specified'})` : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Betel Nut Chewing:</span>
                          <p className="font-mono text-emerald-400">{rec.betel_nut_checked ? `Yes (${rec.betel_nut_specified || 'Specified'})` : 'No'}</p>
                        </div>
                      </div>
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