import { api } from './api.js';

const $ = (s) => document.querySelector(s);
const alertBox = $('#auth-alert');
const showError = (msg) => {
    alertBox.textContent = msg;
    alertBox.className = 'alert alert-error';
    alertBox.style.display = 'block';
};

document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b === btn));
        const isLogin = btn.dataset.tab === 'login';
        $('#login-form').style.display = isLogin ? 'block' : 'none';
        $('#register-form').style.display = isLogin ? 'none' : 'block';
        alertBox.style.display = 'none';
    });
});

$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await api('/api/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
        window.location.href = '/dashboard';
    } catch (err) { showError(err.message); }
});

$('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await api('/api/auth/register', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
        window.location.href = '/dashboard';
    } catch (err) { showError(err.message); }
});