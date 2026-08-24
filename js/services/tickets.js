// ============================================
//   TICKETY - LOGIKA
// ============================================

import { db } from '../config/firebase.js';
import { collection, addDoc, getDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export let ticketListeners = {};
export let ticketsCache = {};

export async function saveTicket(ticket) {
    try {
        const docRef = await addDoc(collection(db, 'tickets'), ticket);
        return docRef.id;
    } catch (error) {
        console.error('Błąd zapisu ticketa:', error);
        throw error;
    }
}

export async function getTicket(ticketId) {
    try {
        const docSnap = await getDoc(doc(db, 'tickets', ticketId));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Błąd pobierania ticketa:', error);
        return null;
    }
}

export function listenToTicket(ticketId, callback) {
    if (ticketListeners[ticketId]) {
        ticketListeners[ticketId]();
        delete ticketListeners[ticketId];
    }
    
    const unsubscribe = onSnapshot(doc(db, 'tickets', ticketId), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            ticketsCache[ticketId] = { id: docSnap.id, ...data };
            if (callback) callback({ id: docSnap.id, ...data });
        }
    }, (error) => {
        console.error('Błąd nasłuchiwania ticketa:', error);
    });
    
    ticketListeners[ticketId] = unsubscribe;
    return unsubscribe;
}

export function listenToAllTickets(callback) {
    if (ticketListeners['all_tickets']) {
        ticketListeners['all_tickets']();
        delete ticketListeners['all_tickets'];
    }
    
    const unsubscribe = onSnapshot(collection(db, 'tickets'), (snapshot) => {
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

export function listenToUserTickets(userLogin, userEmail, callback) {
    Object.keys(ticketListeners).forEach(key => {
        if (key.startsWith('user_')) {
            ticketListeners[key]();
            delete ticketListeners[key];
        }
    });
    
    const unsubscribe = onSnapshot(collection(db, 'tickets'), (snapshot) => {
        const userTickets = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.email === userEmail || data.name === userLogin || data.userLogin === userLogin) {
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

export async function updateTicketStatus(ticketId, newStatus) {
    try {
        await updateDoc(doc(db, 'tickets', ticketId), { 
            status: newStatus,
            updatedAt: new Date().toLocaleString('pl-PL')
        });
        return true;
    } catch (error) {
        console.error('Błąd aktualizacji statusu ticketa:', error);
        return false;
    }
}

export async function addTicketReply(ticketId, message, by) {
    try {
        const ticketRef = doc(db, 'tickets', ticketId);
        const ticketDoc = await getDoc(ticketRef);
        const ticket = ticketDoc.data();
        
        const replies = ticket.replies || [];
        replies.push({
            message: message,
            date: new Date().toLocaleString('pl-PL'),
            by: by
        });
        
        const newStatus = by === 'admin' ? 'Odpowiedziano' : ticket.status;
        
        await updateDoc(ticketRef, { 
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

export async function archiveTicket(ticketId) {
    try {
        const ticketRef = doc(db, 'tickets', ticketId);
        const ticketDoc = await getDoc(ticketRef);
        const ticket = ticketDoc.data();
        
        await addDoc(collection(db, 'tickets_archive'), {
            ...ticket,
            archivedAt: new Date().toLocaleString('pl-PL')
        });
        
        await deleteDoc(ticketRef);
        return true;
    } catch (error) {
        console.error('Błąd archiwizacji ticketa:', error);
        return false;
    }
}

export async function deleteTicket(ticketId) {
    try {
        await deleteDoc(doc(db, 'tickets', ticketId));
        return true;
    } catch (error) {
        console.error('Błąd usuwania ticketa:', error);
        return false;
    }
}

// ============================================
//   EVENT LISTENER - FORMULARZ TICKET
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('ticket-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('📝 Formularz ticketu wysłany');
            
            const name = document.getElementById('ticket-name')?.value?.trim() || 'Użytkownik';
            const email = document.getElementById('ticket-email')?.value?.trim() || (window.currentUser ? window.currentUser.email : '');
            const category = document.getElementById('ticket-category')?.value || '';
            const orderNumber = document.getElementById('ticket-order')?.value?.trim() || '';
            const message = document.getElementById('ticket-message')?.value?.trim() || '';
            
            console.log('📝 Dane ticketu:', { name, email, category, orderNumber, message });
            
            if (!category || !message) {
                window.showNotification('Uzupełnij wszystkie wymagane pola!', 'error');
                return;
            }
            
            if (!email || !email.includes('@')) {
                window.showNotification('Podaj poprawny adres email!', 'error');
                return;
            }
            
            try {
                const ticketData = {
                    name: name,
                    email: email,
                    category: category,
                    subject: category,
                    orderNumber: orderNumber || null,
                    message: message,
                    date: new Date().toLocaleString('pl-PL'),
                    status: 'Otwarty',
                    replies: [],
                    userLogin: window.currentUser ? window.currentUser.login : null,
                    userId: window.currentUser && window.currentUser.uid ? window.currentUser.uid : null,
                    createdAt: new Date().toISOString()
                };
                
                console.log('📝 Zapisuję ticket:', ticketData);
                
                const ticketId = await saveTicket(ticketData);
                console.log('✅ Ticket zapisany, ID:', ticketId);
                
                // Czyścimy formularz
                document.getElementById('ticket-category').value = '';
                document.getElementById('ticket-order').value = '';
                document.getElementById('ticket-message').value = '';
                document.getElementById('ticket-section').style.display = 'none';
                
                window.showNotification('Ticket wysłany! Oczekuj na odpowiedź.', 'success');
                
                // Odśwież tickety
                if (window.renderMyTickets) {
                    window.renderMyTickets();
                }
                
                // Odśwież tickety w support-list
                if (window.renderUserTickets && window.currentUser) {
                    window.listenToUserTickets(
                        window.currentUser.login || '',
                        window.currentUser.email || '',
                        window.renderUserTickets
                    );
                }
                
            } catch(error) {
                console.error('❌ Błąd zapisu ticketa:', error);
                window.showNotification('Błąd: ' + error.message, 'error');
            }
        });
    } else {
        console.warn('⚠️ Formularz ticketu nie znaleziony (id="ticket-form")');
    }
});

// ============================================
//   FUNKCJE GLOBALNE DLA ONCLICK
// ============================================

window.saveTicket = saveTicket;
window.getTicket = getTicket;
window.listenToTicket = listenToTicket;
window.listenToAllTickets = listenToAllTickets;
window.listenToUserTickets = listenToUserTickets;
window.updateTicketStatus = updateTicketStatus;
window.addTicketReply = addTicketReply;
window.archiveTicket = archiveTicket;
window.deleteTicket = deleteTicket;
window.ticketListeners = ticketListeners;
window.ticketsCache = ticketsCache;

console.log('✅ Tickets - załadowane');