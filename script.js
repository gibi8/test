// ============ KONFIGURACJA FIREBASE ============
const firebaseConfig = {
  apiKey: "AIzaSyB7kgCifJsbmaaEfzg0APYf4DMQlf9ygO0",
  authDomain: "test-34119.firebaseapp.com",
  projectId: "test-34119",
  storageBucket: "test-34119.firebasestorage.app",
  messagingSenderId: "873426093218",
  appId: "1:873426093218:web:ec29ac10c8aa67d72f03fb",
  measurementId: "G-4YJJ291J8D"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ============ KONFIGURACJA EMAILJS ============
if (typeof emailjs !== 'undefined') {
    emailjs.init('YOUR_PUBLIC_KEY');
}
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

// ============ DANE LOGOWANIA TESTOWE ============
const USERS = [
    { login: 'cwel', password: 'cwel', role: 'user' },
    { login: 'gibi', password: 'gibi', role: 'admin' }
];

// ============ KODY RABATOWE ============
const DISCOUNT_CODES = {
    'NEXUS10': 10,
    'NEXUS20': 20
};

// ============ ZMIENNE GLOBALNE ============
let cart = [];
let products = [];
let currentOrderData = null;
let currentLicenseKey = '';
let currentUser = null;
let selectedRating = 0;
let appliedDiscount = 0;
let currentDetailProductId = null;
let editingProductId = null;
let confirmCallback = null;
let currentViewingTicketId = null;
let currentTicketFilter = 'all';
let ticketListeners = {};
let ticketsCache = {};
let showArchivedTickets = false;
let archivedTicketsList = [];

// ============ FUNKCJE POMOCNICZE ============
function getBrowserName(userAgent) {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Inna';
}

function getDeviceType(userAgent) {
    if (userAgent.includes('iPhone') || userAgent.includes('Android')) return 'Mobile';
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'Tablet';
    return 'PC';
}

function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) key += '-';
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = 'notification';
    if (type === 'error') notif.classList.add('error');
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function showConfirmModal(title, message, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirm-modal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('active');
    confirmCallback = null;
}

function confirmYes() {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
}

// ============ FUNKCJE FIREBASE ============
async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        return products;
    } catch (error) {
        console.error('Błąd ładowania produktów:', error);
        return [];
    }
}

async function saveProduct(product) {
    try {
        if (product.id) {
            await db.collection('products').doc(product.id).set(product);
        } else {
            const docRef = await db.collection('products').add(product);
            product.id = docRef.id;
        }
    } catch (error) {
        console.error('Błąd zapisu produktu:', error);
        throw error;
    }
}

async function deleteProductFromDb(id) {
    try {
        await db.collection('products').doc(id).delete();
    } catch (error) {
        console.error('Błąd usuwania produktu:', error);
        throw error;
    }
}

async function loadOrders() {
    try {
        const snapshot = await db.collection('orders').get();
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return orders;
    } catch (error) {
        console.error('Błąd ładowania zamówień:', error);
        return [];
    }
}

async function saveOrder(order) {
    try {
        await db.collection('orders').add(order);
    } catch (error) {
        console.error('Błąd zapisu zamówienia:', error);
        throw error;
    }
}

async function updateOrderStatusInDb(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({ status: newStatus });
    } catch (error) {
        console.error('Błąd aktualizacji statusu:', error);
        throw error;
    }
}

async function clearOrdersFromDb() {
    try {
        const snapshot = await db.collection('orders').get();
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error('Błąd czyszczenia zamówień:', error);
        throw error;
    }
}

async function loadUsers() {
    try {
        const snapshot = await db.collection('users').get();
        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    } catch (error) {
        console.error('Błąd ładowania użytkowników:', error);
        return [];
    }
}

async function updateUserRole(userId, newRole) {
    try {
        await db.collection('users').doc(userId).update({ role: newRole });
    } catch (error) {
        console.error('Błąd aktualizacji roli:', error);
        throw error;
    }
}

async function logActivity(page, action, status = '200') {
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
                if (cityData && cityData.city) {
                    city = cityData.city + ', ' + (cityData.country || '');
                }
            } catch(e) {}
        } catch(e) {}
        
        await db.collection('logs').add({
            date: firebase.firestore.FieldValue.serverTimestamp(),
            dateString: new Date().toLocaleString('pl-PL'),
            ip: ip,
            device: getDeviceType(navigator.userAgent),
            browser: getBrowserName(navigator.userAgent),
            page: page,
            action: action,
            status: status,
            city: city
        });
    } catch(e) {
        console.error('Błąd logowania:', e);
    }
}

async function loadLogs() {
    try {
        const snapshot = await db.collection('logs').orderBy('date', 'desc').limit(200).get();
        const logs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            logs.push({ 
                id: doc.id, 
                ...data,
                date: data.dateString || '—'
            });
        });
        return logs;
    } catch (error) {
        console.error('Błąd ładowania logów:', error);
        return [];
    }
}

async function clearLogsFromDb() {
    try {
        const snapshot = await db.collection('logs').get();
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error('Błąd czyszczenia logów:', error);
        throw error;
    }
}

async function exportLogs() {
    const logs = await loadLogs();
    if (logs.length === 0) {
        showNotification('Brak logów do zapisania', 'error');
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
    
    showNotification('Zapisano logi do pliku CSV', 'success');
}

// ============ TICKETY Z REAL-TIME ============

// Zapisz ticket
async function saveTicket(ticket) {
    try {
        const docRef = await db.collection('tickets').add(ticket);
        return docRef.id;
    } catch (error) {
        console.error('Błąd zapisu ticketa:', error);
        throw error;
    }
}

// Pobierz ticket
async function getTicket(ticketId) {
    try {
        const doc = await db.collection('tickets').doc(ticketId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('Błąd pobierania ticketa:', error);
        return null;
    }
}

// Nasłuchiwanie na żywo dla pojedynczego ticketa
function listenToTicket(ticketId, callback) {
    if (ticketListeners[ticketId]) {
        ticketListeners[ticketId]();
        delete ticketListeners[ticketId];
    }
    
    const unsubscribe = db.collection('tickets').doc(ticketId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            ticketsCache[ticketId] = { id: doc.id, ...data };
            if (callback) callback({ id: doc.id, ...data });
        }
    }, (error) => {
        console.error('Błąd nasłuchiwania ticketa:', error);
    });
    
    ticketListeners[ticketId] = unsubscribe;
    return unsubscribe;
}

// Nasłuchiwanie na żywo dla wszystkich ticketów użytkownika
function listenToUserTickets(userLogin, userEmail, callback) {
    Object.keys(ticketListeners).forEach(key => {
        if (key.startsWith('user_')) {
            ticketListeners[key]();
            delete ticketListeners[key];
        }
    });
    
    const unsubscribe = db.collection('tickets').onSnapshot((snapshot) => {
        const userTickets = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.email === userEmail || 
                data.name === userLogin || 
                data.userLogin === userLogin) {
                userTickets.push({ id: doc.id, ...data });
            }
        });
        
        userTickets.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        
        if (callback) callback(userTickets);
    }, (error) => {
        console.error('Błąd nasłuchiwania ticketów użytkownika:', error);
    });
    
    const listenerKey = 'user_' + (userLogin || 'guest');
    ticketListeners[listenerKey] = unsubscribe;
    return unsubscribe;
}

// Nasłuchiwanie na żywo dla wszystkich ticketów (admin)
function listenToAllTickets(callback) {
    if (ticketListeners['all_tickets']) {
        ticketListeners['all_tickets']();
        delete ticketListeners['all_tickets'];
    }
    
    const unsubscribe = db.collection('tickets').onSnapshot((snapshot) => {
        const tickets = [];
        snapshot.forEach(doc => {
            tickets.push({ id: doc.id, ...doc.data() });
        });
        
        tickets.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        
        if (callback) callback(tickets);
    }, (error) => {
        console.error('Błąd nasłuchiwania wszystkich ticketów:', error);
    });
    
    ticketListeners['all_tickets'] = unsubscribe;
    return unsubscribe;
}

// Aktualizuj status ticketa
async function updateTicketStatus(ticketId, newStatus) {
    try {
        await db.collection('tickets').doc(ticketId).update({ 
            status: newStatus,
            updatedAt: new Date().toLocaleString('pl-PL')
        });
        return true;
    } catch (error) {
        console.error('Błąd aktualizacji statusu ticketa:', error);
        return false;
    }
}

