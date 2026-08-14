// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqgO4C_O5pKoNajDmoUcGIkzpx5-6hn-0",
  authDomain: "rnandes-92ba4.firebaseapp.com",
  databaseURL: "https://rnandes-92ba4-default-rtdb.firebaseio.com",
  projectId: "rnandes-92ba4",
  storageBucket: "rnandes-92ba4.firebasestorage.app",
  messagingSenderId: "903603910375",
  appId: "1:903603910375:web:cf5a90fbf9fc152e739442",
  measurementId: "G-4JVS8QQ5TC"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
window.db = db;