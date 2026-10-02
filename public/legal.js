const button = document.getElementById('clear-local');
if (button) button.addEventListener('click', () => {
  for (const key of ['posts', 'liked', 'saved', 'comments', 'notifications']) { try { localStorage.removeItem('larpedin:' + key); } catch {} }
  document.getElementById('clear-status').textContent = 'Cleared.';
});