// Dodaj odpowiedź do ticketa
async function addTicketReply(ticketId, message, by) {
    try {
        const ticketRef = db.collection('tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();
        const ticket = ticketDoc.data();
        
        const replies = ticket.replies || [];
        replies.push({
            message: message,
            date: new Date().toLocaleString('pl-PL'),
            by: by
        });
        
        const newStatus = by === 'admin' ? 'Odpowiedziano' : ticket.status;
        
        await ticketRef.update({ 
            replies: replies,
            status: newStatus,
            updatedAt: new Date().toLocaleString('pl-PL')
        });
        
        return true;
    } catch (error) {
        console.error('Błąd dodawania odpowiedzi:', error);
        return false;
    }
}

// Przenieś zamknięty ticket do archiwum
async function archiveTicket(ticketId) {
    try {
        const ticketRef = db.collection('tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();
        const ticket = ticketDoc.data();
        
        await db.collection('tickets_archive').add({
            ...ticket,
            archivedAt: new Date().toLocaleString('pl-PL')
        });
        
        await ticketRef.delete();
        
        return true;
    } catch (error) {
        console.error('Błąd archiwizacji ticketa:', error);
        return false;
    }
}

// ============ ZAKŁADKA ARCHIWUM ============

async function loadArchivedTicketsAdmin() {
    showArchivedTickets = true;
    
    document.querySelectorAll('.ticket-filter').forEach(btn => btn.classList.remove('active'));
    
    const ticketsList = document.getElementById('tickets-list');
    if (!ticketsList) return;
    
    ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie archiwum...</p>';
    
    try {
        const snapshot = await db.collection('tickets_archive')
            .orderBy('archivedAt', 'desc')
            .limit(100)
            .get();
        
        const tickets = [];
        snapshot.forEach(doc => {
            tickets.push({ id: doc.id, ...doc.data() });
        });
        
        archivedTicketsList = tickets;
        renderArchivedTickets(tickets);
        
    } catch (error) {
        console.error('Błąd ładowania archiwum:', error);
        ticketsList.innerHTML = '<p style="color:#ff6b6b;text-align:center;padding:20px;">Błąd ładowania archiwum</p>';
    }
}

function renderArchivedTickets(tickets) {
    const ticketsList = document.getElementById('tickets-list');
    if (!ticketsList) return;
    
    ticketsList.innerHTML = '';
    
    if (tickets.length === 0) {
        ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:30px;">Brak zarchiwizowanych zgłoszeń</p>';
        return;
    }
    
    tickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = 'ticket-tool-card';
        card.style.borderColor = 'rgba(255,100,100,0.3)';
        card.style.background = 'rgba(255,100,100,0.05)';
        
        const replyCount = (ticket.replies || []).length;
        
        card.innerHTML = `
            <div class="ticket-tool-card-header">
                <span class="ticket-tool-id" style="color:#ff6b6b;">📦 #${ticket.id.substring(0, 6)}</span>
                <span class="ticket-tool-date">${ticket.date}</span>
                ${replyCount > 0 ? `<span style="color:#4ade80;font-size:12px;">💬 ${replyCount}</span>` : ''}
            </div>
            <div class="ticket-tool-preview">${ticket.message}</div>
            <div class="ticket-tool-meta">
                <span class="ticket-tool-user">${ticket.name} · ${ticket.category}</span>
                <span class="ticket-status-badge status-zamkniety">Zamknięty</span>
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:5px;">
                Zarchiwizowano: ${ticket.archivedAt || ticket.date}
            </div>
            <div class="ticket-tool-actions">
                <button class="ticket-btn open" onclick="event.stopPropagation(); openAdminTicketViewRealTime('${ticket.id}')">Otwórz czat</button>
                <button class="ticket-btn delete" onclick="event.stopPropagation(); deleteArchivedTicket('${ticket.id}')">Usuń z archiwum</button>
                <button class="ticket-btn accept" onclick="event.stopPropagation(); restoreTicket('${ticket.id}')">Przywróć</button>
            </div>
        `;
        ticketsList.appendChild(card);
    });
}

async function restoreTicket(ticketId) {
    try {
        const doc = await db.collection('tickets_archive').doc(ticketId).get();
        if (!doc.exists) {
            showNotification('Nie znaleziono ticketa w archiwum', 'error');
            return;
        }
        
        const ticketData = doc.data();
        delete ticketData.archivedAt;
        
        await db.collection('tickets').doc(ticketId).set(ticketData);
        await db.collection('tickets_archive').doc(ticketId).delete();
        
        showNotification('Ticket przywrócony!', 'success');
        loadArchivedTicketsAdmin();
        renderTicketsRealTime();
        
    } catch (error) {
        console.error('Błąd przywracania ticketa:', error);
        showNotification('Błąd: ' + error.message, 'error');
    }
}

async function deleteArchivedTicket(ticketId) {
    showConfirmModal('Usunąć ticket z archiwum?', 'Czy na pewno chcesz trwale usunąć to zgłoszenie z archiwum?', async function() {
        try {
            await db.collection('tickets_archive').doc(ticketId).delete();
            showNotification('Usunięto z archiwum', 'error');
            loadArchivedTicketsAdmin();
        } catch (error) {
            console.error('Błąd usuwania:', error);
            showNotification('Błąd: ' + error.message, 'error');
        }
    });
}

function filterTickets(filter, button) {
    showArchivedTickets = false;
    currentTicketFilter = filter;
    
    document.querySelectorAll('.ticket-filter').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    
    renderTicketsRealTime();
}

// ============ RENDEROWANIE TICKETÓW ============

function renderMyTicketsRealTime() {
    if (!currentUser) {
        const ticketsSection = document.getElementById('my-tickets-section');
        if (ticketsSection) ticketsSection.style.display = 'none';
        return;
    }
    
    const ticketsSection = document.getElementById('my-tickets-section');
    const ticketsList = document.getElementById('my-tickets-list');
    
    if (!ticketsSection || !ticketsList) return;
    
    ticketsSection.style.display = 'block';
    ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie zgłoszeń...</p>';
    
    listenToUserTickets(
        currentUser.login || '',
        currentUser.email || '',
        (tickets) => {
            if (tickets.length === 0) {
                ticketsSection.style.display = 'none';
                return;
            }
            
            ticketsSection.style.display = 'block';
            ticketsList.innerHTML = '';
            
            tickets.forEach(ticket => {
                const card = document.createElement('div');
                card.className = 'my-ticket-card';
                card.style.cursor = 'pointer';
                
                const statusColors = {
                    'Otwarty': '#ffc800',
                    'W trakcie': '#a29bfe',
                    'Odpowiedziano': '#4ade80',
                    'Zamknięty': '#ff6b6b'
                };
                const statusColor = statusColors[ticket.status] || '#a29bfe';
                
                const hasNewAdminReply = ticket.replies && ticket.replies.length > 0 && 
                    ticket.replies[ticket.replies.length - 1].by === 'admin';
                
                card.innerHTML = `
                    <div class="ticket-header">
                        <span class="ticket-category">${ticket.category || 'Inne'}</span>
                        <span class="ticket-date">${ticket.date || '—'}</span>
                    </div>
                    <div class="ticket-message">${ticket.message || 'Brak treści'}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:8px;">
                        <span style="color:${statusColor};font-weight:bold;font-size:13px;">
                            ● ${ticket.status || 'Otwarty'}
                        </span>
                        <span style="font-size:13px;color:${hasNewAdminReply ? '#4ade80' : 'rgba(255,255,255,0.3)'};">
                            ${ticket.replies && ticket.replies.length > 0 ? 
                                `💬 Odpowiedzi: ${ticket.replies.length} ${hasNewAdminReply ? '🆕' : ''}` : 
                                '⏳ Oczekuje na odpowiedź'}
                        </span>
                    </div>
                    <button class="ticket-btn open" onclick="event.stopPropagation(); openUserTicketViewRealTime('${ticket.id}')" style="margin-top:10px;width:100%;padding:10px;background:rgba(108,92,231,0.3);color:#a29bfe;border:none;border-radius:6px;cursor:pointer;font-weight:600;">
                        💬 Otwórz czat
                    </button>
                `;
                ticketsList.appendChild(card);
            });
        }
    );
}

