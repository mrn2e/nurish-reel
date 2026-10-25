/* Thin client for the nurish-reel FastAPI backend.
   Set the base URL with window.NURISH_API or localStorage "nurish.api". */
const Api = (() => {
  const base = () => (window.NURISH_API || localStorage.getItem('nurish.api') || 'http://localhost:8000').replace(/\/$/, '');

  // HTTP errors are real answers from the server: keep the message and do NOT treat them
  // as "backend unreachable". Only a failed fetch() (network, CORS, wrong URL) has no `server` flag.
  async function fail(res, what) {
    let detail = '';
    try { const j = await res.json(); detail = typeof j.detail === 'string' ? j.detail : ''; } catch (e) { /* not JSON */ }
    const err = new Error(detail || what + ' failed (HTTP ' + res.status + ')');
    err.server = true; err.status = res.status;
    throw err;
  }
  async function upload(video, captions) {
    const fd = new FormData();
    fd.append('video', video);
    if (captions) fd.append('captions', captions);
    const res = await fetch(base() + '/api/videos', { method: 'POST', body: fd });
    if (!res.ok) await fail(res, 'Upload');
    return res.json(); // { job_id, status }
  }
  async function status(jobId) {
    const res = await fetch(base() + '/api/videos/' + jobId);
    if (!res.ok) await fail(res, 'Checking progress');
    return res.json(); // { job_id, status, current_stage, error }
  }
  async function result(jobId) {
    const res = await fetch(base() + '/api/videos/' + jobId + '/result');
    if (!res.ok) await fail(res, 'Loading the recipe');
    return res.json(); // { recipe, shopping_list, transcript, warnings }
  }
  async function health() {
    try { const r = await fetch(base() + '/health'); return r.ok; } catch (e) { return false; }
  }
  return { base, upload, status, result, health };
})();
