import "./App.css";

import { useState } from "react";
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import {
  getFirestore,
  collection,
  query,
  limit,
  addDoc,
  serverTimestamp,
  where,
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
const postsRef = collection(db, "posts");

type User = {
  uid: String;
  photoURL: String;
  displayName: String;
};

type Uid = {
  uid: String | undefined;
};

function App() {
  const [user] = useAuthState(auth);
  const [newPost, setNewPost] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [display, setDisplay] = useState("home");
  const [profileId, setProfileId] = useState<String>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (image) {
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

  function showProfile(user: String) {
    setProfileId(user);
    setDisplay("profile");
  }

  return (
    <>
      <header>
        <h1 onClick={() => setDisplay("home")}>Cosmo</h1>
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
      {display == "home" && (
        <>
          <form className="new-post" onSubmit={submit}>
            <button onClick={() => setNewPost((prev) => !prev)} type="button">
              New Post
            </button>
            {newPost && (
              <input
                type="file"
                accept="image/*"
                onChange={(e: any) => {
                  setImage(e.target.files[0]);
                }}
              ></input>
            )}
            <button type="submit">Submit</button>
          </form>
          <Gallery showProfile={showProfile} />
        </>
      )}
      {display == "profile" && user && (
        <>
          <Profile uid={profileId} showProfile={showProfile} />
        </>
      )}
    </>
  );
}

function Gallery({ showProfile }: any) {
  const q = query(postsRef, limit(3));
  const [posts, loading, error] = useCollection(q);

  return (
    <>
      <h1>All Posts</h1>
      {error && <h2>Error: {JSON.stringify(error)}</h2>}
      {loading && <h2>Loading...</h2>}
      <div className="gallery">
        {posts &&
          posts.docs.map((post) => (
            <Post key={post.id} post={post.data()} showProfile={showProfile} />
          ))}
      </div>
    </>
  );
}
// From post collection on firestore
function Post({ post, showProfile }: any) {
  return (
    <>
      <div className="post">
        <div className="author">
          <img src={post.photoURL} className="profile-pic"></img>
          <p className="username" onClick={() => showProfile(post.uid)}>
            {post.displayName}
          </p>
        </div>
        <img className="post-image" src={post.postUrl}></img>
      </div>
    </>
  );
}

function Profile({ uid, showProfile }: any) {
  //make a query for all posts
  const q = query(postsRef, where("uid", "==", uid), limit(10));
  const [posts, loading, error] = useCollection(q);

  return (
    <>
      <h1>User Profile</h1>
      <p>{uid}</p>
      {error && <h2>Error: {JSON.stringify(error)}</h2>}
      {loading && <h2>Loading...</h2>}
      {posts &&
        posts.docs.map((post) => (
          <Post key={post.id} post={post.data()} showProfile={showProfile} />
        ))}
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