function renderAccountTicketsRealTime() {
    if (!currentUser) {
        const ticketsList = document.getElementById('account-tickets-list');
        if (ticketsList) {
            ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);">Zaloguj się, aby zobaczyć zgłoszenia</p>';
        }
        return;
    }
    
    const ticketsList = document.getElementById('account-tickets-list');
    if (!ticketsList) return;
    
    ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie zgłoszeń...</p>';
    
    listenToUserTickets(
        currentUser.login || '',
        currentUser.email || '',
        (tickets) => {
            ticketsList.innerHTML = '';
            
            if (tickets.length === 0) {
                ticketsList.innerHTML = `
                    <div style="text-align:center;padding:30px;color:rgba(255,255,255,0.4);">
                        <p>Brak zgłoszeń</p>
                        <p style="font-size:13px;margin-top:10px;">Utwórz ticket w zakładce SUPPORT</p>
                    </div>
                `;
                return;
            }
            
            tickets.forEach(ticket => {
                const card = document.createElement('div');
                card.className = 'my-ticket-card';
                card.style.cursor = 'pointer';
                
                const statusColors = {
                    'Otwarty': '#ffc800',
                    'W trakcie': '#a29bfe',
                    'Odpowiedziano': '#4ade80',
                    'Zamknięty': '#ff6b6b'
                };
                const statusColor = statusColors[ticket.status] || '#a29bfe';
                
                const hasNewAdminReply = ticket.replies && ticket.replies.length > 0 && 
                    ticket.replies[ticket.replies.length - 1].by === 'admin';
                
                card.innerHTML = `
                    <div class="ticket-header">
                        <span class="ticket-category">${ticket.category || 'Inne'}</span>
                        <span class="ticket-date">${ticket.date || '—'}</span>
                    </div>
                    <div class="ticket-message" style="margin-top:8px;">${ticket.message || 'Brak treści'}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap;gap:8px;">
                        <span style="color:${statusColor};font-weight:bold;font-size:13px;">
                            ● Status: ${ticket.status || 'Otwarty'}
                        </span>
                        <span style="font-size:13px;color:${hasNewAdminReply ? '#4ade80' : 'rgba(255,255,255,0.3)'};">
                            ${ticket.replies && ticket.replies.length > 0 ? 
                                `💬 Odpowiedzi: ${ticket.replies.length} ${hasNewAdminReply ? '🆕' : ''}` : 
                                'Brak odpowiedzi'}
                        </span>
                    </div>
                    ${ticket.replies && ticket.replies.length > 0 ? `
                        <div style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:2px solid ${hasNewAdminReply ? '#4ade80' : 'rgba(255,255,255,0.1)'};">
                            <div style="color:rgba(255,255,255,0.5);font-size:12px;">Ostatnia odpowiedź:</div>
                            <div style="color:rgba(255,255,255,0.7);font-size:13px;">${ticket.replies[ticket.replies.length - 1].message}</div>
                            <div style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:4px;">${ticket.replies[ticket.replies.length - 1].date || ''}</div>
                            <div style="color:rgba(255,255,255,0.3);font-size:11px;">Od: ${ticket.replies[ticket.replies.length - 1].by === 'admin' ? '🛡️ Support' : '👤 Ty'}</div>
                        </div>
                    ` : ''}
                    <button class="ticket-btn open" onclick="event.stopPropagation(); openUserTicketViewRealTime('${ticket.id}')" style="margin-top:12px;width:100%;padding:10px;background:rgba(108,92,231,0.3);color:#a29bfe;border:none;border-radius:6px;cursor:pointer;font-weight:600;">
                        💬 Otwórz czat
                    </button>
                `;
                
                ticketsList.appendChild(card);
            });
        }
    );
}

function renderTicketsRealTime() {
    const ticketsList = document.getElementById('tickets-list');
    if (!ticketsList) return;
    
    if (showArchivedTickets) {
        return;
    }
    
    ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie zgłoszeń...</p>';
    
    listenToAllTickets((tickets) => {
        updateTicketStatsRealTime(tickets);
        
        let filtered = tickets;
        if (currentTicketFilter !== 'all') {
            filtered = tickets.filter(t => t.status === currentTicketFilter);
        }
        
        filtered.sort((a, b) => {
            if (a.status === 'Zamknięty' && b.status !== 'Zamknięty') return 1;
            if (b.status === 'Zamknięty' && a.status !== 'Zamknięty') return -1;
            
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        
        ticketsList.innerHTML = '';
        
        if (filtered.length === 0) {
            ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:30px;">Brak zgłoszeń w tej kategorii</p>';
            return;
        }
        
        filtered.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'ticket-tool-card';
            
            if (ticket.status === 'Zamknięty') {
                card.style.borderColor = 'rgba(255,100,100,0.2)';
                card.style.opacity = '0.7';
            }
            
            const replyCount = (ticket.replies || []).length;
            
            card.innerHTML = `
                <div class="ticket-tool-card-header">
                    <span class="ticket-tool-id">#${ticket.id.substring(0, 6)}</span>
                    <span class="ticket-tool-date">${ticket.date}</span>
                    ${replyCount > 0 ? `<span style="color:#4ade80;font-size:12px;">💬 ${replyCount}</span>` : ''}
                </div>
                <div class="ticket-tool-preview">${ticket.message}</div>
                <div class="ticket-tool-meta">
                    <span class="ticket-tool-user">${ticket.name} · ${ticket.category}</span>
                    <span class="ticket-status-badge status-${(ticket.status || 'Otwarty').toLowerCase().replace(/\s+/g, '-')}">${ticket.status || 'Otwarty'}</span>
                </div>
                <div class="ticket-tool-actions">
                    <button class="ticket-btn open" onclick="event.stopPropagation(); openAdminTicketViewRealTime('${ticket.id}')">Otwórz czat</button>
                    ${ticket.status !== 'Zamknięty' ? `
                        <button class="ticket-btn accept" onclick="event.stopPropagation(); acceptTicketRealTime('${ticket.id}')">Przyjmij</button>
                        <button class="ticket-btn reject" onclick="event.stopPropagation(); closeTicketRealTime('${ticket.id}')">Zamknij</button>
                    ` : `
                        <button class="ticket-btn accept" onclick="event.stopPropagation(); restoreTicket('${ticket.id}')">Przywróć</button>
                    `}
                    <button class="ticket-btn delete" onclick="event.stopPropagation(); deleteTicketRealTime('${ticket.id}')">Usuń</button>
                </div>
            `;
            ticketsList.appendChild(card);
        });
    });
}

function updateTicketStatsRealTime(tickets) {
    const openCount = tickets.filter(t => t.status === 'Otwarty').length;
    const progressCount = tickets.filter(t => t.status === 'W trakcie').length;
    const closedCount = tickets.filter(t => t.status === 'Zamknięty').length;
    const answeredCount = tickets.filter(t => t.status === 'Odpowiedziano').length;
    
    const openEl = document.getElementById('tickets-open-count');
    const progressEl = document.getElementById('tickets-progress-count');
    const closedEl = document.getElementById('tickets-closed-count');
    const badge = document.getElementById('tickets-count');
    
    if (openEl) openEl.textContent = openCount + answeredCount;
    if (progressEl) progressEl.textContent = progressCount;
    if (closedEl) closedEl.textContent = closedCount;
    
    const totalActive = openCount + progressCount + answeredCount;
    if (badge) {
        badge.textContent = totalActive;
        badge.style.display = totalActive > 0 ? 'inline-block' : 'none';
    }
}

async function updateTicketsCount() {
    const tickets = await loadTickets();
    const badge = document.getElementById('tickets-count');
    if (badge) {
        badge.textContent = tickets.length;
        badge.style.display = tickets.length > 0 ? 'inline-block' : 'none';
    }
}

// ============ CZAT Z REAL-TIME ============

function openUserTicketViewRealTime(ticketId) {
    currentViewingTicketId = ticketId;
    
    const modal = document.getElementById('ticket-view-modal');
    const content = document.getElementById('ticket-view-content');
    const title = document.getElementById('ticket-view-title');
    const replySection = document.querySelector('.ticket-reply-section');
    
    if (!modal || !content) return;
    
    title.textContent = '💬 Czat - Ładowanie...';
    content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Ładowanie wiadomości...</div>';
    
    if (ticketListeners['view_' + ticketId]) {
        ticketListeners['view_' + ticketId]();
        delete ticketListeners['view_' + ticketId];
    }
    
    listenToTicket(ticketId, (ticket) => {
        title.textContent = `💬 Czat: ${ticket.category || 'Ticket'}`;
        
        content.innerHTML = '';
        
        const userMsg = document.createElement('div');
        userMsg.className = 'ticket-message-bubble user';
        userMsg.innerHTML = `
            <div class="bubble-header">👤 ${ticket.name}</div>
            <div class="bubble-message">${ticket.message}</div>
            <div class="bubble-date">${ticket.date}</div>
        `;
        content.appendChild(userMsg);
        
        (ticket.replies || []).forEach(reply => {
            const replyDiv = document.createElement('div');
            if (reply.by === 'admin') {
                replyDiv.className = 'ticket-message-bubble admin';
                replyDiv.innerHTML = `
                    <div class="bubble-header">🛡️ Support</div>
                    <div class="bubble-message">${reply.message}</div>
                    <div class="bubble-date">${reply.date}</div>
                `;
            } else {
                replyDiv.className = 'ticket-message-bubble user';
                replyDiv.innerHTML = `
                    <div class="bubble-header">👤 ${ticket.name}</div>
                    <div class="bubble-message">${reply.message}</div>
                    <div class="bubble-date">${reply.date}</div>
                `;
            }
            content.appendChild(replyDiv);
        });
        
        content.scrollTop = content.scrollHeight;
        
        if (ticket.status === 'Zamknięty') {
            if (replySection) {
                replySection.innerHTML = `
                    <div style="text-align:center;padding:15px;color:#ff6b6b;font-weight:bold;border:1px solid rgba(255,100,100,0.3);border-radius:8px;background:rgba(255,100,100,0.1);">
                        ⛔ To zgłoszenie zostało zamknięte. Nie możesz już odpowiadać.
                    </div>
                `;
            }
        } else {
            if (replySection) {
                replySection.innerHTML = `
                    <textarea id="ticket-reply-text" placeholder="Napisz wiadomość..." rows="3" style="padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:14px;resize:vertical;min-height:60px;"></textarea>
                    <button class="submit-btn" onclick="sendUserReplyRealTime('${ticket.id}')">💬 Wyślij wiadomość</button>
                `;
            }
        }
    });
    
    modal.classList.add('active');
}

