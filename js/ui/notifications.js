// ============================================
//   NOTYFIKACJE
// ============================================

window.confirmCallback = null;

window.showNotification = function(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = 'notification';
    if (type === 'error') notif.classList.add('error');
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
};

window.showConfirmModal = function(title, message, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    window.confirmCallback = callback;
    document.getElementById('confirm-modal').classList.add('active');
};

window.closeConfirmModal = function() {
    document.getElementById('confirm-modal').classList.remove('active');
    window.confirmCallback = null;
};

window.confirmYes = function() {
    if (window.confirmCallback) {
        const cb = window.confirmCallback;
        window.confirmCallback = null;
        window.closeConfirmModal();
        setTimeout(() => {
            if (typeof cb === 'function') cb();
        }, 100);
    } else {
        window.closeConfirmModal();
    }
};

console.log('✅ Notifications - załadowane');