// ============================================
//   ADMIN - LOGIKA
// ============================================

window.logActivity = async function(page, action, status = '200') {
    try {
        let ip = '0.0.0.0';
        let city = 'Nieznana';
        
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            ip = ipData.ip;
            try {
                const cityResponse = await fetch(`https://ipinfo.io/${ip}/json`);
                const cityData = await cityResponse.json();
                if (cityData && cityData.city) city = cityData.city + ', ' + (cityData.country || '');
            } catch(e) {}
        } catch(e) {}
        
        if (window.db) {
            await window.db.collection('logs').add({
                date: new Date().toISOString(),
                dateString: new Date().toLocaleString('pl-PL'),
                ip, device: window.getDeviceType ? window.getDeviceType(navigator.userAgent) : 'PC',
                browser: window.getBrowserName ? window.getBrowserName(navigator.userAgent) : 'Chrome',
                page, action, status, city
            });
        }
    } catch(e) {
        console.error('Błąd logowania:', e);
    }
};

window.loadLogs = async function() {
    try {
        if (window.db) {
            const snapshot = await window.db.collection('logs').orderBy('date', 'desc').limit(200).get();
            const logs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                logs.push({ id: doc.id, ...data, date: data.dateString || '—' });
            });
            return logs;
        }
        return [];
    } catch (error) {
        console.error('Błąd ładowania logów:', error);
        return [];
    }
};

window.clearLogsFromDb = async function() {
    try {
        if (window.db) {
            const snapshot = await window.db.collection('logs').get();
            const batch = [];
            snapshot.forEach(doc => {
                batch.push(window.db.collection('logs').doc(doc.id).delete());
            });
            await Promise.all(batch);
        }
    } catch (error) {
        console.error('Błąd czyszczenia logów:', error);
        throw error;
    }
};