function openAdminTicketViewRealTime(ticketId) {
    currentViewingTicketId = ticketId;
    
    const modal = document.getElementById('ticket-view-modal');
    const content = document.getElementById('ticket-view-content');
    const title = document.getElementById('ticket-view-title');
    const replySection = document.querySelector('.ticket-reply-section');
    
    if (!modal || !content) return;
    
    title.textContent = `🛡️ Zgłoszenie #${ticketId.substring(0, 8)} - Ładowanie...`;
    content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Ładowanie wiadomości...</div>';
    
    if (ticketListeners['view_' + ticketId]) {
        ticketListeners['view_' + ticketId]();
        delete ticketListeners['view_' + ticketId];
    }
    
    listenToTicket(ticketId, (ticket) => {
        title.textContent = `🛡️ Zgłoszenie #${ticketId.substring(0, 8)} - ${ticket.category || 'Ticket'}`;
        
        content.innerHTML = '';
        
        const userMsg = document.createElement('div');
        userMsg.className = 'ticket-message-bubble user';
        userMsg.innerHTML = `
            <div class="bubble-header">👤 ${ticket.name} · ${ticket.category}</div>
            <div class="bubble-message">${ticket.message}</div>
            <div class="bubble-date">${ticket.date}</div>
        `;
        content.appendChild(userMsg);
        
        (ticket.replies || []).forEach(reply => {
            const replyDiv = document.createElement('div');
            if (reply.by === 'admin') {
                replyDiv.className = 'ticket-message-bubble admin';
                replyDiv.innerHTML = `
                    <div class="bubble-header">🛡️ Support</div>
                    <div class="bubble-message">${reply.message}</div>
                    <div class="bubble-date">${reply.date}</div>
                `;
            } else {
                replyDiv.className = 'ticket-message-bubble user';
                replyDiv.innerHTML = `
                    <div class="bubble-header">👤 ${ticket.name}</div>
                    <div class="bubble-message">${reply.message}</div>
                    <div class="bubble-date">${reply.date}</div>
                `;
            }
            content.appendChild(replyDiv);
        });
        
        content.scrollTop = content.scrollHeight;
        
        if (ticket.status === 'Zamknięty') {
            if (replySection) {
                replySection.innerHTML = `
                    <div style="text-align:center;padding:15px;color:#ff6b6b;font-weight:bold;border:1px solid rgba(255,100,100,0.3);border-radius:8px;background:rgba(255,100,100,0.1);">
                        ⛔ To zgłoszenie zostało zamknięte.
                    </div>
                `;
            }
        } else {
            if (replySection) {
                replySection.innerHTML = `
                    <textarea id="ticket-reply-text" placeholder="Napisz odpowiedź dla użytkownika..." rows="3" style="padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:14px;resize:vertical;min-height:60px;"></textarea>
                    <button class="submit-btn" onclick="sendAdminReplyRealTime('${ticket.id}')">🛡️ Wyślij odpowiedź</button>
                `;
            }
        }
    });
    
    modal.classList.add('active');
}

async function sendUserReplyRealTime(ticketId) {
    const replyText = document.getElementById('ticket-reply-text');
    if (!replyText) return;
    
    const message = replyText.value.trim();
    if (!message) {
        showNotification('Napisz wiadomość!', 'error');
        return;
    }
    
    const success = await addTicketReply(ticketId, message, 'user');
    if (success) {
        replyText.value = '';
        showNotification('Wiadomość wysłana!', 'success');
        renderMyTicketsRealTime();
        renderAccountTicketsRealTime();
    } else {
        showNotification('Błąd wysyłania wiadomości', 'error');
    }
}

async function sendAdminReplyRealTime(ticketId) {
    const replyText = document.getElementById('ticket-reply-text');
    if (!replyText) return;
    
    const message = replyText.value.trim();
    if (!message) {
        showNotification('Napisz odpowiedź!', 'error');
        return;
    }
    
    const success = await addTicketReply(ticketId, message, 'admin');
    if (success) {
        replyText.value = '';
        showNotification('Odpowiedź wysłana!', 'success');
        renderTicketsRealTime();
        renderMyTicketsRealTime();
        renderAccountTicketsRealTime();
    } else {
        showNotification('Błąd wysyłania odpowiedzi', 'error');
    }
}

async function acceptTicketRealTime(ticketId) {
    const success = await updateTicketStatus(ticketId, 'W trakcie');
    if (success) {
        showNotification('Przyjęto zgłoszenie', 'success');
        renderTicketsRealTime();
    }
}

async function closeTicketRealTime(ticketId) {
    showConfirmModal('Zamknąć zgłoszenie?', 'Czy na pewno chcesz zamknąć to zgłoszenie? Zostanie przeniesione do archiwum.', async function() {
        const success = await updateTicketStatus(ticketId, 'Zamknięty');
        if (success) {
            setTimeout(async () => {
                await archiveTicket(ticketId);
                showNotification('Zgłoszenie zamknięte i zarchiwizowane', 'success');
                renderTicketsRealTime();
                renderMyTicketsRealTime();
                renderAccountTicketsRealTime();
            }, 1000);
        }
    });
}

async function deleteTicketRealTime(ticketId) {
    showConfirmModal('Usunąć ticket?', 'Czy na pewno chcesz usunąć to zgłoszenie?', async function() {
        try {
            await db.collection('tickets').doc(ticketId).delete();
            showNotification('Usunięto ticket', 'error');
            renderTicketsRealTime();
            renderMyTicketsRealTime();
            renderAccountTicketsRealTime();
        } catch(error) {
            console.error('Błąd usuwania:', error);
            showNotification('Błąd: ' + error.message, 'error');
        }
    });
}

function closeTicketViewModal() {
    document.getElementById('ticket-view-modal').classList.remove('active');
    if (currentViewingTicketId && ticketListeners['view_' + currentViewingTicketId]) {
        ticketListeners['view_' + currentViewingTicketId]();
        delete ticketListeners['view_' + currentViewingTicketId];
    }
    currentViewingTicketId = null;
}

function toggleTicketForm() {
    const form = document.getElementById('ticket-section');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
}

// ============ PRELOADER ============
window.addEventListener('load', async function() {
    const preloader = document.getElementById('preloader');
    const progress = document.getElementById('preloader-progress');
    
    if (!preloader) return;
    
    let width = 0;
    const interval = setInterval(function() {
        width += Math.random() * 15 + 5;
        if (width >= 100) {
            width = 100;
            clearInterval(interval);
            setTimeout(function() { 
                preloader.classList.add('hidden'); 
            }, 400);
        }
        if (progress) progress.style.width = width + '%';
    }, 150);
    
    setTimeout(function() { 
        preloader.classList.add('hidden'); 
    }, 4000);
    
    await loadProducts();
    renderProducts();
    initStars();
    loadCartFromStorage();
    updateLoginButton();
    
    const savedUser = sessionStorage.getItem('nexus_user');
    if (savedUser) {
        try { 
            currentUser = JSON.parse(savedUser); 
            updateLoginButton();
            if (currentUser) {
                renderMyTicketsRealTime();
                renderAccountTicketsRealTime();
            }
        } catch(e) {}
    }
});

setTimeout(function() {
    const preloader = document.getElementById('preloader');
    if (preloader && !preloader.classList.contains('hidden')) {
        preloader.classList.add('hidden');
    }
}, 5000);

