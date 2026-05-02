// Common quarterly report helpers shared across financial views.
const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

export const sortReports = (reports = []) =>
  [...reports].sort((a, b) => {
    const ay = Number(a?.year) || 0;
    const by = Number(b?.year) || 0;
    if (ay !== by) return ay - by;
    return (QUARTER_ORDER[a?.quarter] || 0) - (QUARTER_ORDER[b?.quarter] || 0);
  });

export const findLatestReport = (reports = []) => {
  if (!Array.isArray(reports) || reports.length === 0) return null;
  return sortReports(reports)[reports.length - 1] || null;
};
