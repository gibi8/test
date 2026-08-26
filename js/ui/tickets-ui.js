// ============================================
//   TICKETY - UI
// ============================================

window.renderTicketsRealTime = function() {
    if (window.showArchivedTickets) {
        return;
    }
    const ticketsList = document.getElementById('tickets-list');
    if (!ticketsList) return;
    ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie zgłoszeń...</p>';
    window.listenToAllTickets((tickets) => {
        window.updateTicketStatsRealTime(tickets);
        const currentFilter = window.currentTicketFilter || 'all';
        let filtered = currentFilter !== 'all' ? tickets.filter(t => t.status === currentFilter) : tickets;
        filtered.sort((a, b) => {
            if (a.status === 'Zamknięty' && b.status !== 'Zamknięty') return 1;
            if (b.status === 'Zamknięty' && a.status !== 'Zamknięty') return -1;
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
        ticketsList.innerHTML = '';
        if (filtered.length === 0) {
            ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:30px;">Brak zgłoszeń</p>';
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
            const statusClass = (ticket.status || 'Otwarty').toLowerCase().replace(/\s+/g, '-');
            card.innerHTML = `
                <div class="ticket-tool-card-header">
                    <span class="ticket-tool-id">#${ticket.id.substring(0, 6)}</span>
                    <span class="ticket-tool-date">${ticket.date}</span>
                </div>
                <div class="ticket-tool-preview">${ticket.message}</div>
                <div class="ticket-tool-meta">
                    <span class="ticket-tool-user">${ticket.name} · ${ticket.category}</span>
                    <span class="ticket-status-badge status-${statusClass}">${ticket.status || 'Otwarty'}</span>
                </div>
                <div class="ticket-tool-actions">
                    <button class="ticket-btn open" onclick="event.stopPropagation(); window.openAdminTicketView('${ticket.id}')">Otwórz czat</button>
                    ${ticket.status !== 'Zamknięty' ? `
                        <button class="ticket-btn accept" onclick="event.stopPropagation(); window.acceptTicket('${ticket.id}')">Przyjmij</button>
                        <button class="ticket-btn reject" onclick="event.stopPropagation(); window.closeTicket('${ticket.id}')">Zamknij</button>
                    ` : `
                        <button class="ticket-btn accept" onclick="event.stopPropagation(); window.restoreTicket('${ticket.id}')">Przywróć</button>
                    `}
                    <button class="ticket-btn delete" onclick="event.stopPropagation(); window.deleteTicketRealTime('${ticket.id}')">Usuń</button>
                </div>
            `;
            ticketsList.appendChild(card);
        });
    });
};

window.renderMyTickets = function() {
    if (!window.currentUser) {
        const ticketsSection = document.getElementById('my-tickets-section');
        if (ticketsSection) ticketsSection.style.display = 'none';
        return;
    }
    const ticketsSection = document.getElementById('my-tickets-section');
    const ticketsList = document.getElementById('my-tickets-list');
    if (!ticketsSection || !ticketsList) return;
    ticketsSection.style.display = 'block';
    ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie...</p>';
    window.listenToUserTickets(window.currentUser.login || '', window.currentUser.email || '', (tickets) => {
        if (tickets.length === 0) { ticketsSection.style.display = 'none'; return; }
        ticketsSection.style.display = 'block';
        ticketsList.innerHTML = '';
        tickets.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'my-ticket-card';
            const statusColors = { 'Otwarty': '#ffc800', 'W trakcie': '#a29bfe', 'Odpowiedziano': '#4ade80', 'Zamknięty': '#ff6b6b' };
            const statusColor = statusColors[ticket.status] || '#a29bfe';
            const hasNewAdminReply = ticket.replies && ticket.replies.length > 0 && ticket.replies[ticket.replies.length - 1].by === 'admin';
            card.innerHTML = `
                <div class="ticket-header">
                    <span class="ticket-category">${ticket.category || 'Inne'}</span>
                    <span class="ticket-date">${ticket.date || '—'}</span>
                </div>
                <div class="ticket-message">${ticket.message || 'Brak treści'}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:8px;">
                    <span style="color:${statusColor};font-weight:bold;font-size:13px;">● ${ticket.status || 'Otwarty'}</span>
                    <span style="font-size:13px;color:${hasNewAdminReply ? '#4ade80' : 'rgba(255,255,255,0.3)'};">
                        ${ticket.replies && ticket.replies.length > 0 ? ` Odpowiedzi: ${ticket.replies.length} ${hasNewAdminReply ? '🆕' : ''}` : '⏳ Oczekuje na odpowiedź'}
                    </span>
                </div>
                <button class="support-ticket-open" onclick="event.stopPropagation(); window.openUserTicketView('${ticket.id}')">Otwórz →</button>
            `;
            ticketsList.appendChild(card);
        });
    });
};

