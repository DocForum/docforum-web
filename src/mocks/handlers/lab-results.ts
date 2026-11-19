// Patient lab results (issue #24): the list, the detail and the authenticated
// file bytes. The viewer fetches files through the API client with a bearer
// token, so the mock serves real bytes rather than a public URL.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';

const DEMO_FILE_BODY = 'DocForum demo lab result (fake data — not a real result).';

export const labResultHandlers = [
  http.get(
    '*/patients/me/lab-results',
    respond('list', () =>
      db.labResults.map(
        ({ values: _values, file: _file, acknowledgement: _ack, ...summary }) => summary,
      ),
    ),
  ),

  http.get(
    '*/lab-results/:resultId',
    respond('json', ({ params }) => {
      const result = db.labResults.find((row) => row.id === paramId(params, 'resultId'));
      return result ?? notFound('lab result');
    }),
  ),

  http.get('*/lab-results/:resultId/file', ({ params }) => {
    const result = db.labResults.find((row) => row.id === paramId(params, 'resultId'));
    if (!result?.file) return notFound('lab result file');
    return new HttpResponse(new Blob([DEMO_FILE_BODY], { type: result.file.mimeType }), {
      headers: { 'Content-Type': result.file.mimeType },
    });
  }),
];
