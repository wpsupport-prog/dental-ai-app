/**
 * Filters patient records by query across multiple fields:
 * - Patient Name (First Name, Surname, Middle Initial)
 * - Mobile / Contact Number (contact_no)
 * - PhilHealth Number (philhealth_no)
 * - Document Reference ID (document_id)
 */
export const filterPatientRecords = (records: any[], query: string): any[] => {
  if (!query || !query.trim()) return records;

  const cleanQuery = query.trim().toLowerCase();

  return records.filter((record) => {
    // Construct search targets
    const surname = (record.surname || '').toLowerCase();
    const firstName = (record.first_name || '').toLowerCase();
    const middleInitial = (record.middle_initial || '').toLowerCase();

    const fullNameCombined = `${surname} ${firstName} ${middleInitial}`;
    const formattedName = `${surname}, ${firstName} ${middleInitial}`;

    const contactNo = (record.contact_no || '').toLowerCase();
    const philhealthNo = (record.philhealth_no || '').toLowerCase();
    const documentId = (record.document_id || '').toLowerCase();

    // Check if query matches any target field
    return (
      fullNameCombined.includes(cleanQuery) ||
      formattedName.includes(cleanQuery) ||
      firstName.includes(cleanQuery) ||
      surname.includes(cleanQuery) ||
      contactNo.includes(cleanQuery) ||
      philhealthNo.includes(cleanQuery) ||
      documentId.includes(cleanQuery)
    );
  });
};