window.updateTicketStatsRealTime = function(tickets) {
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
    if (badge) { badge.textContent = totalActive; badge.style.display = totalActive > 0 ? 'inline-block' : 'none'; }
};

window.acceptTicket = async function(ticketId) {
    const success = await window.updateTicketStatus(ticketId, 'W trakcie');
    if (success) { window.showNotification('Przyjęto zgłoszenie', 'success'); window.renderTicketsRealTime(); }
};

window.closeTicket = async function(ticketId) {
    window.showConfirmModal('Zamknąć zgłoszenie?', 'Czy na pewno chcesz zamknąć to zgłoszenie? Zostanie przeniesione do archiwum.', async function() {
        const success = await window.updateTicketStatus(ticketId, 'Zamknięty');
        if (success) {
            setTimeout(async () => {
                await window.archiveTicket(ticketId);
                window.showNotification('Zgłoszenie zamknięte i zarchiwizowane', 'success');
                window.renderTicketsRealTime();
                window.renderMyTickets();
            }, 1000);
        }
    });
};

window.deleteTicketRealTime = async function(ticketId) {
    window.showConfirmModal('Usunąć ticket?', 'Czy na pewno chcesz usunąć to zgłoszenie?', async function() {
        const success = await window.deleteTicket(ticketId);
        if (success) { window.showNotification('Usunięto ticket', 'error'); window.renderTicketsRealTime(); window.renderMyTickets(); }
    });
};

window.restoreTicket = function(ticketId) {
    window.showNotification('Funkcja przywracania w przygotowaniu', 'error');
};

window.openUserTicketView = function(ticketId) {
    window.currentViewingTicketId = ticketId;
    window.openTicketView(ticketId, 'user');
};

window.openAdminTicketView = function(ticketId) {
    window.currentViewingTicketId = ticketId;
    window.openTicketView(ticketId, 'admin');
};

window.openTicketView = function(ticketId, role) {
    const modal = document.getElementById('ticket-view-modal');
    const content = document.getElementById('ticket-view-content');
    const title = document.getElementById('ticket-view-title');
    const replySection = document.querySelector('.ticket-reply-section');
    if (!modal || !content) return;
    title.textContent = role === 'admin' ? ` Zgłoszenie #${ticketId.substring(0, 8)} - Ładowanie...` : ' Czat - Ładowanie...';
    content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Ładowanie...</div>';
    if (window.ticketListeners['view_' + ticketId]) {
        window.ticketListeners['view_' + ticketId]();
        delete window.ticketListeners['view_' + ticketId];
    }
    window.listenToTicket(ticketId, (ticket) => {
        title.textContent = role === 'admin' ? ` Zgłoszenie #${ticketId.substring(0, 8)} - ${ticket.category || 'Ticket'}` : ` Czat: ${ticket.category || 'Ticket'}`;
        content.innerHTML = '';
        const userMsg = document.createElement('div');
        userMsg.className = 'ticket-message-bubble user';
        userMsg.innerHTML = `<div class="bubble-header"> ${ticket.name}</div><div class="bubble-message">${ticket.message}</div><div class="bubble-date">${ticket.date}</div>`;
        content.appendChild(userMsg);
        (ticket.replies || []).forEach(reply => {
            const replyDiv = document.createElement('div');
            if (reply.by === 'admin') {
                replyDiv.className = 'ticket-message-bubble admin';
                replyDiv.innerHTML = `<div class="bubble-header"> Support</div><div class="bubble-message">${reply.message}</div><div class="bubble-date">${reply.date}</div>`;
            } else {
                replyDiv.className = 'ticket-message-bubble user';
                replyDiv.innerHTML = `<div class="bubble-header"> ${ticket.name}</div><div class="bubble-message">${reply.message}</div><div class="bubble-date">${reply.date}</div>`;
            }
            content.appendChild(replyDiv);
        });
        content.scrollTop = content.scrollHeight;
        if (ticket.status === 'Zamknięty') {
            replySection.innerHTML = `<div style="text-align:center;padding:15px;color:#ff6b6b;font-weight:bold;border:1px solid rgba(255,100,100,0.3);border-radius:8px;background:rgba(255,100,100,0.1);">⛔ To zgłoszenie zostało zamknięte.</div>`;
        } else {
            const placeholder = role === 'admin' ? 'Napisz odpowiedź dla użytkownika...' : 'Napisz wiadomość...';
            const btnText = role === 'admin' ? ' Wyślij odpowiedź' : ' Wyślij wiadomość';
            const sendFn = role === 'admin' ? `window.sendAdminReply('${ticketId}')` : `window.sendUserReply('${ticketId}')`;
            replySection.innerHTML = `<textarea id="ticket-reply-text" placeholder="${placeholder}" rows="3"></textarea><button class="submit-btn" onclick="${sendFn}">${btnText}</button>`;
        }
    });
    modal.classList.add('active');
};

