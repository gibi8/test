// ============================================
//   KONTO UŻYTKOWNIKA - UI
// ============================================

window.renderAccount = async function() {
    if (!window.currentUser) { window.showPage('home'); return; }
    
    document.getElementById('account-login').textContent = window.currentUser.login;
    document.getElementById('account-role').textContent = window.currentUser.role === 'admin' ? 'Administrator' : 'Użytkownik';
    
    try {
        const orders = window.loadOrders ? await window.loadOrders() : [];
        const userOrders = orders.filter(o => {
            const customer = o.customer || {};
            return customer.login === window.currentUser.login || customer.email === window.currentUser.email;
        });
        const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        document.getElementById('account-orders-count').textContent = userOrders.length;
        document.getElementById('account-total-spent').textContent = totalSpent.toFixed(2) + ' zł';
        
        const accountOrders = document.getElementById('account-orders');
        if (accountOrders) {
            accountOrders.innerHTML = '';
            if (userOrders.length === 0) {
                accountOrders.innerHTML = '<p style="color:rgba(255,255,255,0.4);">Brak zamówień</p>';
            } else {
                userOrders.forEach(order => {
                    const card = document.createElement('div');
                    card.className = 'order-card';
                    let itemsHtml = '';
                    if (order.items) {
                        order.items.forEach(item => {
                            itemsHtml += `<li><span>${item.name} x${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)} zł</span></li>`;
                        });
                    }
                    card.innerHTML = `
                        <div class="order-header">
                            <span class="order-id">#${order.id || '—'}</span>
                            <span class="order-date">${order.date || '—'}</span>
                        </div>
                        <ul class="order-items">${itemsHtml}</ul>
                        <div class="order-total">Suma: ${(order.total || 0).toFixed(2)} zł</div>
                        <div class="order-license">Klucz: ${order.licenseKey || '—'}</div>
                        <div class="order-status-control"><span>Status:</span> ${order.status || 'Oczekujące'}</div>
                    `;
                    accountOrders.appendChild(card);
                });
            }
        }
    } catch (error) {
        console.error('Błąd ładowania konta:', error);
        window.showNotification('Błąd ładowania danych', 'error');
    }
};

console.log('✅ Account UI - załadowane');