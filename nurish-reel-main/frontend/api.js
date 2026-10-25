/* Thin client for the nurish-reel FastAPI backend.
   Set the base URL with window.NURISH_API or localStorage "nurish.api". */
const Api = (() => {
  const base = () => (window.NURISH_API || localStorage.getItem('nurish.api') || 'http://localhost:8000').replace(/\/$/, '');

  async function upload(video, captions) {
    const fd = new FormData();
    fd.append('video', video);
    if (captions) fd.append('captions', captions);
    const res = await fetch(base() + '/api/videos', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed (' + res.status + ')');
    return res.json(); // { job_id, status }
  }
  async function status(jobId) {
    const res = await fetch(base() + '/api/videos/' + jobId);
    if (!res.ok) throw new Error('Status failed (' + res.status + ')');
    return res.json(); // { job_id, status, current_stage, error }
  }
  async function result(jobId) {
    const res = await fetch(base() + '/api/videos/' + jobId + '/result');
    if (!res.ok) throw new Error('Result failed (' + res.status + ')');
    return res.json(); // { recipe, shopping_list, transcript }
  }
  async function health() {
    try { const r = await fetch(base() + '/health'); return r.ok; } catch (e) { return false; }
  }
  return { base, upload, status, result, health };
})();