window.sendUserReply = async function(ticketId) {
    const replyText = document.getElementById('ticket-reply-text');
    if (!replyText) return;
    const message = replyText.value.trim();
    if (!message) { window.showNotification('Napisz wiadomość!', 'error'); return; }
    const success = await window.addTicketReply(ticketId, message, 'user');
    if (success) {
        replyText.value = '';
        window.showNotification('Wiadomość wysłana!', 'success');
        window.renderMyTickets();
    } else {
        window.showNotification('Błąd wysyłania wiadomości', 'error');
    }
};

window.sendAdminReply = async function(ticketId) {
    const replyText = document.getElementById('ticket-reply-text');
    if (!replyText) return;
    const message = replyText.value.trim();
    if (!message) { window.showNotification('Napisz odpowiedź!', 'error'); return; }
    const success = await window.addTicketReply(ticketId, message, 'admin');
    if (success) {
        replyText.value = '';
        window.showNotification('Odpowiedź wysłana!', 'success');
        window.renderTicketsRealTime();
        window.renderMyTickets();
    } else {
        window.showNotification('Błąd wysyłania odpowiedzi', 'error');
    }
};

window.closeTicketViewModal = function() {
    document.getElementById('ticket-view-modal').classList.remove('active');
    if (window.currentViewingTicketId && window.ticketListeners['view_' + window.currentViewingTicketId]) {
        window.ticketListeners['view_' + window.currentViewingTicketId]();
        delete window.ticketListeners['view_' + window.currentViewingTicketId];
    }
    window.currentViewingTicketId = null;
};

window.filterTickets = function(filter, button) {
    window.currentTicketFilter = filter;
    document.querySelectorAll('.ticket-filter').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    if (window.renderTicketsRealTime) window.renderTicketsRealTime();
};

// ============================================
//   ARCHIWUM TICKETÓW
// ============================================

window.showArchivedTickets = false;

window.loadArchivedTicketsAdmin = async function() {
    try {
        window.showArchivedTickets = true;
        
        // Ukryj aktywny przycisk "Archiwum", pokaż przycisk powrotu
        const archiveBtn = document.querySelector('.ticket-filter.archive');
        const backBtn = document.getElementById('tickets-back-btn');
        if (archiveBtn) archiveBtn.style.display = 'none';
        if (backBtn) backBtn.style.display = 'inline-block';
        
        const ticketsList = document.getElementById('tickets-list');
        if (!ticketsList) return;
        ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie archiwum...</p>';
        
        // Pobierz tickety z archiwum
        if (!window.db) {
            ticketsList.innerHTML = '<p style="color:#ff6b6b;text-align:center;padding:20px;">Błąd połączenia z bazą danych</p>';
            return;
        }
        
        const snapshot = await window.db.collection('tickets_archive')
            .orderBy('archivedAt', 'desc')
            .limit(100)
            .get();
        
        const tickets = [];
        snapshot.forEach(doc => {
            tickets.push({ id: doc.id, ...doc.data() });
        });
        
        window.renderArchivedTickets(tickets);
        
    } catch (error) {
        console.error('❌ Błąd ładowania archiwum:', error);
        document.getElementById('tickets-list').innerHTML = '<p style="color:#ff6b6b;text-align:center;padding:20px;">Błąd ładowania archiwum</p>';
    }
};

