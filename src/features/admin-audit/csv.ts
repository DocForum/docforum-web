// CSV export of whatever page the admin is looking at. Never fetches more
// data — the export is exactly the rows already on screen.
//
// The helpers themselves live in `src/utils/csv.ts` (issue #278): the facility
// payout ledger and the patient payment history need the same escaping, and
// features should not reach into each other for it. Re-exported here so the
// existing audit imports keep working.
export { csvFilename, downloadCsv, escapeCsvCell, toCsv, type CsvColumn } from '../../utils/csv';
