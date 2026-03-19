const statusEl = document.getElementById('status');
const btn = document.getElementById('resetBtn');

// Завантаження статусу
async function loadStatus() {
  try {
    const res = await fetch('/admin/status');
    const data = await res.json();
    statusEl.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    statusEl.textContent = 'Помилка завантаження: ' + e.message;
  }
}

// Клік по кнопці
btn.addEventListener('click', async () => {
  if (!confirm('Точно створити новий приз?')) return;

  try {
    const res = await fetch('/admin/reset-prize', {
      method: 'POST'
    });

    const data = await res.json();

    if (data.success) {
      alert('Успішно: ' + data.message);
      loadStatus();
    } else {
      alert('Помилка: ' + data.message);
    }
  } catch (e) {
    alert('Помилка з\'єднання: ' + e.message);
  }
});

// При завантаженні
loadStatus();