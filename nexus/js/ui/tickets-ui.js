// ============================================
//   TICKETY - UI
// ============================================

import { currentUser } from '../services/auth.js';
import { 
    listenToAllTickets, 
    listenToUserTickets, 
    listenToTicket,
    updateTicketStatus,
    addTicketReply,
    deleteTicket,
    archiveTicket,
    ticketListeners
} from '../services/tickets.js';
import { showNotification, showConfirmModal } from './notifications.js';

let currentViewingTicketId = null;

export function renderTicketsRealTime() {
    const ticketsList = document.getElementById('tickets-list');
    if (!ticketsList) return;
    
    ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie zgłoszeń...</p>';
    
    listenToAllTickets((tickets) => {
        updateTicketStats(tickets);
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
                    <button class="ticket-btn open" onclick="event.stopPropagation(); openAdminTicketView('${ticket.id}')">Otwórz czat</button>
                    ${ticket.status !== 'Zamknięty' ? `
                        <button class="ticket-btn accept" onclick="event.stopPropagation(); acceptTicket('${ticket.id}')">Przyjmij</button>
                        <button class="ticket-btn reject" onclick="event.stopPropagation(); closeTicket('${ticket.id}')">Zamknij</button>
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

export function renderMyTickets() {
    if (!currentUser) {
        const ticketsSection = document.getElementById('my-tickets-section');
        if (ticketsSection) ticketsSection.style.display = 'none';
        return;
    }
    
    const ticketsSection = document.getElementById('my-tickets-section');
    const ticketsList = document.getElementById('my-tickets-list');
    if (!ticketsSection || !ticketsList) return;
    
    ticketsSection.style.display = 'block';
    ticketsList.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">Ładowanie...</p>';
    
    listenToUserTickets(currentUser.login || '', currentUser.email || '', (tickets) => {
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
                        ${ticket.replies && ticket.replies.length > 0 ? `💬 Odpowiedzi: ${ticket.replies.length} ${hasNewAdminReply ? '🆕' : ''}` : '⏳ Oczekuje na odpowiedź'}
                    </span>
                </div>
                <button class="support-ticket-open" onclick="event.stopPropagation(); window.openUserTicketView('${ticket.id}')">Otwórz →</button>
            `;
            ticketsList.appendChild(card);
        });
    });
}

function updateTicketStats(tickets) {
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
}

export async function acceptTicket(ticketId) {
    const success = await updateTicketStatus(ticketId, 'W trakcie');
    if (success) { showNotification('Przyjęto zgłoszenie', 'success'); renderTicketsRealTime(); }
}

export async function closeTicket(ticketId) {
    showConfirmModal('Zamknąć zgłoszenie?', 'Czy na pewno chcesz zamknąć to zgłoszenie? Zostanie przeniesione do archiwum.', async function() {
        const success = await updateTicketStatus(ticketId, 'Zamknięty');
        if (success) {
            setTimeout(async () => {
                await archiveTicket(ticketId);
                showNotification('Zgłoszenie zamknięte i zarchiwizowane', 'success');
                renderTicketsRealTime();
                renderMyTickets();
            }, 1000);
        }
    });
}

export async function deleteTicketRealTime(ticketId) {
    showConfirmModal('Usunąć ticket?', 'Czy na pewno chcesz usunąć to zgłoszenie?', async function() {
        const success = await deleteTicket(ticketId);
        if (success) { showNotification('Usunięto ticket', 'error'); renderTicketsRealTime(); renderMyTickets(); }
    });
}

export async function restoreTicket(ticketId) {
    showNotification('Funkcja przywracania w przygotowaniu', 'error');
}

export function openUserTicketView(ticketId) { 
    currentViewingTicketId = ticketId; 
    openTicketView(ticketId, 'user'); 
}

export function openAdminTicketView(ticketId) { 
    currentViewingTicketId = ticketId; 
    openTicketView(ticketId, 'admin'); 
}

