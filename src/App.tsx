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
  orderBy,
} from "firebase/firestore";
import { v4 } from "uuid";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

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

function App() {
  const [user] = useAuthState(auth);
  const [newPost, setNewPost] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [display, setDisplay] = useState("home");
  const [profileId, setProfileId] = useState<String>("");
  const [text, setText] = useState("");

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
            text: text,
            photoURL,
            displayName,
            postUrl: url,
            createdAt: serverTimestamp(),
          }).then(() => {
            console.log("post created");
            setImage(null);
            setNewPost(false);
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
        <div>{user ? <SignOut /> : <SignIn />}</div>
      </header>

      {display == "home" && (
        <>
          <form id="submit-form" onSubmit={submit}>
            <button
              id="new-post-button"
              onClick={() => setNewPost((prev) => !prev)}
              type="button"
            >
              <FontAwesomeIcon
                icon={faPlus}
                className={newPost ? "icon rotate" : "icon"}
              />
            </button>
            {newPost && (
              <div className="new-post">
                <h2>Create a new post</h2>
                <p>Image</p>
                <input
                  type="file"
                  id="image-input"
                  accept="image/*"
                  onChange={(e: any) => {
                    setImage(e.target.files[0]);
                  }}
                ></input>
                <img
                  id="preview"
                  src={image ? window.URL.createObjectURL(image) : undefined}
                ></img>
                <h2>Text</h2>
                <textarea
                  id="text-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="text..."
                ></textarea>
                <button id="submit-button" type="submit">
                  Submit
                </button>
              </div>
            )}
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
  const q = query(postsRef, limit(5), orderBy("createdAt", "desc"));
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
//from post collection on firestore
function Post({ post, showProfile }: any) {
  return (
    <>
      <div className="post">
        <div className="author" onClick={() => showProfile(post.uid)}>
          <img src={post.photoURL} className="profile-pic"></img>
          <p className="username">{post.displayName}</p>
        </div>
        <img className="post-image" src={post.postUrl}></img>
        {post.text && <p>{post.text}</p>}
      </div>
    </>
  );
}

function Profile({ uid, showProfile }: any) {
  //make a query for all posts
  const q = query(
    postsRef,
    where("uid", "==", uid),
    limit(10),
    orderBy("createdAt", "desc")
  );
  const [posts, loading, error] = useCollection(q);

  return (
    <>
      <h1>User Profile</h1>
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
