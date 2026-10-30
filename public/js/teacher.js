import { api } from './api.js';

const $ = (s) => document.querySelector(s);
const state = { q: '' };

const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Toast ──────────────────────────────────────── */
function showToast(message, type = 'success', timeout = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'i'}</span>
    <span class="toast-msg"></span>
    <button class="toast-close" aria-label="Dismiss">×</button>`;
    el.querySelector('.toast-msg').textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const dismiss = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 200); };
    el.querySelector('.toast-close').addEventListener('click', dismiss);
    if (timeout > 0) setTimeout(dismiss, timeout);
}

/* ── Student roster (search + view) ─────────────── */
async function refreshStudents() {
    const params = new URLSearchParams({ q: state.q, limit: 100 });
    const { data } = await api(`/api/students?${params}`);
    const tbody = $('#students-body');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty">No students found.</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map((s) => `
    <tr>
      <td>${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</td>
      <td>${escapeHtml(s.email)}</td>
      <td>${escapeHtml(s.grade_level ?? '—')}</td>
      <td><span class="badge badge-${s.status}">${s.status}</span></td>
      <td style="text-align:right">
        <button class="btn btn-ghost btn-sm" data-view-id="${s.id}">View</button>
      </td>
    </tr>`).join('');
}

async function viewStudent(id) {
    try {
        const s = await api(`/api/students/${id}`);
        $('#view-title').textContent = `${s.first_name} ${s.last_name}`;
        $('#view-body').innerHTML = `
      <div><div style="font-size:12px;color:var(--muted)">EMAIL</div><div>${escapeHtml(s.email)}</div></div>
      <div><div style="font-size:12px;color:var(--muted)">PHONE</div><div>${escapeHtml(s.phone ?? '—')}</div></div>
      <div><div style="font-size:12px;color:var(--muted)">DATE OF BIRTH</div><div>${escapeHtml(s.date_of_birth ?? '—')}</div></div>
      <div><div style="font-size:12px;color:var(--muted)">GRADE LEVEL</div><div>${escapeHtml(s.grade_level ?? '—')}</div></div>
      <div><div style="font-size:12px;color:var(--muted)">STATUS</div><div><span class="badge badge-${s.status}">${s.status}</span></div></div>`;
        $('#view-modal').classList.add('open');
    } catch (err) {
        showToast(err.message, 'error', 5000);
    }
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view-id]');
    if (btn) viewStudent(btn.dataset.viewId);
});

$('#view-close')?.addEventListener('click', () => $('#view-modal').classList.remove('open'));

let searchTimer;
$('#search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.q = e.target.value.trim();
        refreshStudents();
    }, 300);
});

$('#logout-btn')?.addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
});