// ============ GWIAZDY W TLE ============
function initStars() {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const stars = [];
    for (let i = 0; i < 300; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random(),
            speed: Math.random() * 0.02 + 0.005
        });
    }
    
    function animateStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(star => {
            star.alpha += star.speed;
            if (star.alpha > 1 || star.alpha < 0.2) star.speed = -star.speed;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.fill();
        });
        requestAnimationFrame(animateStars);
    }
    animateStars();
}

// ============ NAWIGACJA ============
async function showPage(pageName) {
    const pages = ['home', 'products', 'product', 'reviews', 'support', 'account', 'admin'];
    
    pages.forEach(page => {
        const el = document.getElementById(`${page}-page`);
        if (el) el.style.display = 'none';
    });
    
    const target = document.getElementById(`${pageName}-page`);
    if (target) target.style.display = 'block';
    
    document.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const btnMap = { home: 0, products: 1, reviews: 2, support: 3 };
    if (btnMap[pageName] !== undefined) {
        const buttons = document.querySelectorAll('.sub-nav-btn');
        if (buttons[btnMap[pageName]]) buttons[btnMap[pageName]].classList.add('active');
    }
    
    updateLoginButton();
    
    if (pageName !== 'admin') logActivity('/' + pageName, 'Wejście', '200');
    
    if (pageName === 'products') await renderProducts();
    if (pageName === 'reviews') await renderReviews();
    if (pageName === 'account') {
        await renderAccount();
        renderAccountTicketsRealTime();
    }
    if (pageName === 'support') {
        if (currentUser) {
            renderMyTicketsRealTime();
        } else {
            const ticketsSection = document.getElementById('my-tickets-section');
            if (ticketsSection) ticketsSection.style.display = 'none';
        }
    }
    if (pageName === 'admin') {
        if (currentUser && currentUser.role === 'admin') {
            switchAdminTab('orders');
            updateTicketsCount();
            renderTicketsRealTime();
        } else {
            showPage('home');
            showNotification('Brak uprawnień', 'error');
        }
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ PODZAKŁADKI ADMINA ============
function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.style.display = 'none');
    
    const tabMap = { orders: 0, logs: 1, products: 2, stats: 3, users: 4, keys: 5, tickets: 6 };
    const tabs = document.querySelectorAll('.admin-tab');
    if (tabs[tabMap[tabName]]) tabs[tabMap[tabName]].classList.add('active');
    
    const content = document.getElementById(`admin-tab-${tabName}`);
    if (content) content.style.display = 'block';
    
    if (tabName === 'orders') renderOrders();
    if (tabName === 'logs') renderLogs();
    if (tabName === 'products') renderAdminProducts();
    if (tabName === 'stats') renderStats();
    if (tabName === 'users') renderUsers();
    if (tabName === 'keys') renderKeys();
    if (tabName === 'tickets') {
        renderTicketsRealTime();
    }
}

// ============ STATYSTYKI ============
async function renderStats() {
    const orders = await loadOrders();
    const users = await loadUsers();
    
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    
    const today = new Date().toLocaleDateString('pl-PL');
    const todayOrders = orders.filter(o => o.date && o.date.includes(today)).length;
    
    document.getElementById('stats-total-revenue').textContent = totalRevenue.toFixed(2) + ' zł';
    document.getElementById('stats-total-orders').textContent = totalOrders;
    document.getElementById('stats-today-orders').textContent = todayOrders;
    document.getElementById('stats-total-users').textContent = users.length;
    
    renderChart(orders);
}

