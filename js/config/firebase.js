// ============================================
//   FIREBASE - KONFIGURACJA
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyB7kgCifJsbmaaEfzg0APYf4DMQlf9ygO0",
    authDomain: "test-34119.firebaseapp.com",
    projectId: "test-34119",
    storageBucket: "test-34119.firebasestorage.app",
    messagingSenderId: "873426093218",
    appId: "1:873426093218:web:ec29ac10c8aa67d72f03fb",
    measurementId: "G-4YJJ291J8D"
};

// Inicjalizacja Firebase (jeśli nie została już zainicjalizowana)
if (typeof firebase !== 'undefined' && (!firebase.apps || firebase.apps.length === 0)) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase zainicjalizowany');
}

// Globalne zmienne dla innych plików
window.db = firebase.firestore();
window.auth = firebase.auth();

console.log('✅ Firebase - konfiguracja załadowana');