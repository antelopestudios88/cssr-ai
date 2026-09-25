// Firebase Configuration (Uses existing Firebase project)
// IMPORTANT: Replace placeholder keys with your actual Firebase project keys
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

// Supported Email Domains
const ALLOWED_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "live.com", "hotmail.com"];

function validateEmailDomain(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
}

// Check if verification email should be re-sent (once every 30 days)
function shouldSendVerification(uid) {
    const lastSent = localStorage.getItem(`last_verify_sent_${uid}`);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    if (!lastSent || (Date.now() - parseInt(lastSent, 10)) > THIRTY_DAYS_MS) {
        return true;
    }
    return false;
}

// UI Tab Switcher
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
        if (loginTab) loginTab.classList.remove('active');
        if (signupTab) signupTab.classList.add('active');
        if (signupFields) signupFields.style.display = 'block';
        if (submitBtn) submitBtn.textContent = 'Create Account';
        if (formTitle) formTitle.textContent = 'Join CSS-R Digital';
        if (formSubtitle) formSubtitle.textContent = 'Create your account to start learning';
    } else {
        if (signupTab) signupTab.classList.remove('active');
        if (loginTab) loginTab.classList.add('active');
        if (signupFields) signupFields.style.display = 'none';
        if (submitBtn) submitBtn.textContent = 'Sign In';
        if (formTitle) formTitle.textContent = 'Welcome Back';
        if (formSubtitle) formSubtitle.textContent = 'Sign in to access your personal CSS-R AI portal';
    }
}

function showMessage(msg, type) {
    const box = document.getElementById('authMessage');
    if (box) {
        box.style.display = 'block';
        box.textContent = msg;
        box.className = `auth-message ${type}`;
    }
}

function clearMessage() {
    const box = document.getElementById('authMessage');
    if (box) {
        box.style.display = 'none';
        box.textContent = '';
    }
}

// Handle Google Redirect Result on Page Load
document.addEventListener("DOMContentLoaded", () => {
    auth.getRedirectResult().then(async (result) => {
        if (result && result.user) {
            const user = result.user;

            // Save user doc to Firestore if first time signing in
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
        }
    }).catch((error) => {
        if (error.code !== "auth/popup-closed-by-user") {
            showMessage("Google Sign-In Error: " + error.message, "error");
        }
    });
});

// Handle Form Submit (Email / Password)
async function handleAuth(event) {
    event.preventDefault();
    clearMessage();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!validateEmailDomain(email)) {
        showMessage("Please use a valid email address from Gmail, Yahoo, Outlook, or Live.", "error");
        return;
    }

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

            await user.updateProfile({ displayName: fullName });

            // Save user profile to Firestore
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                name: fullName,
                class: studentClass,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Send Verification Email
            await user.sendEmailVerification();
            localStorage.setItem(`last_verify_sent_${user.uid}`, Date.now().toString());

            showMessage("Account created successfully! A verification email has been sent. Please verify your email before logging in.", "success");
            await auth.signOut();
            
            // Switch back to login mode after 3 seconds
            setTimeout(() => switchTab('login'), 3000);

        } catch (error) {
            showMessage(error.message, "error");
        }

    } else { // Login Mode
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Require email verification check
            if (!user.emailVerified) {
                if (shouldSendVerification(user.uid)) {
                    await user.sendEmailVerification();
                    localStorage.setItem(`last_verify_sent_${user.uid}`, Date.now().toString());
                    showMessage("Your email is not verified yet. A new verification link has been sent to your email.", "error");
                } else {
                    showMessage("Your email is not verified yet. Please check your inbox for the verification email.", "error");
                }
                await auth.signOut();
                return;
            }

            showMessage("Login successful! Redirecting...", "success");
            setTimeout(() => window.location.href = '/ai', 1000);

        } catch (error) {
            showMessage(error.message, "error");
        }
    }
}

// Handle Google Sign-In with Redirect (Prevents about:blank on mobile webviews)
async function handleGoogleSignIn() {
    clearMessage();
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
}