function openTicketView(ticketId, role) {
    const modal = document.getElementById('ticket-view-modal');
    const content = document.getElementById('ticket-view-content');
    const title = document.getElementById('ticket-view-title');
    const replySection = document.querySelector('.ticket-reply-section');
    if (!modal || !content) return;
    
    title.textContent = role === 'admin' ? `🛡️ Zgłoszenie #${ticketId.substring(0, 8)} - Ładowanie...` : '💬 Czat - Ładowanie...';
    content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Ładowanie...</div>';
    
    if (ticketListeners['view_' + ticketId]) { 
        ticketListeners['view_' + ticketId](); 
        delete ticketListeners['view_' + ticketId]; 
    }
    
    listenToTicket(ticketId, (ticket) => {
        title.textContent = role === 'admin' ? `🛡️ Zgłoszenie #${ticketId.substring(0, 8)} - ${ticket.category || 'Ticket'}` : `💬 Czat: ${ticket.category || 'Ticket'}`;
        content.innerHTML = '';
        
        const userMsg = document.createElement('div');
        userMsg.className = 'ticket-message-bubble user';
        userMsg.innerHTML = `<div class="bubble-header">👤 ${ticket.name}</div><div class="bubble-message">${ticket.message}</div><div class="bubble-date">${ticket.date}</div>`;
        content.appendChild(userMsg);
        
        (ticket.replies || []).forEach(reply => {
            const replyDiv = document.createElement('div');
            if (reply.by === 'admin') {
                replyDiv.className = 'ticket-message-bubble admin';
                replyDiv.innerHTML = `<div class="bubble-header">🛡️ Support</div><div class="bubble-message">${reply.message}</div><div class="bubble-date">${reply.date}</div>`;
            } else {
                replyDiv.className = 'ticket-message-bubble user';
                replyDiv.innerHTML = `<div class="bubble-header">👤 ${ticket.name}</div><div class="bubble-message">${reply.message}</div><div class="bubble-date">${reply.date}</div>`;
            }
            content.appendChild(replyDiv);
        });
        content.scrollTop = content.scrollHeight;
        
        if (ticket.status === 'Zamknięty') {
            replySection.innerHTML = `<div style="text-align:center;padding:15px;color:#ff6b6b;font-weight:bold;border:1px solid rgba(255,100,100,0.3);border-radius:8px;background:rgba(255,100,100,0.1);">⛔ To zgłoszenie zostało zamknięte.</div>`;
        } else {
            const placeholder = role === 'admin' ? 'Napisz odpowiedź dla użytkownika...' : 'Napisz wiadomość...';
            const btnText = role === 'admin' ? '🛡️ Wyślij odpowiedź' : '💬 Wyślij wiadomość';
            const sendFn = role === 'admin' ? `sendAdminReply('${ticketId}')` : `sendUserReply('${ticketId}')`;
            replySection.innerHTML = `<textarea id="ticket-reply-text" placeholder="${placeholder}" rows="3"></textarea><button class="submit-btn" onclick="${sendFn}">${btnText}</button>`;
        }
    });
    modal.classList.add('active');
}

export async function sendUserReply(ticketId) {
    const replyText = document.getElementById('ticket-reply-text');
    if (!replyText) return;
    const message = replyText.value.trim();
    if (!message) { showNotification('Napisz wiadomość!', 'error'); return; }
    const success = await addTicketReply(ticketId, message, 'user');
    if (success) { 
        replyText.value = ''; 
        showNotification('Wiadomość wysłana!', 'success'); 
        renderMyTickets(); 
    } else { 
        showNotification('Błąd wysyłania wiadomości', 'error'); 
    }
}

export async function sendAdminReply(ticketId) {
    const replyText = document.getElementById('ticket-reply-text');
    if (!replyText) return;
    const message = replyText.value.trim();
    if (!message) { showNotification('Napisz odpowiedź!', 'error'); return; }
    const success = await addTicketReply(ticketId, message, 'admin');
    if (success) { 
        replyText.value = ''; 
        showNotification('Odpowiedź wysłana!', 'success'); 
        renderTicketsRealTime(); 
        renderMyTickets(); 
    } else { 
        showNotification('Błąd wysyłania odpowiedzi', 'error'); 
    }
}

export function closeTicketView() {
    document.getElementById('ticket-view-modal').classList.remove('active');
    if (currentViewingTicketId && ticketListeners['view_' + currentViewingTicketId]) {
        ticketListeners['view_' + currentViewingTicketId]();
        delete ticketListeners['view_' + currentViewingTicketId];
    }
    currentViewingTicketId = null;
}

// ===== FUNKCJE GLOBALNE DLA ONCLICK =====
window.renderTicketsRealTime = renderTicketsRealTime;
window.renderMyTickets = renderMyTickets;
window.openUserTicketView = openUserTicketView;
window.openAdminTicketView = openAdminTicketView;
window.sendUserReply = sendUserReply;
window.sendAdminReply = sendAdminReply;
window.acceptTicket = acceptTicket;
window.closeTicket = closeTicket;
window.deleteTicketRealTime = deleteTicketRealTime;
window.closeTicketView = closeTicketView;

console.log('✅ Tickets UI - załadowane');