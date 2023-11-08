import "./App.css";

import { useState } from "react";
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { useAuthState } from 'react-firebase-hooks/auth'
import { 
  getFirestore,
  collection,
  query,
  limit,
  orderBy
} from "firebase/firestore";

// Initialize Firebase
const app = initializeApp(JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG));
const auth = getAuth();
const db = getFirestore(app)

type User = {
  uid: String;
  photoURL: String;
  displayName: String;
}

function App() {
  const [user] = useAuthState(auth)
  const [newPost, useNewPost] = useState(false)

 async function submit(e:React.FormEvent) {
  e.preventDefault()
 // const { uid, photoURL, displayName } = auth.currentUser as User;
 // if (formValue != undefined)
 console.log(e)
 }
  
  return (
    <>
    <header>
      <h1>Cosmo</h1>
    </header>
    <div>{user ? (
    <div className="welcome">
      <h3>Welcome, user</h3>
      <SignOut/></div>
      ) : <SignIn/> }</div>
      <form className="post" onSubmit={submit}>
        <button 
        onClick={()=>useNewPost(prev=>!prev)}
        type="button"
        >New Post</button>
        {newPost && <NewPost/>}
        <button type='submit'>Submit</button>
      </form>
    <Gallery/>
    </>
  );
}

function NewPost() {
  return (
  <>
  <input type="file" accept="image/*"></input>
  </>
  )
}

function Gallery() {
  
  const galleryRef = collection(db, "posts")
  const q = query(galleryRef, orderBy("createdAt"), limit(3))
  return(
    <>
    <h1>All Posts</h1>
    </>
  )
}
// From post collection on firestore
function Post() {
  return(<>
  <div className="post">
    <p>Author</p>
    <p>Image</p>
  </div>
    </>)
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
