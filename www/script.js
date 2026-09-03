import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// --- INIT ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loader = document.getElementById('loader');
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');

// --- AUTH LISTENER ---
onAuthStateChanged(auth, (user) => {
    loader.style.display = 'none';
    if (user) {
        document.getElementById('userEmailDisplay').textContent = user.email;
        loginScreen.style.display = 'none';
        appScreen.style.display = 'block';
    } else {
        loginScreen.style.display = 'flex';
        appScreen.style.display = 'none';
    }
});

// --- EMAIL LOGIN LOGIC ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('auth-error');
    
    errorEl.textContent = "চেষ্টা করা হচ্ছে...";

    try {
        // প্রথমে লগইন করার চেষ্টা করবে
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (loginError) {
        // যদি একাউন্ট না থাকে, তাহলে নতুন একাউন্ট খুলবে (প্রথমবারের জন্য)
        if(loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
             try {
                 await createUserWithEmailAndPassword(auth, email, pass);
                 alert("নতুন অ্যাকাউন্ট তৈরি হয়েছে এবং লগইন হয়েছে!");
             } catch (createError) {
                 errorEl.textContent = "Error: " + createError.message;
             }
        } else {
            errorEl.textContent = "Error: " + loginError.message;
        }
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));


// --- BUSINESS LOGIC (Same as before) ---
// Tabs
document.querySelectorAll('.tab-link').forEach(t => t.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(e.target.dataset.tab).classList.add('active');
}));

// Add Customer
document.getElementById('addCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newCustomerName').value;
    const phone = document.getElementById('newCustomerPhone').value;
    try {
        const ref = doc(db, 'customers', phone);
        const snap = await getDoc(ref);
        if (snap.exists()) { alert("এই নম্বরটি আগেই আছে!"); return; }
        await setDoc(ref, { name, phone, totalShopping: 0, discountEligible: false, shoppingHistory: [] });
        alert("সফলভাবে যোগ হয়েছে!");
        e.target.reset();
    } catch (err) { alert(err.message); }
});

// Search
let currentPhone = null;
document.getElementById('searchBtn').addEventListener('click', async () => {
    const phone = document.getElementById('searchInput').value;
    if(!phone) return;
    try {
        const snap = await getDoc(doc(db, 'customers', phone));
        if (snap.exists()) {
            currentPhone = phone;
            const data = snap.data();
            document.getElementById('customerName').textContent = data.name;
            document.getElementById('customerPhone').textContent = data.phone;
            document.getElementById('customerPoints').textContent = data.totalShopping;
            document.getElementById('statusBadge').textContent = data.discountEligible ? "✅ ডিসকাউন্ট পাবে" : `❌ ${5000 - data.totalShopping} বাকি`;
            
            const list = document.getElementById('historyList');
            list.innerHTML = "";
            (data.shoppingHistory || []).reverse().forEach(h => {
               list.innerHTML += `<li>${h.amount} Tk</li>`;
            });
            document.getElementById('search-result').style.display = 'block';
        } else {
            alert("পাওয়া যায়নি");
        }
    } catch (err) { alert(err.message); }
});

// Shopping Logic
const modal = document.getElementById('shoppingModal');
document.getElementById('addShoppingBtn').addEventListener('click', () => modal.classList.add('active'));
document.querySelector('.close-btn').addEventListener('click', () => modal.classList.remove('active'));

document.getElementById('addShoppingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('shoppingAmount').value);
    try {
        const ref = doc(db, 'customers', currentPhone);
        const snap = await getDoc(ref);
        const data = snap.data();
        let newTotal = data.totalShopping, newEligible = data.discountEligible;

        if (newEligible) {
            alert(`ডিসকাউন্ট! ${amount * 0.20} টাকা ছাড়।`);
            newTotal = amount; 
            newEligible = (newTotal >= 5000);
        } else {
            newTotal += amount;
            if (newTotal >= 5000) { alert("৫০০০ পয়েন্ট পূর্ণ হয়েছে!"); newEligible = true; }
        }

        await updateDoc(ref, {
            totalShopping: newTotal,
            discountEligible: newEligible,
            shoppingHistory: arrayUnion({ amount: amount })
        });
        alert("সেভ হয়েছে!");
        modal.classList.remove('active');
        e.target.reset();
        document.getElementById('searchBtn').click();
    } catch (err) { alert(err.message); }
});