function renderChart(orders) {
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
    
    if (window.salesChart) {
        window.salesChart.destroy();
    }
    
    window.salesChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.date),
            datasets: [{
                label: 'Przychód (zł)',
                data: last7Days.map(d => d.revenue),
                borderColor: '#6c5ce7',
                backgroundColor: 'rgba(108, 92, 231, 0.2)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#6c5ce7',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255,255,255,0.6)' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: 'rgba(255,255,255,0.6)' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

// ============ UŻYTKOWNICY ============
async function renderUsers() {
    const users = await loadUsers();
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:30px;">Brak użytkowników</p>';
        return;
    }
    
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        
        const initial = (user.login || '?').charAt(0).toUpperCase();
        
        card.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${initial}</div>
                <div>
                    <div class="user-name">${user.login || '—'}</div>
                    <div class="user-email">${user.email || '—'}</div>
                </div>
            </div>
            <div class="user-role ${user.role || 'user'}">${user.role || 'user'}</div>
            <div class="user-actions">
                <button class="edit-btn" onclick="changeUserRole('${user.id}', '${user.role === 'admin' ? 'user' : 'admin'}')">
                    ${user.role === 'admin' ? 'Zdegraduj' : 'Zrób adminem'}
                </button>
            </div>
        `;
        
        usersList.appendChild(card);
    });
}

async function changeUserRole(userId, newRole) {
    try {
        await updateUserRole(userId, newRole);
        showNotification('Zmieniono rolę użytkownika', 'success');
        renderUsers();
    } catch (error) {
        showNotification('Błąd: ' + error.message, 'error');
    }
}

// ============ KLUCZE ============
async function loadKeys() {
    try {
        const snapshot = await db.collection('orders').get();
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
    } catch (error) {
        console.error('Błąd ładowania kluczy:', error);
        return [];
    }
}

async function renderKeys() {
    const keysList = document.getElementById('keys-list');
    if (!keysList) return;
    
    const keys = await loadKeys();
    keysList.innerHTML = '';
    
    if (keys.length === 0) {
        keysList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:30px;">Brak wydanych kluczy.</p>';
        return;
    }
    
    keys.forEach(keyData => {
        const card = document.createElement('div');
        card.className = 'key-card';
        
        card.innerHTML = `
            <div class="key-info">
                <div class="key-value">${keyData.key}</div>
                <div class="key-customer">
                    <strong>Kupujący:</strong> ${keyData.customerName} (${keyData.customerEmail})
                </div>
                <div class="key-customer">
                    <strong>Data zakupu:</strong> ${keyData.orderDate}
                </div>
                <div class="key-customer">
                    <strong>Status:</strong> ${keyData.status}
                </div>
            </div>
            <div class="key-actions">
                <button class="copy-btn" onclick="copyKey('${keyData.key}')">Kopiuj</button>
                <button class="delete-key-btn" onclick="deleteKey('${keyData.orderId}')">Usuń</button>
            </div>
        `;
        
        keysList.appendChild(card);
    });
}

function copyKey(key) {
    navigator.clipboard.writeText(key).then(() => {
        showNotification('Skopiowano klucz!', 'success');
    }).catch(() => {
        showNotification('Nie udało się skopiować', 'error');
    });
}

async function deleteKey(orderId) {
    showConfirmModal('Usunąć klucz?', 'Czy na pewno chcesz usunąć ten klucz?', async function() {
        try {
            await db.collection('orders').doc(orderId).delete();
            showNotification('Usunięto klucz', 'error');
            renderKeys();
        } catch (error) {
            showNotification('Błąd: ' + error.message, 'error');
        }
    });
}

// ============ PRZYCISK LOGIN ============
function updateLoginButton() {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    
    if (currentUser) {
        if (currentUser.role === 'admin') btn.textContent = 'ADMIN PANEL';
        else btn.textContent = 'MOJE KONTO';
    } else {
        btn.textContent = 'LOGIN';
    }
}

// ============ LOGOWANIE ============
function handleLoginClick() {
    if (currentUser) {
        if (currentUser.role === 'admin') showPage('admin');
        else showPage('account');
    } else {
        openLogin();
    }
}

function openLogin() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('login-error').style.display = 'none';
}

function closeLogin() {
    document.getElementById('login-modal').classList.remove('active');
}

function switchToRegister() {
    closeLogin();
    openRegister();
}

function switchToLogin() {
    closeRegister();
    openLogin();
}

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const login = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!login || !password) {
        document.getElementById('login-error').textContent = 'Uzupełnij wszystkie pola';
        document.getElementById('login-error').style.display = 'block';
        return;
    }
    
    const testUser = USERS.find(u => u.login === login && u.password === password);
    if (testUser) {
        currentUser = testUser;
        sessionStorage.setItem('nexus_user', JSON.stringify(testUser));
        closeLogin();
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        updateLoginButton();
        logActivity('/login', 'Logowanie', 'Sukces');
        renderMyTicketsRealTime();
        renderAccountTicketsRealTime();
        if (testUser.role === 'admin') {
            showPage('admin');
        } else {
            showPage('account');
        }
        showNotification('Zalogowano pomyślnie!', 'success');
        return;
    }
    
    try {
        const usersSnapshot = await db.collection('users').where('login', '==', login).get();
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            
            await auth.signInWithEmailAndPassword(userData.email, password);
            currentUser = { login: userData.login, email: userData.email, role: userData.role, uid: userData.uid };
            sessionStorage.setItem('nexus_user', JSON.stringify(currentUser));
            
            closeLogin();
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            updateLoginButton();
            logActivity('/login', 'Logowanie', 'Sukces');
            
            renderMyTicketsRealTime();
            renderAccountTicketsRealTime();
            
            if (currentUser.role === 'admin') showPage('admin');
            else showPage('account');
            
            showNotification('Zalogowano pomyślnie!', 'success');
            return;
        }
    } catch(error) {
        console.error('Błąd logowania:', error);
        document.getElementById('login-error').textContent = 'Błąd: ' + error.message;
        document.getElementById('login-error').style.display = 'block';
        logActivity('/login', 'Logowanie', 'Błąd');
        return;
    }
    
    logActivity('/login', 'Logowanie', 'Błąd');
    document.getElementById('login-error').textContent = 'Błędny login lub hasło';
    document.getElementById('login-error').style.display = 'block';
});

async function logout() {
    try {
        await auth.signOut();
    } catch(e) {}
    
    Object.keys(ticketListeners).forEach(key => {
        ticketListeners[key]();
        delete ticketListeners[key];
    });
    
    currentUser = null;
    sessionStorage.removeItem('nexus_user');
    updateLoginButton();
    showPage('home');
    showNotification('Wylogowano', 'success');
}

// ============ REJESTRACJA ============
function openRegister() {
    document.getElementById('register-modal').classList.add('active');
    document.getElementById('register-error').style.display = 'none';
}

function closeRegister() {
    document.getElementById('register-modal').classList.remove('active');
}

document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    
    if (!username || !email || !password) {
        document.getElementById('register-error').textContent = 'Uzupełnij wszystkie pola';
        document.getElementById('register-error').style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        document.getElementById('register-error').textContent = 'Hasło musi mieć minimum 6 znaków';
        document.getElementById('register-error').style.display = 'block';
        return;
    }
    
    try {
        const usersSnapshot = await db.collection('users').where('login', '==', username).get();
        if (!usersSnapshot.empty) {
            document.getElementById('register-error').textContent = 'Ta nazwa użytkownika jest zajęta';
            document.getElementById('register-error').style.display = 'block';
            return;
        }
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await db.collection('users').add({
            login: username,
            email: email,
            role: 'user',
            uid: user.uid,
            createdAt: new Date().toLocaleString('pl-PL')
        });
        
        currentUser = { login: username, email: email, role: 'user', uid: user.uid };
        sessionStorage.setItem('nexus_user', JSON.stringify(currentUser));
        
        closeRegister();
        document.getElementById('register-username').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        
        updateLoginButton();
        logActivity('/register', 'Rejestracja', 'Sukces');
        showNotification('Konto utworzone!', 'success');
        showPage('account');
        
        renderMyTicketsRealTime();
        renderAccountTicketsRealTime();
        
    } catch(error) {
        console.error('Błąd rejestracji:', error);
        document.getElementById('register-error').textContent = 'Błąd: ' + error.message;
        document.getElementById('register-error').style.display = 'block';
    }
});

// ============ KONTO UŻYTKOWNIKA ============
async function renderAccount() {
    if (!currentUser) { 
        showPage('home'); 
        return; 
    }
    
    const loginEl = document.getElementById('account-login');
    const roleEl = document.getElementById('account-role');
    if (loginEl) loginEl.textContent = currentUser.login;
    if (roleEl) roleEl.textContent = currentUser.role === 'admin' ? 'Administrator' : 'Użytkownik';
    
    try {
        const orders = await loadOrders();
        const userOrders = orders.filter(o => {
            const customer = o.customer || {};
            return customer.login === currentUser.login || 
                   customer.email === currentUser.email;
        });
        const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        const ordersCountEl = document.getElementById('account-orders-count');
        const totalSpentEl = document.getElementById('account-total-spent');
        if (ordersCountEl) ordersCountEl.textContent = userOrders.length;
        if (totalSpentEl) totalSpentEl.textContent = totalSpent.toFixed(2) + ' zł';
        
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
        showNotification('Błąd ładowania danych', 'error');
    }
}

// ============ RENDEROWANIE PRODUKTÓW (Z POPRAWIONYMI ZDJĘCIAMI) ============
async function renderProducts() {
    await loadProducts();
    
    const container = document.getElementById('products');
    if (!container) return;
    
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const sortType = sortSelect ? sortSelect.value : 'default';
    
    let filtered = products.filter(p => p.name && p.name.toLowerCase().includes(searchQuery));
    
    switch(sortType) {
        case 'price-asc': filtered.sort((a,b) => (a.price || 0) - (b.price || 0)); break;
        case 'price-desc': filtered.sort((a,b) => (b.price || 0) - (a.price || 0)); break;
        case 'name-asc': filtered.sort((a,b) => (a.name || '').localeCompare(b.name || '')); break;
        case 'name-desc': filtered.sort((a,b) => (b.name || '').localeCompare(a.name || '')); break;
        case 'newest': filtered.sort((a,b) => (b.id || 0) - (a.id || 0)); break;
        default: break;
    }
    
    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);grid-column:1/-1;padding:40px;">Brak produktów</p>';
        return;
    }
    
    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const stock = product.stock || 0;
        const stockText = stock > 0 ? `${stock} szt.` : 'Brak';
        const stockClass = stock > 0 ? '' : 'out-of-stock';
        
        const imageUrl = product.image && product.image.trim() !== '' 
            ? product.image 
            : 'https://via.placeholder.com/300x200/1a1a2e/6c5ce7?text=NEXUS+MARKET';
        
        card.innerHTML = `
            <div class="product-image">
                <span class="stock-badge ${stockClass}">${stockText}</span>
                <img src="${imageUrl}" alt="${product.name}" 
                     onerror="this.src='https://via.placeholder.com/300x200/1a1a2e/6c5ce7?text=Brak+zdjęcia'">
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${(product.price || 0).toFixed(2)} zł</div>
                <button class="add-to-cart" onclick="event.stopPropagation(); addToCart('${product.id}')">Dodaj do koszyka</button>
            </div>
        `;
        
        card.addEventListener('click', () => openProductPage(product.id));
        container.appendChild(card);
    });
}

// ============ STRONA PRODUKTU ============
function openProductPage(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Produkt nie znaleziony', 'error');
        return;
    }
    
    currentDetailProductId = productId;
    
    const img = document.getElementById('product-detail-image');
    const name = document.getElementById('product-detail-name');
    const price = document.getElementById('product-detail-price');
    const short = document.getElementById('product-detail-short');
    
    const imageUrl = product.image && product.image.trim() !== '' 
        ? product.image 
        : 'https://via.placeholder.com/600x400/1a1a2e/6c5ce7?text=NEXUS+MARKET';
    
    if (img) {
        img.src = imageUrl;
        img.onerror = function() {
            this.src = 'https://via.placeholder.com/600x400/1a1a2e/6c5ce7?text=Brak+zdjęcia';
        };
    }
    if (name) name.textContent = product.name;
    if (price) price.textContent = (product.price || 0).toFixed(2) + ' zł';
    if (short) short.textContent = product.description || 'Brak opisu.';
    
    const featuresList = document.getElementById('product-detail-features');
    if (featuresList) {
        featuresList.innerHTML = '<h3>Najważniejsze cechy</h3><ul>';
        if (product.features && Array.isArray(product.features)) {
            product.features.forEach(f => featuresList.innerHTML += `<li>${f}</li>`);
        } else {
            featuresList.innerHTML += '<li>Brak cech</li>';
        }
        featuresList.innerHTML += '</ul>';
    }
    
    const specsTable = document.getElementById('product-detail-specs-table');
    if (specsTable) {
        specsTable.innerHTML = '';
        if (product.specs && typeof product.specs === 'object') {
            Object.entries(product.specs).forEach(([key, value]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${key}</td><td>${value}</td>`;
                specsTable.appendChild(tr);
            });
        } else {
            specsTable.innerHTML = '<tr><td colspan="2">Brak specyfikacji</td></tr>';
        }
    }
    
    showPage('product');
}

function addToCartFromDetail() {
    if (currentDetailProductId) addToCart(currentDetailProductId);
}

function buyNow() {
    if (currentDetailProductId) {
        addToCart(currentDetailProductId);
        checkout();
    }
}

// ============ OPINIE ============
async function renderReviews() {
    try {
        const snapshot = await db.collection('reviews').get();
        const reviews = [];
        snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
        
        const container = document.getElementById('reviews-grid');
        if (!container) return;
        
        const defaultReviews = [
            { stars: 5, text: "Netflix działa idealnie! Dostęp dostałem w 5 minut.", author: "Marek K." },
            { stars: 5, text: "Polecam! Spotify Premium bez problemów.", author: "Ania W." },
            { stars: 4, text: "Dobra cena. Disney+ działa na 4 urządzeniach.", author: "Piotr Z." }
        ];
        
        const allReviews = [...reviews, ...defaultReviews];
        
        container.innerHTML = '';
        
        allReviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            
            let starsHtml = '';
            for (let i = 0; i < 5; i++) starsHtml += i < (review.stars || 0) ? '★' : '☆';
            
            card.innerHTML = `
                <div class="review-stars">${starsHtml}</div>
                <p class="review-text">"${review.text || ''}"</p>
                <div class="review-author">- ${review.author || 'Anonim'}</div>
            `;
            
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Błąd ładowania opinii:', error);
    }
}

// ============ KOSZYK ============
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Produkt nie znaleziony', 'error');
        return;
    }
    
    const stock = product.stock || 0;
    if (stock <= 0) {
        showNotification('Produkt niedostępny!', 'error');
        return;
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= stock) {
            showNotification('Nie ma tylu sztuk na stanie!', 'error');
            return;
        }
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCart();
    saveCartToStorage();
    showNotification(`Dodano: ${product.name}`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
    saveCartToStorage();
}

function changeQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newQuantity = item.quantity + delta;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const stock = product.stock || 0;
    if (newQuantity > stock) {
        showNotification('Nie ma tylu sztuk na stanie!', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    updateCart();
    saveCartToStorage();
}

function updateCart() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    
    if (cartItems) {
        cartItems.innerHTML = '';
        
        if (cart.length === 0) {
            cartItems.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">Koszyk jest pusty</p>';
        } else {
            cart.forEach(item => {
                const div = document.createElement('div');
                div.className = 'cart-item';
                const imageUrl = item.image && item.image.trim() !== '' 
                    ? item.image 
                    : 'https://via.placeholder.com/50/1a1a2e/6c5ce7?text=N';
                div.innerHTML = `
                    <img src="${imageUrl}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/50/1a1a2e/6c5ce7?text=N'">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn" onclick="changeQuantity('${item.id}', -1)">−</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" onclick="changeQuantity('${item.id}', 1)">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} zł</div>
                    <button class="remove-item" onclick="removeFromCart('${item.id}')">✕</button>
                `;
                cartItems.appendChild(div);
            });
        }
    }
    
    if (cartTotal) {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        cartTotal.textContent = total.toFixed(2) + ' zł';
    }
}

function toggleCart() {
    document.getElementById('cart-panel').classList.toggle('active');
}

function closeCart() {
    document.getElementById('cart-panel').classList.remove('active');
}

function saveCartToStorage() {
    localStorage.setItem('nexus_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('nexus_cart');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cart = parsed.filter(item => item.price && item.name);
            }
        } catch(e) {
            localStorage.removeItem('nexus_cart');
        }
    }
    updateCart();
}

// ============ SYSTEM ZAMAWIANIA ============
function checkout() {
    if (cart.length === 0) {
        showNotification('Koszyk jest pusty!', 'error');
        return;
    }
    
    if (!currentUser) {
        showNotification('Musisz się zalogować, aby złożyć zamówienie!', 'error');
        closeCart();
        openLogin();
        return;
    }
    
    closeCart();
    appliedDiscount = 0;
    const discountCode = document.getElementById('discount-code');
    const discountMessage = document.getElementById('discount-message');
    if (discountCode) discountCode.value = '';
    if (discountMessage) {
        discountMessage.textContent = '';
        discountMessage.className = '';
    }
    document.getElementById('order-modal').classList.add('active');
}

function closeOrder() {
    document.getElementById('order-modal').classList.remove('active');
}

function closeSummary() {
    document.getElementById('summary-modal').classList.remove('active');
}

function goToSummary() {
    const name = document.getElementById('order-name').value.trim();
    const email = document.getElementById('order-email').value.trim();
    const address = document.getElementById('order-address').value.trim();
    
    if (!name || !email || !address) {
        showNotification('Uzupełnij wszystkie pola!', 'error');
        return;
    }
    
    if (!email.includes('@')) {
        showNotification('Podaj poprawny adres email!', 'error');
        return;
    }
    
    currentOrderData = { 
        name, 
        email, 
        address, 
        login: currentUser ? currentUser.login : 'guest',
        uid: currentUser && currentUser.uid ? currentUser.uid : ''
    };
    closeOrder();
    
    const summaryItems = document.getElementById('summary-items');
    if (summaryItems) {
        summaryItems.innerHTML = '';
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.innerHTML = `<span>${item.name} x${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)} zł</span>`;
            summaryItems.appendChild(div);
        });
    }
    
    updateSummaryTotal();
    document.getElementById('summary-modal').classList.add('active');
}

function updateSummaryTotal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = appliedDiscount > 0 ? subtotal * (1 - appliedDiscount / 100) : subtotal;
    const totalEl = document.getElementById('summary-total');
    if (totalEl) totalEl.textContent = total.toFixed(2) + ' zł';
}

function applyDiscount() {
    const codeInput = document.getElementById('discount-code');
    const messageEl = document.getElementById('discount-message');
    
    if (!codeInput || !messageEl) return;
    
    const code = codeInput.value.trim().toUpperCase();
    
    if (DISCOUNT_CODES[code]) {
        appliedDiscount = DISCOUNT_CODES[code];
        messageEl.textContent = `Kod zaakceptowany! Zniżka: ${appliedDiscount}%`;
        messageEl.className = 'success';
        showNotification(`Zastosowano zniżkę ${appliedDiscount}%`, 'success');
    } else {
        appliedDiscount = 0;
        messageEl.textContent = 'Nieprawidłowy kod rabatowy';
        messageEl.className = '';
        showNotification('Nieprawidłowy kod', 'error');
    }
    updateSummaryTotal();
}

function backToForm() {
    closeSummary();
    document.getElementById('order-modal').classList.add('active');
}

async function processPayment() {
    const payBtn = document.querySelector('.pay-btn');
    if (payBtn) {
        payBtn.textContent = 'Przetwarzanie...';
        payBtn.disabled = true;
    }
    
    try {
        currentLicenseKey = generateLicenseKey();
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = appliedDiscount > 0 ? subtotal * (1 - appliedDiscount / 100) : subtotal;
        
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                product.stock = Math.max(0, (product.stock || 0) - item.quantity);
                await saveProduct(product);
            }
        }
        
        const newOrder = {
            date: new Date().toLocaleString('pl-PL'),
            customer: currentOrderData,
            items: cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
            total: total,
            licenseKey: currentLicenseKey,
            status: 'Oczekujące'
        };
        
        await saveOrder(newOrder);
        sendConfirmationEmail(newOrder, currentLicenseKey);
        logActivity('/checkout', 'Zakup', 'Sukces');
        
        closeSummary();
        const licenseKeyEl = document.getElementById('license-key');
        if (licenseKeyEl) licenseKeyEl.textContent = currentLicenseKey;
        document.getElementById('success-modal').classList.add('active');
        
        cart = [];
        saveCartToStorage();
        updateCart();
        await renderProducts();
        
        appliedDiscount = 0;
        showNotification('Zamówienie złożone pomyślnie!', 'success');
    } catch(error) {
        console.error('Błąd płatności:', error);
        showNotification('Błąd: ' + error.message, 'error');
    }
    
    if (payBtn) {
        payBtn.textContent = 'Zapłać';
        payBtn.disabled = false;
    }
}

function sendConfirmationEmail(order, licenseKey) {
    if (typeof emailjs === 'undefined') {
        console.log('EmailJS nie skonfigurowany');
        return;
    }
    
    const templateParams = {
        to_email: order.customer.email,
        to_name: order.customer.name,
        order_id: order.id || '—',
        order_total: order.total.toFixed(2),
        license_key: licenseKey,
        message: `Dziękujemy za zakup! Twój klucz: ${licenseKey}`
    };
    
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(() => console.log('Email wysłany'))
        .catch(err => console.error('Błąd wysyłania emaila:', err));
}

function closeSuccess() {
    document.getElementById('success-modal').classList.remove('active');
    const orderName = document.getElementById('order-name');
    const orderEmail = document.getElementById('order-email');
    const orderAddress = document.getElementById('order-address');
    const reviewContainer = document.getElementById('review-form-container');
    
    if (orderName) orderName.value = '';
    if (orderEmail) orderEmail.value = '';
    if (orderAddress) orderAddress.value = '';
    if (reviewContainer) reviewContainer.style.display = 'none';
}

// ============ OPINIE PO ZAKUPIE ============
function openReviewForm() {
    const container = document.getElementById('review-form-container');
    if (container) container.style.display = 'block';
    selectedRating = 0;
}

