// ============================================
//   AUTORYZACJA
// ============================================

window.currentUser = null;

window.setCurrentUser = function(user) {
    window.currentUser = user;
    if (user) {
        sessionStorage.setItem('nexus_user', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('nexus_user');
    }
    if (window.updateLoginButton) window.updateLoginButton();
};

window.loadUserFromSession = function() {
    const saved = sessionStorage.getItem('nexus_user');
    if (saved) {
        try {
            window.currentUser = JSON.parse(saved);
            if (window.updateLoginButton) window.updateLoginButton();
            return window.currentUser;
        } catch(e) {}
    }
    return null;
};

window.loginUser = async function(login, password) {
    const testUser = (window.USERS || []).find(u => u.login === login && u.password === password);
    if (testUser) {
        window.setCurrentUser(testUser);
        if (window.logActivity) window.logActivity('/login', 'Logowanie', 'Sukces');
        window.showNotification('Zalogowano pomyślnie!', 'success');
        return { success: true, user: testUser };
    }
    
    try {
        if (window.db) {
            const usersRef = window.db.collection('users');
            const snapshot = await usersRef.where('login', '==', login).get();
            
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();
                if (window.auth) {
                    await window.auth.signInWithEmailAndPassword(userData.email, password);
                    const user = { login: userData.login, email: userData.email, role: userData.role, uid: userData.uid };
                    window.setCurrentUser(user);
                    if (window.logActivity) window.logActivity('/login', 'Logowanie', 'Sukces');
                    window.showNotification('Zalogowano pomyślnie!', 'success');
                    return { success: true, user: user };
                }
            }
        }
        
        if (window.logActivity) window.logActivity('/login', 'Logowanie', 'Błąd');
        return { success: false, error: 'Błędny login lub hasło' };
    } catch (error) {
        console.error('Błąd logowania:', error);
        if (window.logActivity) window.logActivity('/login', 'Logowanie', 'Błąd');
        return { success: false, error: error.message };
    }
};

window.registerUser = async function(username, email, password) {
    try {
        if (window.db) {
            const usersRef = window.db.collection('users');
            const snapshot = await usersRef.where('login', '==', username).get();
            
            if (!snapshot.empty) {
                return { success: false, error: 'Ta nazwa użytkownika jest zajęta' };
            }
            
            if (window.auth) {
                const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                await window.db.collection('users').add({
                    login: username,
                    email: email,
                    role: 'user',
                    uid: user.uid,
                    createdAt: new Date().toLocaleString('pl-PL')
                });
                
                const newUser = { login: username, email: email, role: 'user', uid: user.uid };
                window.setCurrentUser(newUser);
                if (window.logActivity) window.logActivity('/register', 'Rejestracja', 'Sukces');
                window.showNotification('Konto utworzone!', 'success');
                return { success: true, user: newUser };
            }
        }
        return { success: false, error: 'Firebase nie jest dostępny' };
    } catch (error) {
        console.error('Błąd rejestracji:', error);
        return { success: false, error: error.message };
    }
};

window.logoutUser = async function() {
    try { if (window.auth) await window.auth.signOut(); } catch(e) {}
    window.setCurrentUser(null);
    window.showNotification('Wylogowano', 'success');
    return { success: true };
};

window.updateLoginButton = function() {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    if (window.currentUser) {
        btn.textContent = window.currentUser.role === 'admin' ? 'ADMIN PANEL' : 'MOJE KONTO';
    } else {
        btn.textContent = 'LOGIN';
    }
};

window.handleLoginClick = function() {
    if (window.currentUser) {
        window.showPage(window.currentUser.role === 'admin' ? 'admin' : 'account');
    } else {
        document.getElementById('login-modal').classList.add('active');
    }
};

window.openLogin = function() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('login-error').style.display = 'none';
};

window.closeLogin = function() {
    document.getElementById('login-modal').classList.remove('active');
};

window.switchToRegister = function() {
    window.closeLogin();
    document.getElementById('register-modal').classList.add('active');
};

window.switchToLogin = function() {
    document.getElementById('register-modal').classList.remove('active');
    window.openLogin();
};

window.closeRegister = function() {
    document.getElementById('register-modal').classList.remove('active');
};

// Event listener dla formularza logowania
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('login-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const login = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        if (!login || !password) {
            document.getElementById('login-error').textContent = 'Uzupełnij wszystkie pola';
            document.getElementById('login-error').style.display = 'block';
            return;
        }
        const result = await window.loginUser(login, password);
        if (result.success) {
            document.getElementById('login-modal').classList.remove('active');
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            window.showPage(result.user.role === 'admin' ? 'admin' : 'account');
        } else {
            document.getElementById('login-error').textContent = result.error || 'Błędny login lub hasło';
            document.getElementById('login-error').style.display = 'block';
        }
    });

    document.getElementById('register-form')?.addEventListener('submit', async function(e) {
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
        const result = await window.registerUser(username, email, password);
        if (result.success) {
            document.getElementById('register-modal').classList.remove('active');
            document.getElementById('register-username').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            window.showPage('account');
        } else {
            document.getElementById('register-error').textContent = result.error || 'Błąd rejestracji';
            document.getElementById('register-error').style.display = 'block';
        }
    });
});

console.log('✅ Auth - załadowane');