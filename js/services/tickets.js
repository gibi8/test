// ============================================
//   TICKETY - LOGIKA (wersja bez modułów)
// ============================================

window.ticketListeners = {};
window.ticketsCache = {};

window.saveTicket = async function(ticket) {
    try {
        if (window.db) {
            const docRef = await window.db.collection('tickets').add(ticket);
            return docRef.id;
        }
        return null;
    } catch (error) {
        console.error('Błąd zapisu ticketa:', error);
        throw error;
    }
};

window.getTicket = async function(ticketId) {
    try {
        if (window.db) {
            const doc = await window.db.collection('tickets').doc(ticketId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
        }
        return null;
    } catch (error) {
        console.error('Błąd pobierania ticketa:', error);
        return null;
    }
};

window.listenToTicket = function(ticketId, callback) {
    if (window.ticketListeners[ticketId]) {
        window.ticketListeners[ticketId]();
        delete window.ticketListeners[ticketId];
    }
    if (!window.db) return;
    const unsubscribe = window.db.collection('tickets').doc(ticketId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            window.ticketsCache[ticketId] = { id: doc.id, ...data };
            if (callback) callback({ id: doc.id, ...data });
        }
    }, (error) => {
        console.error('Błąd nasłuchiwania ticketa:', error);
    });
    window.ticketListeners[ticketId] = unsubscribe;
    return unsubscribe;
};

window.listenToUserTickets = function(userLogin, userEmail, callback) {
    Object.keys(window.ticketListeners).forEach(key => {
        if (key.startsWith('user_')) {
            window.ticketListeners[key]();
            delete window.ticketListeners[key];
        }
    });
    if (!window.db) return;
    const unsubscribe = window.db.collection('tickets').onSnapshot((snapshot) => {
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
    window.ticketListeners[listenerKey] = unsubscribe;
    return unsubscribe;
};

window.listenToAllTickets = function(callback) {
    if (window.ticketListeners['all_tickets']) {
        window.ticketListeners['all_tickets']();
        delete window.ticketListeners['all_tickets'];
    }
    if (!window.db) return;
    const unsubscribe = window.db.collection('tickets').onSnapshot((snapshot) => {
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
    window.ticketListeners['all_tickets'] = unsubscribe;
    return unsubscribe;
};

window.updateTicketStatus = async function(ticketId, newStatus) {
    try {
        if (window.db) {
            await window.db.collection('tickets').doc(ticketId).update({
                status: newStatus,
                updatedAt: new Date().toLocaleString('pl-PL')
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Błąd aktualizacji statusu ticketa:', error);
        return false;
    }
};

window.addTicketReply = async function(ticketId, message, by) {
    try {
        if (!window.db) return false;
        const ticketRef = window.db.collection('tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();
        const ticket = ticketDoc.data();
        const replies = ticket.replies || [];
        replies.push({ message, date: new Date().toLocaleString('pl-PL'), by: by });
        const newStatus = by === 'admin' ? 'Odpowiedziano' : ticket.status;
        await ticketRef.update({ replies, status: newStatus, updatedAt: new Date().toLocaleString('pl-PL') });
        return true;
    } catch (error) {
        console.error('Błąd dodawania odpowiedzi:', error);
        return false;
    }
};

window.archiveTicket = async function(ticketId) {
    try {
        if (!window.db) return false;
        const ticketRef = window.db.collection('tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();
        const ticket = ticketDoc.data();
        await window.db.collection('tickets_archive').add({
            ...ticket,
            archivedAt: new Date().toLocaleString('pl-PL')
        });
        await ticketRef.delete();
        return true;
    } catch (error) {
        console.error('Błąd archiwizacji ticketa:', error);
        return false;
    }
};

window.deleteTicket = async function(ticketId) {
    try {
        if (window.db) {
            await window.db.collection('tickets').doc(ticketId).delete();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Błąd usuwania ticketa:', error);
        return false;
    }
};

console.log('✅ Tickets - załadowane');