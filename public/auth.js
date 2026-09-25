// Firebase Configuration (Uses existing Firebase project)
const firebaseConfig = {
    apiKey: "AIzaSyBYPJ6WyrRKfwcFLFfr08fWpAn6k_SpFOQ",
    authDomain: "css-r-ai.firebaseapp.com",
    projectId: "css-r-ai",
    storageBucket: "css-r-ai.firebasestorage.app",
    messagingSenderId: "36856277755",
    appId: "1:36856277755:web:0ba75849a285deb61f9e5e"
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
        box.innerHTML = msg; // Allows HTML formatting like <strong>
        box.className = `auth-message ${type}`;
    }
}

function clearMessage() {
    const box = document.getElementById('authMessage');
    if (box) {
        box.style.display = 'none';
        box.innerHTML = '';
    }
}

// Helper to save missing user profile to Firestore
async function ensureUserProfileExists(user) {
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
}

// Handle Google Redirect Result on Page Load (Fallback mechanism)
document.addEventListener("DOMContentLoaded", () => {
    auth.getRedirectResult().then(async (result) => {
        if (result && result.user) {
            await ensureUserProfileExists(result.user);
            showMessage("Google sign-in successful! Redirecting...", "success");
            setTimeout(() => window.location.href = '/ai', 1000);
        }
    }).catch((error) => {
        if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/credential-already-in-use") {
            console.log("Redirect info: " + error.message);
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

            showMessage("Account created! A verification link was sent to your email. <strong>Check your Inbox & Spam folder</strong> before logging in.", "success");
            await auth.signOut();

            // Switch back to login mode after 4 seconds so they can read the notification
            setTimeout(() => switchTab('login'), 4000);

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
                    showMessage("Your email is not verified yet. A new link has been sent. <strong>Please check your Inbox & Spam folder</strong>.", "error");
                } else {
                    showMessage("Your email is not verified yet. <strong>Check your Inbox & Spam folder</strong> for the verification link.", "error");
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

// Handle Google Sign-In with Popup (With Redirect Fallback)
async function handleGoogleSignIn() {
    clearMessage();
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await auth.signInWithPopup(provider);
        if (result.user) {
            await ensureUserProfileExists(result.user);
            showMessage("Google sign-in successful! Redirecting...", "success");
            setTimeout(() => window.location.href = '/ai', 1000);
        }
    } catch (error) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
            // Fallback to redirect if popups are blocked on mobile browser
            auth.signInWithRedirect(provider);
        } else if (error.code !== "auth/popup-closed-by-user") {
            showMessage("Google Sign-In Error: " + error.message, "error");
        }
    }
}