window.renderArchivedTickets = function(tickets) {
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
        card.style.borderColor = 'rgba(255,100,100,0.2)';
        card.style.background = 'rgba(255,100,100,0.03)';
        
        const replyCount = (ticket.replies || []).length;
        const archivedDate = ticket.archivedAt || ticket.date || '—';
        
        card.innerHTML = `
            <div class="ticket-tool-card-header">
                <span class="ticket-tool-id" style="color:#ff6b6b;">#${ticket.id.substring(0, 6)}</span>
                <span class="ticket-tool-date">${ticket.date || '—'}</span>
                ${replyCount > 0 ? `<span style="color:#4ade80;font-size:12px;"> ${replyCount}</span>` : ''}
            </div>
            <div class="ticket-tool-preview">${ticket.message}</div>
            <div class="ticket-tool-meta">
                <span class="ticket-tool-user">${ticket.name} · ${ticket.category}</span>
                <span class="ticket-status-badge status-zamkniety">Zamknięty</span>
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:4px;grid-column:1/2;">
                Zarchiwizowano: ${archivedDate}
            </div>
            <div class="ticket-tool-actions">
                <button class="ticket-btn open" onclick="event.stopPropagation(); window.openAdminTicketView('${ticket.id}')">Otwórz czat</button>
                <button class="ticket-btn accept" onclick="event.stopPropagation(); window.restoreTicketFromArchive('${ticket.id}')">Przywróć</button>
                <button class="ticket-btn delete" onclick="event.stopPropagation(); window.deleteArchivedTicket('${ticket.id}')">Usuń z archiwum</button>
            </div>
        `;
        ticketsList.appendChild(card);
    });
};

window.goBackToActiveTickets = function() {
    window.showArchivedTickets = false;
    
    const archiveBtn = document.querySelector('.ticket-filter.archive');
    const backBtn = document.getElementById('tickets-back-btn');
    if (archiveBtn) archiveBtn.style.display = 'inline-block';
    if (backBtn) backBtn.style.display = 'none';
    
    window.renderTicketsRealTime();
};

window.restoreTicketFromArchive = async function(ticketId) {
    try {
        const doc = await window.db.collection('tickets_archive').doc(ticketId).get();
        if (!doc.exists) {
            window.showNotification('Nie znaleziono ticketa w archiwum', 'error');
            return;
        }
        const ticketData = doc.data();
        delete ticketData.archivedAt;
        await window.db.collection('tickets').doc(ticketId).set(ticketData);
        await window.db.collection('tickets_archive').doc(ticketId).delete();
        window.showNotification('Ticket przywrócony!', 'success');
        window.loadArchivedTicketsAdmin(); // Odśwież archiwum
        window.renderTicketsRealTime(); // Odśwież aktywne
    } catch (error) {
        console.error('Błąd przywracania ticketa:', error);
        window.showNotification('Błąd: ' + error.message, 'error');
    }
};

window.deleteArchivedTicket = async function(ticketId) {
    window.showConfirmModal('Usunąć ticket z archiwum?', 'Czy na pewno chcesz trwale usunąć to zgłoszenie z archiwum?', async function() {
        try {
            await window.db.collection('tickets_archive').doc(ticketId).delete();
            window.showNotification('Usunięto z archiwum', 'error');
            window.loadArchivedTicketsAdmin();
        } catch (error) {
            console.error('Błąd usuwania:', error);
            window.showNotification('Błąd: ' + error.message, 'error');
        }
    });
};

// ===== WYSZUKIWANIE TICKETÓW W ADMIN =====
window.filterTicketSearch = function() {
    const query = document.getElementById('ticket-search-input').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.ticket-tool-card');
    let visibleCount = 0;
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(query)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    const container = document.getElementById('tickets-list');
    if (visibleCount === 0 && cards.length > 0) {
        // Jeśli nie ma wyników, pokaż komunikat
        const noResult = document.createElement('p');
        noResult.style.textAlign = 'center';
        noResult.style.color = 'rgba(255,255,255,0.4)';
        noResult.style.padding = '20px';
        noResult.textContent = 'Brak zgłoszeń spełniających kryteria';
        container.appendChild(noResult);
    }
};

console.log('✅ Tickets UI - załadowane');