// ============================================
//   UŻYTKOWNICY - LOGIKA
// ============================================

window.loadUsers = async function() {
    try {
        if (window.db) {
            const snapshot = await window.db.collection('users').get();
            const users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        }
        return [];
    } catch (error) {
        console.error('Błąd ładowania użytkowników:', error);
        return [];
    }
};

window.updateUserRole = async function(userId, newRole) {
    try {
        if (window.db) {
            await window.db.collection('users').doc(userId).update({ role: newRole });
            window.showNotification('Zmieniono rolę użytkownika', 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Błąd aktualizacji roli:', error);
        window.showNotification('Błąd: ' + error.message, 'error');
        return false;
    }
};

console.log('✅ Users - załadowane');