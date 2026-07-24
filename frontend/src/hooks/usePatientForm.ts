import { useState } from 'react';

export const INITIAL_FORM_STATE = {
  patient_info: {
    surname: '', first_name: '', middle_initial: '', dob: '', age: '',
    sex: '', civil_status: '', place_of_birth: '', address: '',
    occupation: '', parent_guardian: '', philhealth_no: '',
    yakap_provider: '', contact_no: '', signed_name: ''
  },
  vital_signs: { blood_pressure: '', pulse_rate: '', temperature: '', height: '', weight: '' },
  memberships: { nhts_pr: false, four_ps: false, indigenous_people: false, pwds: false },
  medical_history: {
    allergies_checked: false, allergies_specified: '', hypertension_cva: false,
    diabetes_mellitus: false, blood_disorder: false, cardiovascular_heart_diseases: false,
    thyroid_disorders: false, hepatitis_checked: false, hepatitis_specified: '',
    malignancy_checked: false, malignancy_specified: '', medical_hospitalization_checked: false,
    medical_hospitalization_specified: '', surgical_checked: false, surgical_specified: '',
    blood_transfusion_checked: false, blood_transfusion_specified: '', tattoo_checked: false,
    tattoo_specified: '', others_checked: false, others_specified: ''
  },
  social_history: {
    sugar_beverages_checked: false, sugar_beverages_specified: '', use_alcohol_checked: false,
    use_alcohol_specified: '', use_tobacco_checked: false, use_tobacco_specified: '',
    betel_nut_checked: false, betel_nut_specified: ''
  }
};

export function usePatientForm() {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);

  const resetAll = async () => {
    // 1. Reset React State
    setFormData(INITIAL_FORM_STATE);
    setPreviewImage(null);
    setConfidenceScore(null);

    // 2. Clear backend sync buffer
    try {
      await fetch('http://localhost:8000/api/v1/sync/clear', { method: 'POST' });
    } catch (err) {
      console.error('Failed to clear backend sync state:', err);
    }
  };

  return {
    formData,
    setFormData,
    previewImage,
    setPreviewImage,
    confidenceScore,
    setConfidenceScore,
    resetAll
  };
}