import "./App.css";

import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";

// Initialize Firebase
const app = initializeApp(JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG));

const auth = getAuth();

function App() {
  return (
    <>
      <h1>Cosmo</h1>
      <h3>Welcome, user</h3>
    </>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };
  return <button onClick={signInWithGoogle}>Sign in with Google</button>;
}

function SignOut() {
  return <button onClick={() => auth.signOut()}>Sign Out</button>;
}

export default App;
