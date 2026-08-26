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

window.changeUserRole = async function(userId, newRole) {
    console.log('🔄 changeUserRole wywołane dla userId:', userId, 'nowa rola:', newRole);
    console.log('👤 Aktualny użytkownik (currentUser):', window.currentUser);
    
    if (!window.db) {
        window.showNotification('Firebase nie dostępny', 'error');
        return;
    }
    
    try {
        const userRef = window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            window.showNotification('Użytkownik nie istnieje', 'error');
            return;
        }
        
        const userData = userDoc.data();
        console.log('📄 Dane użytkownika z bazy:', userData);
        
        if (userData.role === 'owner') {
            window.showNotification('Nie możesz zmienić roli właściciela!', 'error');
            return;
        }
        
        // Aktualizuj rolę
        await userRef.update({ role: newRole });
        console.log('✅ Rola zaktualizowana w Firestore');
        
        // ===== SPRAWDŹ CZY TO AKTUALNIE ZALOGOWANY UŻYTKOWNIK =====
        let isCurrentUser = false;
        const current = window.currentUser;
        
        if (current) {
            console.log('🔍 Sprawdzam czy to ten sam użytkownik...');
            console.log('   current.id:', current.id);
            console.log('   userId (z przycisku):', userId);
            console.log('   current.uid:', current.uid);
            console.log('   userData.uid:', userData.uid);
            console.log('   current.login:', current.login);
            console.log('   userData.login:', userData.login);
            
            if (current.id && current.id === userId) {
                isCurrentUser = true;
                console.log('👉 DOPASOWANIE po ID!');
            } else if (current.uid && userData.uid && current.uid === userData.uid) {
                isCurrentUser = true;
                console.log('👉 DOPASOWANIE po UID!');
            } else if (current.login && userData.login && current.login === userData.login) {
                isCurrentUser = true;
                console.log('👉 DOPASOWANIE po loginie!');
            } else {
                console.log('❌ BRAK DOPASOWANIA – to nie ten sam użytkownik');
            }
        } else {
            console.log('❌ Brak zalogowanego użytkownika (currentUser = null)');
        }
        
        if (isCurrentUser) {
            console.log('❗ To TEN SAM użytkownik – wylogowuję!');
            
            // Wyloguj użytkownika
            window.showNotification('Twoja rola została zmieniona. Zaloguj się ponownie.', 'success');
            
            // Wywołaj logout i po chwili przekieruj
            try {
                if (window.auth) await window.auth.signOut();
            } catch(e) {}
            
            window.currentUser = null;
            sessionStorage.removeItem('nexus_user');
            window.updateLoginButton();
            
            setTimeout(() => {
                window.showPage('home');
                setTimeout(() => {
                    window.openLogin();
                }, 300);
            }, 500);
            
            return;
        }
        
        // Jeśli zmiana dotyczy innego użytkownika
        window.showNotification('Zmieniono rolę użytkownika ' + (userData.login || '') + ' na: ' + newRole, 'success');
        
        // Odśwież listę użytkowników
        setTimeout(async () => {
            if (window.renderUsersUI) {
                await window.renderUsersUI();
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Błąd zmiany roli:', error);
        window.showNotification('Błąd: ' + error.message, 'error');
    }
};

// ===== NOWA FUNKCJA DLA ADMIN PANELU =====
window.changeUserRole = async function(userId, newRole) {
    console.log('🔄 changeUserRole wywołane dla:', userId, 'nowa rola:', newRole);
    
    if (!window.db) {
        window.showNotification('Firebase nie dostępny', 'error');
        return;
    }
    
    try {
        const userRef = window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            window.showNotification('Użytkownik nie istnieje', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        if (userData.role === 'owner') {
            window.showNotification('Nie możesz zmienić roli właściciela!', 'error');
            return;
        }
        
        await userRef.update({ role: newRole });
        console.log('✅ Rola zaktualizowana w Firestore');
        
        // Sprawdź czy to aktualnie zalogowany użytkownik
        let isCurrent = false;
        if (window.currentUser) {
            if (window.currentUser.id === userId) isCurrent = true;
            if (window.currentUser.uid && userData.uid === window.currentUser.uid) isCurrent = true;
            if (window.currentUser.login && userData.login === window.currentUser.login) isCurrent = true;
        }
        
        if (isCurrent) {
            // Wyloguj użytkownika
            await window.logoutUser();
            window.showNotification('Twoja rola została zmieniona. Zaloguj się ponownie.', 'success');
            window.showPage('home');
            setTimeout(() => {
                window.openLogin();
            }, 1000);
            return;
        }
        
        window.showNotification('Zmieniono rolę użytkownika ' + (userData.login || '') + ' na: ' + newRole, 'success');
        
        // Odśwież listę użytkowników
        setTimeout(async () => {
            if (window.renderUsersUI) {
                await window.renderUsersUI();
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Błąd zmiany roli:', error);
        window.showNotification('Błąd: ' + error.message, 'error');
    }
};

// ===== ZMIENIONA FUNKCJA RENDER USERS UI =====
window.renderUsersUI = async function() {
    const users = await window.loadUsers();
    const list = document.getElementById('users-list');
    if (!list) return;
    list.innerHTML = '';
    if (users.length === 0) { 
        list.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:30px;">Brak użytkowników</p>'; 
        return; 
    }
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        const initial = (user.login || '?').charAt(0).toUpperCase();
        
        let actionsHtml = '';
        if (user.role === 'owner') {
            actionsHtml = `<span style="color:#f59e0b;font-weight:600;font-size:13px;padding:4px 12px;background:rgba(245,158,11,0.12);border-radius:6px;">Owner</span>`;
        } else {
            const newRole = user.role === 'admin' ? 'user' : 'admin';
            const label = user.role === 'admin' ? 'Zdegraduj' : 'Zrób adminem';
            actionsHtml = `<button class="edit-btn" onclick="window.changeUserRole('${user.id}', '${newRole}')">${label}</button>`;
        }
        
        card.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${initial}</div>
                <div>
                    <div class="user-name">${user.login || '—'}</div>
                    <div class="user-email">${user.email || '—'}</div>
                </div>
            </div>
            <div class="user-role ${user.role || 'user'}">${user.role || 'user'}</div>
            <div class="user-actions">${actionsHtml}</div>
        `;
        list.appendChild(card);
    });
};

console.log('✅ Users - załadowane');