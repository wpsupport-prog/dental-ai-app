import React, { useState } from 'react';
import { CheckCircle, FileText, Upload, RefreshCw, Check, HeartPulse, User, ShieldCheck, Stethoscope, Activity } from 'lucide-react';
import axios from 'axios';

export default function App() {
  const [formData, setFormData] = useState({
    // Patient Info
    surname: '',
    firstName: '',
    middleInitial: '',
    dob: '',
    age: '',
    sex: '',
    civilStatus: '',
    placeOfBirth: '',
    address: '',
    occupation: '',
    parentGuardian: '',
    philhealthNo: '',
    yakapProvider: '',
    contactNo: '',
    signedName: '',

    // Vital Signs
    bloodPressure: '',
    pulseRate: '',
    temperature: '',

    // Memberships
    nhtsPr: false,
    fourPs: false,
    indigenousPeople: false,
    pwds: false,

    // Medical History
    allergiesChecked: false,
    allergiesSpecified: '',
    hypertensionCva: false,
    diabetesMellitus: false,
    bloodDisorder: false,
    cardiovascularHeartDiseases: false,
    thyroidDisorders: false,
    hepatitisChecked: false,
    hepatitisSpecified: '',
    malignancyChecked: false,
    malignancySpecified: '',

    // History of Previous Hospitalization
    medicalHospitalizationChecked: false,
    medicalHospitalizationSpecified: '',
    surgicalChecked: false,
    surgicalSpecified: '',
    bloodTransfusionChecked: false,
    bloodTransfusionSpecified: '',
    tattooChecked: false,
    tattooSpecified: '',
    othersChecked: false,
    othersSpecified: '',
  });

  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confidence, setConfidence] = useState<number>(0.98);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setSavedSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setSavedSuccess(false);

    const bodyFormData = new FormData();
    bodyFormData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/api/v1/forms/upload', bodyFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const info = response.data.patient_info || {};
      const vitals = response.data.vital_signs || {};
      const mems = response.data.memberships || {};
      const med = response.data.medical_history || {};

      setFormData({
        surname: info.surname || '',
        firstName: info.first_name || '',
        middleInitial: info.middle_initial || '',
        dob: info.dob || '',
        age: info.age || '',
        sex: info.sex || '',
        civilStatus: info.civil_status || '',
        placeOfBirth: info.place_of_birth || '',
        address: info.address || '',
        occupation: info.occupation || '',
        parentGuardian: info.parent_guardian || '',
        philhealthNo: info.philhealth_no || '',
        yakapProvider: info.yakap_provider || '',
        contactNo: info.contact_no || '',
        signedName: info.signed_name || '',

        bloodPressure: vitals.blood_pressure || '',
        pulseRate: vitals.pulse_rate || '',
        temperature: vitals.temperature || '',

        nhtsPr: !!mems.nhts_pr,
        fourPs: !!mems.four_ps,
        indigenousPeople: !!mems.indigenous_people,
        pwds: !!mems.pwds,

        // Medical Conditions
        allergiesChecked: !!med.allergies_checked || !!med.allergies_specified,
        allergiesSpecified: med.allergies_specified || '',
        hypertensionCva: !!med.hypertension_cva,
        diabetesMellitus: !!med.diabetes_mellitus,
        bloodDisorder: !!med.blood_disorder,
        cardiovascularHeartDiseases: !!med.cardiovascular_heart_diseases,
        thyroidDisorders: !!med.thyroid_disorders,
        hepatitisChecked: !!med.hepatitis_checked || !!med.hepatitis_specified,
        hepatitisSpecified: med.hepatitis_specified || '',
        malignancyChecked: !!med.malignancy_checked || !!med.malignancy_specified,
        malignancySpecified: med.malignancy_specified || '',

        // Hospitalization & History
        medicalHospitalizationChecked: !!med.medical_hospitalization_checked || !!med.medical_hospitalization_specified,
        medicalHospitalizationSpecified: med.medical_hospitalization_specified || '',
        surgicalChecked: !!med.surgical_checked || !!med.surgical_specified,
        surgicalSpecified: med.surgical_specified || '',
        bloodTransfusionChecked: !!med.blood_transfusion_checked || !!med.blood_transfusion_specified,
        bloodTransfusionSpecified: med.blood_transfusion_specified || '',
        tattooChecked: !!med.tattoo_checked || !!med.tattoo_specified,
        tattooSpecified: med.tattoo_specified || '',
        othersChecked: !!med.others_checked || !!med.others_specified,
        othersSpecified: med.others_specified || '',
      });

      setConfidence(response.data.confidence_score);
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Failed to execute AI extraction.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-12">
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <FileText className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">Dental AI Intake Suite</h1>
            <p className="text-xs text-slate-400">City Health Office Treatment Record AI Reader</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition border border-slate-700">
            <Upload className="w-4 h-4 text-blue-400"/>
            <span>{file ? file.name : "Select Form Scan"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          <button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
          >
            {isUploading ? <RefreshCw className="w-4 h-4 animate-spin"/> : "Process with AI"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex p-6 gap-6">
        <section className="w-5/12 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sticky top-24 h-[calc(100vh-8rem)]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-slate-300">Scanned Document Preview</span>
            {file && <span className="text-xs text-blue-400 bg-blue-950/60 px-2 py-1 rounded border border-blue-800">{file.name}</span>}
          </div>
          <div className="flex-1 bg-slate-900 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-sm overflow-hidden p-2">
            {imagePreview ? (
              <img src={imagePreview} alt="Scanned Form" className="max-h-full max-w-full object-contain rounded" />
            ) : (
              <p>Upload a form scan to preview</p>
            )}
          </div>
        </section>

        <section className="w-7/12 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Extracted Patient Details</h2>
              <span className="text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <Check className="w-3.5 h-3.5"/> {Math.round(confidence * 100)}% Confidence
              </span>
            </div>

            {/* Demographics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                <User className="w-4 h-4"/> Personal Information
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Surname</label>
                  <input type="text" value={formData.surname} onChange={(e) => setFormData({ ...formData, surname: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">First Name</label>
                  <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Middle Name</label>
                  <input type="text" value={formData.middleInitial} onChange={(e) => setFormData({ ...formData, middleInitial: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Date of Birth</label>
                  <input type="text" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Age / Sex</label>
                  <input type="text" value={`${formData.age} / ${formData.sex}`} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Civil Status</label>
                  <input type="text" value={formData.civilStatus} onChange={(e) => setFormData({ ...formData, civilStatus: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Address</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Occupation</label>
                  <input type="text" value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">PhilHealth No.</label>
                  <input type="text" value={formData.philhealthNo} onChange={(e) => setFormData({ ...formData, philhealthNo: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Yakap Provider</label>
                  <input type="text" value={formData.yakapProvider} onChange={(e) => setFormData({ ...formData, yakapProvider: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">CP NO. (Contact)</label>
                  <input type="text" value={formData.contactNo} onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono text-blue-400" />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Signed Patient / Guardian</label>
                  <input type="text" value={formData.signedName} onChange={(e) => setFormData({ ...formData, signedName: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-semibold" />
                </div>
              </div>
            </div>

            {/* Memberships */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                <ShieldCheck className="w-4 h-4"/> Other Patient Information (Membership)
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.nhtsPr} onChange={(e) => setFormData({ ...formData, nhtsPr: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  NHTS
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.fourPs} onChange={(e) => setFormData({ ...formData, fourPs: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  4PS
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.indigenousPeople} onChange={(e) => setFormData({ ...formData, indigenousPeople: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  IP
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.pwds} onChange={(e) => setFormData({ ...formData, pwds: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  PWDs
                </label>
              </div>
            </div>

            {/* Vital Signs */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                <HeartPulse className="w-4 h-4"/> Vital Signs
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Blood Pressure</label>
                  <input type="text" value={formData.bloodPressure} onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Pulse Rate</label>
                  <input type="text" value={formData.pulseRate} onChange={(e) => setFormData({ ...formData, pulseRate: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Temperature (°C)</label>
                  <input type="text" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono" />
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                <Stethoscope className="w-4 h-4"/> Medical History
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                
                {/* Allergies */}
                <div className="col-span-2 grid grid-cols-3 items-center gap-2 pb-1 border-b border-slate-800/50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.allergiesChecked} onChange={(e) => setFormData({ ...formData, allergiesChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                    Allergies:
                  </label>
                  <input type="text" placeholder="Specified details..." value={formData.allergiesSpecified} onChange={(e) => setFormData({ ...formData, allergiesSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.hypertensionCva} onChange={(e) => setFormData({ ...formData, hypertensionCva: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  Hypertension / CVA
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.diabetesMellitus} onChange={(e) => setFormData({ ...formData, diabetesMellitus: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  Diabetes Mellitus
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.bloodDisorder} onChange={(e) => setFormData({ ...formData, bloodDisorder: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  Blood Disorders
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.cardiovascularHeartDiseases} onChange={(e) => setFormData({ ...formData, cardiovascularHeartDiseases: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  Cardiovascular / Heart
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.thyroidDisorders} onChange={(e) => setFormData({ ...formData, thyroidDisorders: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                  Thyroid Disorders
                </label>

                {/* Hepatitis */}
                <div className="col-span-2 grid grid-cols-3 items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.hepatitisChecked} onChange={(e) => setFormData({ ...formData, hepatitisChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                    Hepatitis:
                  </label>
                  <input type="text" placeholder="Type specified..." value={formData.hepatitisSpecified} onChange={(e) => setFormData({ ...formData, hepatitisSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                </div>

                {/* Malignancy */}
                <div className="col-span-2 grid grid-cols-3 items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.malignancyChecked} onChange={(e) => setFormData({ ...formData, malignancyChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                    Malignancy:
                  </label>
                  <input type="text" placeholder="Details specified..." value={formData.malignancySpecified} onChange={(e) => setFormData({ ...formData, malignancySpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                </div>
              </div>
            </div>

            {/* History of Previous Hospitalization */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                <Activity className="w-4 h-4"/> History of Previous Hospitalization
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                
                {/* Medical */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.medicalHospitalizationChecked} onChange={(e) => setFormData({ ...formData, medicalHospitalizationChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                    Medical (Last Admission & Cause):
                  </label>
                  <input type="text" placeholder="Details..." value={formData.medicalHospitalizationSpecified} onChange={(e) => setFormData({ ...formData, medicalHospitalizationSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                </div>

                {/* Surgical */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.surgicalChecked} onChange={(e) => setFormData({ ...formData, surgicalChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                    Surgical (Post-Operative):
                  </label>
                  <input type="text" placeholder="Details..." value={formData.surgicalSpecified} onChange={(e) => setFormData({ ...formData, surgicalSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                </div>

                {/* Blood Transfusion */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.bloodTransfusionChecked} onChange={(e) => setFormData({ ...formData, bloodTransfusionChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                    Blood Transfusion (Month & Year):
                  </label>
                  <input type="text" placeholder="Details..." value={formData.bloodTransfusionSpecified} onChange={(e) => setFormData({ ...formData, bloodTransfusionSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                </div>

                {/* Tattoo */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.tattooChecked} onChange={(e) => setFormData({ ...formData, tattooChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                    Tattoo:
                  </label>
                  <input type="text" placeholder="Details..." value={formData.tattooSpecified} onChange={(e) => setFormData({ ...formData, tattooSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                </div>

                {/* Others */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.othersChecked} onChange={(e) => setFormData({ ...formData, othersChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                    Others (Please specify):
                  </label>
                  <input type="text" placeholder="Details..." value={formData.othersSpecified} onChange={(e) => setFormData({ ...formData, othersSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                </div>

              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            {savedSuccess && (
              <p className="text-xs text-emerald-400 text-center mb-2 font-medium">
                ✓ Record successfully committed to Dental EHR Database!
              </p>
            )}
            <button 
              onClick={() => setSavedSuccess(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50"
            >
              <CheckCircle className="w-5 h-5"/> Confirm & Push Record to Database
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}