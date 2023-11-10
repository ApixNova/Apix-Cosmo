import "./App.css";

import { ChangeEvent, ChangeEventHandler, useState } from "react";
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  getFirestore,
  collection,
  query,
  limit,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { v4 } from "uuid";

//to handle files
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

// Initialize Firebase
const app = initializeApp(JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG));

const auth = getAuth();
const db = getFirestore(app);
//Create root reference
const storage = getStorage();

type User = {
  uid: String;
  photoURL: String;
  displayName: String;
};

function App() {
  const [user] = useAuthState(auth);
  const [newPost, setNewPost] = useState(false);
  const [image, setImage] = useState<File | null>(null);

  const postsRef = collection(db, "posts");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (image != null) {
      const storageRef = ref(storage, `posts/${image?.name + v4()}`);
      //upload file
      uploadBytes(storageRef, image as File).then(() => {
        console.log("file uploaded!");
        //save post to firebase
        const { uid, photoURL, displayName } = auth.currentUser as User;
        getDownloadURL(storageRef).then((url) => {
          addDoc(postsRef, {
            uid,
            photoURL,
            displayName,
            createdAt: serverTimestamp(),
            postUrl: url,
          }).then(() => {
            console.log("post created");
            setImage(null);
          });
        });
      });
    }
  }

  return (
    <>
      <header>
        <h1>Cosmo</h1>
      </header>
      <div>
        {user ? (
          <div className="welcome">
            <h3>Welcome, user</h3>
            <SignOut />
          </div>
        ) : (
          <SignIn />
        )}
      </div>
      <form className="post" onSubmit={submit}>
        <button onClick={() => setNewPost((prev) => !prev)} type="button">
          New Post
        </button>
        {newPost && (
          <input
            type="file"
            accept="image/*"
            onChange={(e: any) => {
              setImage(e.target.files[0]);
              console.log(e.target.files[0]);
            }}
          ></input>
        )}
        <button type="submit">Submit</button>
      </form>
      <Gallery />
    </>
  );
}

function Gallery() {
  const galleryRef = collection(db, "posts");
  const q = query(galleryRef, orderBy("createdAt"), limit(3));
  return (
    <>
      <h1>All Posts</h1>
    </>
  );
}
// From post collection on firestore
function Post() {
  return (
    <>
      <div className="post">
        <p>Author</p>
        <p>Image</p>
      </div>
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