window.exportLogs = async function() {
    const logs = await window.loadLogs();
    if (logs.length === 0) {
        window.showNotification('Brak logów do zapisania', 'error');
        return;
    }
    let csv = 'Data,IP,Urządzenie,Przeglądarka,Strona,Akcja,Status,Miejscowość\n';
    logs.forEach(log => {
        csv += `"${log.date || ''}","${log.ip || ''}","${log.device || ''}","${log.browser || ''}","${log.page || ''}","${log.action || ''}","${log.status || ''}","${log.city || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logi_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.showNotification('Zapisano logi do pliku CSV', 'success');
};

window.loadKeys = async function() {
    try {
        if (window.db) {
            const snapshot = await window.db.collection('orders').get();
            const keys = [];
            snapshot.forEach(doc => {
                const order = doc.data();
                if (order.licenseKey) {
                    const customer = order.customer || {};
                    keys.push({
                        orderId: doc.id,
                        key: order.licenseKey,
                        customerName: customer.name || 'Brak danych',
                        customerEmail: customer.email || 'Brak danych',
                        orderDate: order.date || 'Brak danych',
                        status: order.status || 'Oczekujące'
                    });
                }
            });
            return keys;
        }
        return [];
    } catch (error) {
        console.error('Błąd ładowania kluczy:', error);
        return [];
    }
};

window.deleteKey = async function(orderId) {
    try {
        if (window.db) {
            await window.db.collection('orders').doc(orderId).delete();
            window.showNotification('Usunięto klucz', 'error');
            return true;
        }
        return false;
    } catch (error) {
        window.showNotification('Błąd: ' + error.message, 'error');
        return false;
    }
};

window.renderLogsUI = async function() {
    const logs = await window.loadLogs();
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,0.4);padding:30px;">Brak logów</td></tr>';
        return;
    }
    logs.forEach(log => {
        const tr = document.createElement('tr');
        let statusClass = 'info';
        if (log.status === '200' || log.status === 'Sukces') statusClass = 'success';
        if (log.status === 'Błąd') statusClass = 'error';
        tr.innerHTML = `
            <td>${log.date || '—'}</td>
            <td>${log.ip || '—'}</td>
            <td>${log.device || '—'}</td>
            <td>${log.browser || '—'}</td>
            <td>${log.page || '—'}</td>
            <td>${log.action || '—'}</td>
            <td><span class="log-status ${statusClass}">${log.status || '—'}</span></td>
            <td>${log.city || 'Nieznana'}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.renderOrders = async function() {
    const orders = await window.loadOrders();
    const list = document.getElementById('orders-list');
    if (!list) return;
    list.innerHTML = '';
    if (orders.length === 0) { list.innerHTML = '<div class="no-orders">Brak zamówień</div>'; return; }
    orders.forEach(order => {
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
                <span class="order-id">Zamówienie #${order.id || '—'}</span>
                <span class="order-date">${order.date || '—'}</span>
            </div>
            <div class="order-customer">
                <strong>${order.customer?.name || '—'}</strong> | ${order.customer?.email || '—'}<br>
                Adres: ${order.customer?.address || '—'}
            </div>
            <ul class="order-items">${itemsHtml}</ul>
            <div class="order-total">Suma: ${(order.total || 0).toFixed(2)} zł</div>
            <div class="order-license">Klucz: ${order.licenseKey || '—'}</div>
            <div class="order-status-control">
                <span>Status:</span>
                <select onchange="window.updateOrderStatusInDb('${order.id}', this.value); window.renderOrders();">
                    <option value="Oczekujące" ${order.status === 'Oczekujące' ? 'selected' : ''}>Oczekujące</option>
                    <option value="Opłacone" ${order.status === 'Opłacone' ? 'selected' : ''}>Opłacone</option>
                    <option value="Wysłane" ${order.status === 'Wysłane' ? 'selected' : ''}>Wysłane</option>
                    <option value="Dostarczone" ${order.status === 'Dostarczone' ? 'selected' : ''}>Dostarczone</option>
                </select>
            </div>
        `;
        list.appendChild(card);
    });
};

window.renderAdminProducts = async function() {
    await window.loadProducts();
    const list = document.getElementById('admin-list');
    if (!list) return;
    list.innerHTML = '';
    if (!window.products || window.products.length === 0) {
        list.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Brak produktów</p>';
        return;
    }
    window.products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        const imageUrl = product.image && product.image.trim() !== '' ? product.image : 'https://via.placeholder.com/50/0c121c/3b82f6?text=N';
        let featuresDisplay = '';
        if (product.features && product.features.length > 0) {
            featuresDisplay = product.features.slice(0, 2).join(', ') + (product.features.length > 2 ? '...' : '');
        }
        let specsDisplay = '';
        if (product.specs && Object.keys(product.specs).length > 0) {
            const entries = Object.entries(product.specs).slice(0, 2);
            specsDisplay = entries.map(([k, v]) => `${k}: ${v}`).join(', ') + (Object.keys(product.specs).length > 2 ? '...' : '');
        }
        item.innerHTML = `
            <div class="admin-item-info">
                <img src="${imageUrl}" alt="" class="admin-item-image" onerror="this.src='https://via.placeholder.com/50/0c121c/3b82f6?text=N'">
                <div>
                    <div class="admin-item-name">${product.name}</div>
                    <div class="admin-item-price">${(product.price || 0).toFixed(2)} zł | Stan: ${product.stock || 0} szt.</div>
                    ${product.description ? `<div style="color:var(--text-secondary);font-size:12px;margin-top:2px;">${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}</div>` : ''}
                    ${featuresDisplay ? `<div style="color:var(--text-muted);font-size:11px;margin-top:1px;">Cechy: ${featuresDisplay}</div>` : ''}
                    ${specsDisplay ? `<div style="color:var(--text-muted);font-size:11px;">Specyfikacja: ${specsDisplay}</div>` : ''}
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="edit-btn" onclick="window.openEditProductModal('${product.id}')">Edytuj</button>
                <button class="delete-btn" onclick="window.deleteProduct('${product.id}')">Usuń</button>
            </div>
        `;
        list.appendChild(item);
    });
};

window.openEditProductModal = function(productId) {
    const product = window.products ? window.products.find(p => p.id === productId) : null;
    if (!product) { window.showNotification('Produkt nie znaleziony', 'error'); return; }
    window.editingProductId = productId;
    document.getElementById('edit-name').value = product.name || '';
    document.getElementById('edit-price').value = product.price || 0;
    document.getElementById('edit-image').value = product.image || '';
    document.getElementById('edit-stock').value = product.stock || 0;
    document.getElementById('edit-description').value = product.description || '';
    document.getElementById('edit-features').value = (product.features || []).join(', ');
    document.getElementById('edit-specs').value = Object.entries(product.specs || {}).map(([k, v]) => `${k}:${v}`).join(', ');
    document.getElementById('edit-product-modal').classList.add('active');
};

window.deleteProduct = function(id) {
    window.showConfirmModal('Usunąć produkt?', 'Czy na pewno chcesz usunąć ten produkt?', async function() {
        if (window.deleteProductFromDb) await window.deleteProductFromDb(id);
        await window.loadProducts();
        window.renderAdminProducts();
        window.renderProducts();
        window.showNotification('Usunięto produkt', 'error');
    });
};

window.renderStats = async function() {
    const orders = await window.loadOrders();
    const users = await window.loadUsers();
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const today = new Date().toLocaleDateString('pl-PL');
    const todayOrders = orders.filter(o => o.date && o.date.includes(today)).length;
    document.getElementById('stats-total-revenue').textContent = totalRevenue.toFixed(2) + ' zł';
    document.getElementById('stats-total-orders').textContent = totalOrders;
    document.getElementById('stats-today-orders').textContent = todayOrders;
    document.getElementById('stats-total-users').textContent = users.length;
    window.renderChart(orders);
};

window.renderChart = function(orders) {
    const canvas = document.getElementById('sales-chart');
    if (!canvas) return;
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('pl-PL');
        const dayOrders = orders.filter(o => o.date && o.date.includes(dateStr));
        const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        last7Days.push({ date: dateStr, revenue: revenue, count: dayOrders.length });
    }
    if (window.salesChart) window.salesChart.destroy();
    window.salesChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.date),
            datasets: [{
                label: 'Przychód (zł)',
                data: last7Days.map(d => d.revenue),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#f1f5f9' } } },
            scales: {
                x: { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.04)' } }
            }
        }
    });
};

window.renderUsersUI = async function() {
    const users = await window.loadUsers();
    const list = document.getElementById('users-list');
    if (!list) return;
    list.innerHTML = '';
    if (users.length === 0) { list.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:30px;">Brak użytkowników</p>'; return; }
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        const initial = (user.login || '?').charAt(0).toUpperCase();
        card.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${initial}</div>
                <div><div class="user-name">${user.login || '—'}</div><div class="user-email">${user.email || '—'}</div></div>
            </div>
            <div class="user-role ${user.role || 'user'}">${user.role || 'user'}</div>
            <div class="user-actions">
                <button class="edit-btn" onclick="window.updateUserRole('${user.id}', '${user.role === 'admin' ? 'user' : 'admin'}'); window.renderUsersUI();">
                    ${user.role === 'admin' ? 'Zdegraduj' : 'Zrób adminem'}
                </button>
            </div>
        `;
        list.appendChild(card);
    });
};

window.renderKeysUI = async function() {
    const keys = await window.loadKeys();
    const list = document.getElementById('keys-list');
    if (!list) return;
    list.innerHTML = '';
    if (keys.length === 0) { list.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:30px;">Brak wydanych kluczy.</p>'; return; }
    keys.forEach(keyData => {
        const card = document.createElement('div');
        card.className = 'key-card';
        card.innerHTML = `
            <div class="key-info">
                <div class="key-value">${keyData.key}</div>
                <div class="key-customer"><strong>Kupujący:</strong> ${keyData.customerName} (${keyData.customerEmail})</div>
                <div class="key-customer"><strong>Data zakupu:</strong> ${keyData.orderDate}</div>
                <div class="key-customer"><strong>Status:</strong> ${keyData.status}</div>
            </div>
            <div class="key-actions">
                <button class="copy-btn" onclick="window.copyKey('${keyData.key}')">Kopiuj</button>
                <button class="delete-key-btn" onclick="window.deleteKey('${keyData.orderId}'); window.renderKeysUI();">Usuń</button>
            </div>
        `;
        list.appendChild(card);
    });
};

window.copyKey = function(key) {
    navigator.clipboard.writeText(key).then(() => window.showNotification('Skopiowano klucz!', 'success')).catch(() => window.showNotification('Nie udało się skopiować', 'error'));
};

window.clearLogs = function() {
    window.showConfirmModal('Czyścić logi?', 'Czy na pewno chcesz usunąć wszystkie logi aktywności?', async function() {
        await window.clearLogsFromDb();
        window.renderLogsUI();
        window.showNotification('Wyczyszczono logi', 'error');
    });
};

window.clearOrders = function() {
    window.showConfirmModal('Czyścić zamówienia?', 'Czy na pewno chcesz usunąć wszystkie zamówienia?', async function() {
        await window.clearOrdersFromDb();
        window.renderOrders();
        window.showNotification('Wyczyszczono zamówienia', 'error');
    });
};

console.log('✅ Admin - załadowane');