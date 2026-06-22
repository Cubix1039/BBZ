import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, remove, onValue, update, push } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD4TC6jnYlKjMw2Ot9VcHh0QGmoZdhIU48",
  authDomain: "amareshprj-msn.firebaseapp.com",
  projectId: "amareshprj-msn",
  storageBucket: "amareshprj-msn.firebasestorage.app",
  messagingSenderId: "96424898401",
  appId: "1:96424898401:web:ffd28c271d11c95f719f20",
  measurementId: "G-TNRTBJEXWK",
  databaseURL: "https://amareshprj-msn-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db, ref, set, get, child, remove, onValue, update, push, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword };