import "./App.css";
import person from "./assets/person.svg";

import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import {
  getFirestore,
  collection,
  query,
  limit,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { v4 } from "uuid";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faHeart as faHeartSolid,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";

//to handle files
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

// Initialize Firebase
const app = initializeApp(JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG));

const auth = getAuth();
const db = getFirestore(app);
//Create root and collection references
const storage = getStorage();
const postsRef = collection(db, "posts");
const usersRef = collection(db, "users");

type User = {
  uid: string;
  photoURL: string;
  displayName: string;
};

function getUserInfo() {
  let uid = "";
  let displayName = "";
  let photoURL = "";
  if (auth.currentUser) {
    uid = auth.currentUser.uid;
    displayName = auth.currentUser.displayName as string;
    photoURL = auth.currentUser.photoURL as string;
  }
  const result = {
    uid,
    displayName,
    photoURL,
  };
  return result;
}

function App() {
  const [user] = useAuthState(auth);
  const [newPost, setNewPost] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [display, setDisplay] = useState("home");
  const [profileId, setProfileId] = useState<String>("");
  const [text, setText] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserOptions, setShowUserOptions] = useState(false);
  const [currentUser, setCurrentUser] = useState(getUserInfo());
  const [newUsername, setNewName] = useState("");
  const [newUserInfo, setNewUserInfo] = useState("hola :D");

  useEffect(() => {
    setCurrentUser(getUserInfo());
  }, [user]);

  if (false) {
    useEffect(() => {
      //on sign in
      const { uid } = auth.currentUser as User;
      const userRef = doc(usersRef, uid);

      async function checkUserData() {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().hasOwnProperty("username")) {
          return true;
        } else {
          return false;
        }
      }
      //check if user has a username

      //if not ask to get a new one that doesn't exist yet
      //user collection:
      // uid, profile pic, follow list
    }, []);
  }

  function changeUsername() {}

  async function handleChangeUsername(newUsername: string) {
    //on every change
    setNewName(newUsername);
    //check if username available
    const q = query(usersRef, where("displayName", "==", newUsername));
    setNewUserInfo("Loading...");
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      setNewUserInfo("This username is already taken!");
    } else {
      setNewUserInfo(newUsername + " is a valid username!");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (image) {
      const storageRef = ref(storage, `posts/${image?.name + v4()}`);
      //upload file
      uploadBytes(storageRef, image as File).then(() => {
        console.log("file uploaded!");
        //save post to firebase
        const { uid, photoURL, displayName } = currentUser;
        getDownloadURL(storageRef).then((url) => {
          addDoc(postsRef, {
            uid,
            text: text,
            photoURL,
            displayName,
            postUrl: url,
            createdAt: serverTimestamp(),
            likedBy: [],
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
        <div onClick={() => setDisplay("home")} id="logo">
          <h1>Cosmo</h1>
          <h1 id="star">✦</h1>
        </div>
        <div id="menu">
          <img
            src={person}
            alt="person"
            onClick={() => {
              setShowUserMenu((prev) => !prev);
            }}
          ></img>
        </div>
      </header>
      {showUserMenu && (
        <div id="dropdown-menu">
          <div>{user ? <SignOut /> : <SignIn />}</div>
          <button>Profile</button>
          <button
            onClick={() => {
              setShowUserOptions(true);
            }}
          >
            Account Options
          </button>
        </div>
      )}
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
          <Gallery showProfile={showProfile} user={user} />
        </>
      )}
      {showUserOptions && user && (
        <div id="user">
          <form>
            <button
              type="button"
              onClick={() => {
                setShowUserOptions(false);
              }}
            >
              close
            </button>
            <h1>Hello</h1>
            <h2>Here you can change your user option</h2>
            <p>Current username: {user.displayName}</p>
            <p>Current username: {currentUser.displayName}</p>
            <p>New username:</p>
            <input
              id="new-username"
              value={newUsername}
              onChange={(e) => handleChangeUsername(e.target.value)}
            ></input>
            <p style={{ color: "blue" }}>{newUserInfo}</p>
            <button>Submit!</button>
          </form>
        </div>
      )}
      {display == "profile" && user && (
        <>
          <Profile uid={profileId} showProfile={showProfile} />
        </>
      )}
    </>
  );
}

function Gallery({ showProfile, user }: any) {
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
            <Post
              key={post.id}
              post={post.data()}
              showProfile={showProfile}
              user={user}
              postId={post.id}
            />
          ))}
      </div>
    </>
  );
}

function Post({ post, showProfile, user, postId }: any) {
  const [likedBy, setLikedBy] = useState(post.likedBy);
  const [text, setText] = useState(post.text?.slice(0, 237));
  const [showAll, setShowAll] = useState(false);
  const uid = auth.currentUser?.uid;

  function showMore() {
    setShowAll(true);
    setText(post.text);
  }

  async function likePost() {
    const postRef = doc(postsRef, postId);

    //if user is in the list
    if (post.likedBy.includes(uid)) {
      //unlike post
      const updatedList = post.likedBy.filter((id: String) => id != uid);
      await updateDoc(postRef, {
        likedBy: updatedList,
      }).then(() => setLikedBy(updatedList));
    } else {
      //like post
      const updatedList = post.likedBy;
      updatedList.push(uid);
      await updateDoc(postRef, {
        likedBy: updatedList,
      }).then(() => setLikedBy(updatedList));
    }
  }
  return (
    <>
      <div className="post">
        <div className="author" onClick={() => showProfile(post.uid)}>
          <img src={post.photoURL} className="profile-pic"></img>
          <p className="username">{post.displayName}</p>
          <button className="follow">Follow</button>
        </div>
        <img className="post-image" src={post.postUrl}></img>
        {post.text && post.text.length < 137 ? (
          <p className="post-text">{post.text}</p>
        ) : (
          <>
            {post.text && (
              <p className="post-text">
                {text}
                {!showAll && (
                  <p className="show-more" onClick={showMore}>
                    ...more
                  </p>
                )}
              </p>
            )}
          </>
        )}
        <div id="like">
          {user ? (
            <FontAwesomeIcon
              className={likedBy.includes(uid) ? "heart pulse" : "heart"}
              onClick={likePost}
              icon={likedBy.includes(uid) ? faHeartSolid : faHeartRegular}
            />
          ) : (
            <FontAwesomeIcon
              className="heart"
              onClick={likePost}
              icon={faHeartRegular}
            />
          )}
          <p>{post.likedBy.length}</p>
        </div>
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
    signInWithPopup(auth, provider).then(() => {
      const { uid, photoURL, displayName } = auth.currentUser as User;
      const q = query(usersRef, where("uid", "==", uid));
      async function checkUserData() {
        const userSnap = await getDocs(q);
        //after sign in check if user is in the user collection, otherwise create a
        //new user
        if (userSnap.empty) {
          addDoc(usersRef, {
            uid,
            photoURL,
            displayName,
            followList: [],
          });
        }
      }
      checkUserData();
    });
  };
  return <button onClick={signInWithGoogle}>Sign in with Google</button>;
}

function SignOut() {
  return <button onClick={() => auth.signOut()}>Sign Out</button>;
}

export default App;