function setRating(rating) {
    selectedRating = rating;
    document.querySelectorAll('.star-rating span').forEach((star, index) => {
        if (index < rating) star.classList.add('active');
        else star.classList.remove('active');
    });
}

async function submitReview() {
    const textInput = document.getElementById('review-text');
    const text = textInput ? textInput.value.trim() : '';
    
    if (!text || selectedRating === 0) {
        showNotification('Uzupełnij treść opinii i wybierz ocenę!', 'error');
        return;
    }
    
    try {
        await db.collection('reviews').add({
            stars: selectedRating,
            text: text,
            author: currentUser ? currentUser.login : 'Gość'
        });
        
        if (textInput) textInput.value = '';
        selectedRating = 0;
        document.querySelectorAll('.star-rating span').forEach(s => s.classList.remove('active'));
        
        showNotification('Dziękujemy za opinię!', 'success');
        closeSuccess();
        showPage('reviews');
    } catch (error) {
        console.error('Błąd zapisu opinii:', error);
        showNotification('Błąd: ' + error.message, 'error');
    }
}

// ============ TICKETY (FORMULARZ) ============
document.getElementById('ticket-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('ticket-name').value.trim();
    const email = document.getElementById('ticket-email').value.trim();
    const category = document.getElementById('ticket-category').value;
    const message = document.getElementById('ticket-message').value.trim();
    
    if (!name || !email || !category || !message) {
        showNotification('Uzupełnij wszystkie pola!', 'error');
        return;
    }
    
    if (!email.includes('@')) {
        showNotification('Podaj poprawny adres email!', 'error');
        return;
    }
    
    try {
        const ticketData = {
            name: name,
            email: email,
            category: category,
            message: message,
            date: new Date().toLocaleString('pl-PL'),
            status: 'Otwarty',
            replies: [],
            userLogin: currentUser ? currentUser.login : null,
            userId: currentUser && currentUser.uid ? currentUser.uid : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await saveTicket(ticketData);
        
        document.getElementById('ticket-name').value = '';
        document.getElementById('ticket-email').value = '';
        document.getElementById('ticket-category').value = '';
        document.getElementById('ticket-message').value = '';
        
        const ticketSection = document.getElementById('ticket-section');
        if (ticketSection) ticketSection.style.display = 'none';
        
        showNotification('Ticket wysłany! Oczekuj na odpowiedź.', 'success');
        
    } catch(error) {
        console.error('Błąd:', error);
        showNotification('Błąd: ' + error.message, 'error');
    }
});

// ============ PANEL ADMINA ============
async function renderAdminProducts() {
    await loadProducts();
    const adminList = document.getElementById('admin-list');
    if (!adminList) return;
    
    adminList.innerHTML = '';
    
    if (products.length === 0) {
        adminList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Brak produktów</p>';
        return;
    }
    
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        const imageUrl = product.image && product.image.trim() !== '' 
            ? product.image 
            : 'https://via.placeholder.com/50/1a1a2e/6c5ce7?text=N';
        item.innerHTML = `
            <div class="admin-item-info">
                <img src="${imageUrl}" alt="" class="admin-item-image" onerror="this.src='https://via.placeholder.com/50/1a1a2e/6c5ce7?text=N'">
                <div>
                    <div class="admin-item-name">${product.name}</div>
                    <div class="admin-item-price">${(product.price || 0).toFixed(2)} zł | Stan: ${product.stock || 0} szt.</div>
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="edit-btn" onclick="openEditProductModal('${product.id}')">Edytuj</button>
                <button class="delete-btn" onclick="deleteProduct('${product.id}')">Usuń</button>
            </div>
        `;
        adminList.appendChild(item);
    });
}

function openEditProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Produkt nie znaleziony', 'error');
        return;
    }
    
    editingProductId = productId;
    
    const nameEl = document.getElementById('edit-name');
    const priceEl = document.getElementById('edit-price');
    const imageEl = document.getElementById('edit-image');
    const stockEl = document.getElementById('edit-stock');
    const descEl = document.getElementById('edit-description');
    
    if (nameEl) nameEl.value = product.name || '';
    if (priceEl) priceEl.value = product.price || 0;
    if (imageEl) imageEl.value = product.image || '';
    if (stockEl) stockEl.value = product.stock || 0;
    if (descEl) descEl.value = product.description || '';
    
    document.getElementById('edit-product-modal').classList.add('active');
}

function closeEditProductModal() {
    document.getElementById('edit-product-modal').classList.remove('active');
    editingProductId = null;
}

document.getElementById('edit-product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('edit-name').value.trim();
    const price = parseFloat(document.getElementById('edit-price').value);
    const image = document.getElementById('edit-image').value.trim();
    const stock = parseInt(document.getElementById('edit-stock').value) || 0;
    const description = document.getElementById('edit-description').value.trim();
    
    if (!name || isNaN(price) || price < 0) {
        showNotification('Uzupełnij nazwę i poprawną cenę!', 'error');
        return;
    }
    
    try {
        const product = products.find(p => p.id === editingProductId);
        if (product) {
            product.name = name;
            product.price = price;
            product.image = image;
            product.stock = stock;
            product.description = description;
            await saveProduct(product);
            await renderAdminProducts();
            await renderProducts();
            showNotification('Zaktualizowano produkt', 'success');
        }
    } catch (error) {
        showNotification('Błąd: ' + error.message, 'error');
    }
    
    closeEditProductModal();
});

async function addProduct() {
    const name = document.getElementById('admin-name').value.trim();
    const price = parseFloat(document.getElementById('admin-price').value);
    const image = document.getElementById('admin-image').value.trim();
    const stock = parseInt(document.getElementById('admin-stock').value) || 0;
    
    if (!name || isNaN(price) || price < 0) {
        showNotification('Uzupełnij nazwę i poprawną cenę!', 'error');
        return;
    }
    
    try {
        await saveProduct({ 
            name, 
            price, 
            image, 
            stock, 
            description: 'Brak opisu.', 
            features: [], 
            specs: {} 
        });
        
        document.getElementById('admin-name').value = '';
        document.getElementById('admin-price').value = '';
        document.getElementById('admin-image').value = '';
        document.getElementById('admin-stock').value = '';
        
        await renderAdminProducts();
        await renderProducts();
        showNotification('Dodano nowy produkt!', 'success');
    } catch (error) {
        showNotification('Błąd: ' + error.message, 'error');
    }
}

async function deleteProduct(id) {
    showConfirmModal('Usunąć produkt?', 'Czy na pewno chcesz usunąć ten produkt?', async function() {
        try {
            await deleteProductFromDb(id);
            await renderAdminProducts();
            await renderProducts();
            showNotification('Usunięto produkt', 'error');
        } catch (error) {
            showNotification('Błąd: ' + error.message, 'error');
        }
    });
}

// ============ ZAMÓWIENIA ============
async function renderOrders() {
    const orders = await loadOrders();
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    ordersList.innerHTML = '';
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<div class="no-orders">Brak zamówień</div>';
        return;
    }
    
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
                <select onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="Oczekujące" ${order.status === 'Oczekujące' ? 'selected' : ''}>Oczekujące</option>
                    <option value="Opłacone" ${order.status === 'Opłacone' ? 'selected' : ''}>Opłacone</option>
                    <option value="Wysłane" ${order.status === 'Wysłane' ? 'selected' : ''}>Wysłane</option>
                    <option value="Dostarczone" ${order.status === 'Dostarczone' ? 'selected' : ''}>Dostarczone</option>
                </select>
            </div>
        `;
        
        ordersList.appendChild(card);
    });
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await updateOrderStatusInDb(orderId, newStatus);
        showNotification(`Status zamówienia zmieniony na: ${newStatus}`, 'success');
        await renderOrders();
    } catch (error) {
        showNotification('Błąd: ' + error.message, 'error');
    }
}

function clearOrders() {
    showConfirmModal('Czyścić zamówienia?', 'Czy na pewno chcesz usunąć wszystkie zamówienia?', async function() {
        try {
            await clearOrdersFromDb();
            await renderOrders();
            showNotification('Wyczyszczono zamówienia', 'error');
        } catch (error) {
            showNotification('Błąd: ' + error.message, 'error');
        }
    });
}

// ============ LOGI ============
async function renderLogs() {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;
    
    const logs = await loadLogs();
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
}

function clearLogs() {
    showConfirmModal('Czyścić logi?', 'Czy na pewno chcesz usunąć wszystkie logi aktywności?', async function() {
        try {
            await clearLogsFromDb();
            await renderLogs();
            showNotification('Wyczyszczono logi', 'error');
        } catch (error) {
            showNotification('Błąd: ' + error.message, 'error');
        }
    });
}