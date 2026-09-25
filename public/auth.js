// Firebase Configuration (Uses existing Firebase project initialized on backend/frontend)
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "css-r-ai.firebaseapp.com",
    projectId: "css-r-ai",
    storageBucket: "css-r-ai.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

let currentMode = 'login'; // 'login' or 'signup'

function switchTab(mode) {
    currentMode = mode;
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const signupFields = document.getElementById('signupFields');
    const submitBtn = document.getElementById('submitBtn');
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');

    clearMessage();

    if (mode === 'signup') {
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
        signupFields.style.display = 'block';
        submitBtn.textContent = 'Create Account';
        formTitle.textContent = 'Join CSS-R Digital';
        formSubtitle.textContent = 'Create your account to start learning';
    } else {
        signupTab.classList.remove('active');
        loginTab.classList.add('active');
        signupFields.style.display = 'none';
        submitBtn.textContent = 'Sign In';
        formTitle.textContent = 'Welcome Back';
        formSubtitle.textContent = 'Sign in to access your personal CSS-R AI portal';
    }
}

function showMessage(msg, type) {
    const box = document.getElementById('authMessage');
    box.textContent = msg;
    box.className = `auth-message ${type}`;
}

function clearMessage() {
    const box = document.getElementById('authMessage');
    box.style.display = 'none';
    box.textContent = '';
}

// Handle Form Submit (Email / Password)
async function handleAuth(event) {
    event.preventDefault();
    clearMessage();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (currentMode === 'signup') {
        const fullName = document.getElementById('fullName').value.trim();
        const studentClass = document.getElementById('studentClass').value;

        if (!fullName) {
            showMessage("Please enter your full name.", "error");
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Save user profile to Firestore
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                name: fullName,
                class: studentClass,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showMessage("Account created successfully! Redirecting...", "success");
            setTimeout(() => window.location.href = '/ai', 1200);

        } catch (error) {
            showMessage(error.message, "error");
        }

    } else { // Login Mode
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showMessage("Login successful! Redirecting...", "success");
            setTimeout(() => window.location.href = '/ai', 1000);
        } catch (error) {
            showMessage(error.message, "error");
        }
    }
}

// Handle Google Sign-In
async function handleGoogleSignIn() {
    clearMessage();
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        // Check if user record exists in Firestore, if not create one
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                name: user.displayName || 'CSS-R Student',
                class: 'Student',
                email: user.email,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        showMessage("Google sign-in successful! Redirecting...", "success");
        setTimeout(() => window.location.href = '/ai', 1000);

    } catch (error) {
        showMessage(error.message, "error");
    }
}
