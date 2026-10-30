import { api } from './api.js';

const $ = (s) => document.querySelector(s);
const user = window.__USER__;
const state = { page: 1, limit: 20, q: '', students: [] };

const escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderRows(students) {
    const tbody = $('#students-body');
    if (!tbody) return;
    if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty">No students found.</td></tr>`;
        return;
    }
    tbody.innerHTML = students.map((s) => `
    <tr>
      <td>${escape(s.first_name)} ${escape(s.last_name)}</td>
      <td>${escape(s.email)}</td>
      <td>${escape(s.grade_level ?? '—')}</td>
      <td><span class="badge badge-${s.status}">${s.status}</span></td>
      <td style="text-align:right">
        <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${s.id}">Edit</button>
        ${user.role === 'admin'
            ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${s.id}">Delete</button>`
            : ''}
      </td>
    </tr>
  `).join('');
}

async function refresh() {
    const params = new URLSearchParams({ page: state.page, limit: state.limit, q: state.q });
    const { data } = await api(`/api/students?${params}`);
    state.students = data;
    renderRows(data);
}

/* ── Modal ─────────────────────────────────────────── */
function openModal(student) {
    const form = $('#student-form');
    form.reset();
    form.dataset.id = student?.id || '';
    $('#modal-title').textContent = student ? 'Edit student' : 'Add student';
    if (student) {
        form.first_name.value = student.first_name;
        form.last_name.value = student.last_name;
        form.email.value = student.email;
        form.phone.value = student.phone || '';
        form.grade_level.value = student.grade_level || '';
        form.date_of_birth.value = student.date_of_birth || '';
        form.status.value = student.status || 'active';
    }
    $('#student-modal').classList.add('open');
}
function closeModal() { $('#student-modal').classList.remove('open'); }

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit') {
        const s = state.students.find((x) => String(x.id) === id)
            || await api(`/api/students/${id}`);
        openModal(s);
    } else if (action === 'delete') {
        if (!confirm('Delete this student?')) return;
        await api(`/api/students/${id}`, { method: 'DELETE' });
        refresh();
    } else if (action === 'delete') {
        if (!confirm('Delete this student?')) return;
        try {
            await api(`/api/students/${id}`, { method: 'DELETE' });
            showToast('Student deleted', 'success');
            refresh();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
});

$('#add-student-btn')?.addEventListener('click', () => openModal());
$('#modal-cancel')?.addEventListener('click', closeModal);

$('#student-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form));
    Object.keys(body).forEach((k) => { if (body[k] === '') body[k] = null; });
    try {
        if (form.dataset.id)
            await api(`/api/students/${form.dataset.id}`, { method: 'PUT', body });
        else
            await api('/api/students', { method: 'POST', body });
        closeModal();
        refresh();
    } catch (err) { alert(err.message); }
});

/* ── Search (debounced) ────────────────────────────── */
let searchTimer;
$('#search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.q = e.target.value.trim();
        state.page = 1;
        refresh();
    }, 300);
});

/* ── Logout ────────────────────────────────────────── */
$('#logout-btn')?.addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
});


function showToast(message, type = 'success', timeout = 3500) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>
    <span class="toast-msg">${escape(message)}</span>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const dismiss = () => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 200);
    };
    el.querySelector('.toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, timeout);
}

$('#student-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form));
    Object.keys(body).forEach((k) => { if (body[k] === '') body[k] = null; });
    const isEdit = !!form.dataset.id;
    try {
        if (isEdit) await api(`/api/students/${isEdit}`, { method: 'PUT', body });
        else await api('/api/students', { method: 'POST', body });
        closeModal();
        showToast(isEdit ? 'Student updated successfully' : 'Student added successfully', 'success');
        refresh();
    } catch (err) {
        showToast(err.message, 'error');
    }
});