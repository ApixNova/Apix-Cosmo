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
  updateDoc,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  arrayUnion,
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

const usernameStructure: User = {
  uid: "",
  photoURL: "",
  displayName: "",
  docId: "",
  followList: [],
};

async function getUserInfo(id: string) {
  let uid = id;
  let displayName = "";
  let photoURL = "";
  let docId = "";
  let followList: string[] = [];
  if (id) {
    const q = query(usersRef, where("uid", "==", id));
    await getDocs(q).then((userInfo) => {
      displayName = userInfo.docs[0].data().displayName;
      photoURL = userInfo.docs[0].data().photoURL;
      followList = userInfo.docs[0].data().followList;
      docId = userInfo.docs[0].id;
    });
  }
  return {
    uid,
    displayName,
    photoURL,
    followList,
    docId,
  };
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
  const [currentUser, setCurrentUser] = useState(usernameStructure);
  const [newUsername, setNewName] = useState("");
  //filter for the gallery: "all" or "follow"
  const [filter, setFilter] = useState("all");
  const [newUserInfo, setNewUserInfo] = useState({
    state: "false",
    value: "",
  });
  const [showAlert, setShowAlert] = useState({
    showAlert: false,
    alertMessage: "",
  });

  function updateUser() {
    if (user) {
      getUserInfo(auth.currentUser!.uid).then((result) => {
        setCurrentUser(result);
      });
    }
  }

  useEffect(() => {
    updateUser();
  }, [user]);

  async function changeUsername(e: React.FormEvent) {
    e.preventDefault();
    //if new username valid
    if (newUserInfo.state == "true") {
      //update the users collection
      const q = query(
        usersRef,
        where("displayName", "==", currentUser.displayName)
      );

      //DEBUG
      console.log("getDocs called");
      const snapshot = await getDocs(q);
      const newUserRef = doc(db, "users", snapshot.docs[0].id);
      //DEBUG
      console.log("updateDoc called");
      await updateDoc(newUserRef, {
        displayName: newUsername,
      }).then(() => {
        updateUser();
        setNewUserInfo({
          state: "success",
          value: newUsername + " is your new username",
        });
      });
    }
  }

  async function handleChangeUsername(newUsername: string) {
    setNewName(newUsername);
    //on every change
    //check if username available
    const q = query(usersRef, where("displayName", "==", newUsername));
    setNewUserInfo({ state: "false", value: "loading..." });
    //DEBUG
    console.log("getDocs called (to check username availability");
    const snapshot = await getDocs(q);
    if (newUsername == "") {
      setNewUserInfo({
        state: "false",
        value: "invalid username",
      });
    } else if (!snapshot.empty) {
      setNewUserInfo({
        state: "false",
        value: "This username is already taken",
      });
    } else {
      setNewUserInfo({
        state: "true",
        value: newUsername + " is a valid username",
      });
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
          //DEBUG
          console.log("addDoc called");
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
      <div className="toggle">
        <button
          className={(filter == "all" ? "" : " selected") + " toggle-btn left"}
          onClick={() => setFilter("follow")}
        >
          Follow List
        </button>
        <button
          className={(filter == "all" ? " selected" : "") + " toggle-btn right"}
          onClick={() => setFilter("all")}
        >
          All Posts
        </button>
      </div>
      {showAlert.showAlert && (
        <div className="alert">
          <button
            className="close-btn"
            onClick={() =>
              setShowAlert((prev) => ({ ...prev, showAlert: false }))
            }
          >
            <FontAwesomeIcon className="close" icon={faPlus} />
          </button>
          <p>{showAlert.alertMessage}</p>
        </div>
      )}
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
          <Gallery
            showProfile={showProfile}
            user={user}
            currentUser={currentUser}
            updateUser={updateUser}
            setShowAlert={setShowAlert}
            filter={filter}
          />
        </>
      )}
      {showUserOptions && user && (
        <div id="user">
          <button
            type="button"
            className="close-btn"
            onClick={() => {
              setShowUserOptions(false);
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="close" />
          </button>
          <form onSubmit={changeUsername}>
            <h1>User Options</h1>
            <p>
              Current username:{" "}
              <span className="valid">{currentUser.displayName}</span>
            </p>
            <input
              id="new-username"
              value={newUsername}
              placeholder="New Username"
              onChange={(e) => handleChangeUsername(e.target.value)}
            ></input>
            <p
              className={
                newUserInfo.state == "true"
                  ? "valid"
                  : newUserInfo.state == "false"
                  ? "invalid"
                  : "success"
              }
            >
              {newUserInfo.value}
            </p>
            <button className="submit-btn">Submit</button>
          </form>
        </div>
      )}
      {display == "profile" && (
        <>
          <Profile
            uid={profileId}
            showProfile={showProfile}
            user={user}
            currentUser={currentUser}
            updateUser={updateUser}
            setShowAlert={setShowAlert}
          />
        </>
      )}
    </>
  );
}

function Gallery({
  showProfile,
  user,
  currentUser,
  updateUser,
  setShowAlert,
  filter,
}: any) {
  function getQuery() {
    if (filter == "follow") {
      return query(
        postsRef,
        limit(3),
        orderBy("createdAt", "desc"),
        where("uid", "in", currentUser.followList)
      );
    } else {
      return query(postsRef, limit(3), orderBy("createdAt", "desc"));
    }
  }
  const [posts, loading, error] = useCollection(getQuery());
  return (
    <>
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
              currentUser={currentUser}
              updateUser={updateUser}
              setShowAlert={setShowAlert}
            />
          ))}
      </div>
    </>
  );
}

function Post({
  post,
  showProfile,
  user,
  postId,
  currentUser,
  updateUser,
  setShowAlert,
}: any) {
  const [likedBy, setLikedBy] = useState(post.likedBy);
  const [text, setText] = useState(post.text?.slice(0, 237));
  const [showAll, setShowAll] = useState(false);
  const [author, setAuthor] = useState(usernameStructure);
  const uid = auth.currentUser?.uid;

  //get user info on mount:
  useEffect(() => {
    getUserInfo(post.uid).then((result) => {
      setAuthor(result);
    });
  }, []);

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
      //DEBUG
      console.log("updateDoc called");
      await updateDoc(postRef, {
        likedBy: updatedList,
      }).then(() => setLikedBy(updatedList));
    } else {
      //like post
      const updatedList = post.likedBy;
      updatedList.push(uid);
      //DEBUG
      console.log("updateDoc called");
      await updateDoc(postRef, {
        likedBy: updatedList,
      }).then(() => setLikedBy(updatedList));
    }
  }
  async function followUser() {
    //update user collection and change followList
    const newUserRef = doc(db, "users", currentUser.docId);
    //DEBUG
    console.log("updateDoc called");
    updateDoc(newUserRef, {
      followList: arrayUnion(post.uid),
    }).then(() => updateUser());
  }
  function handleFollow() {
    if (user) {
      followUser();
    } else {
      setShowAlert({
        showAlert: true,
        alertMessage: "You need to be logged in to follow a user",
      });
    }
  }
  function isFollowed() {
    return currentUser.followList.includes(post.uid);
  }
  return (
    <>
      <div className="post">
        <div className="author">
          <div className="show-profile" onClick={() => showProfile(post.uid)}>
            <img src={author.photoURL} className="profile-pic"></img>
            <p className="username">{author.displayName}</p>
          </div>
          {!isFollowed() && (
            <button className="follow" onClick={handleFollow}>
              Follow
            </button>
          )}
        </div>
        <img className="post-image" src={post.postUrl}></img>
        {post.text && post.text.length < 237 ? (
          <p className="post-text">{post.text}</p>
        ) : (
          <>
            {post.text && (
              <div className="post-text">
                <p>
                  {text}
                  {!showAll && (
                    <span className="show-more" onClick={showMore}>
                      ...more
                    </span>
                  )}
                </p>
              </div>
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
              onClick={() =>
                setShowAlert({
                  showAlert: true,
                  alertMessage: "You need to be logged in to like a post",
                })
              }
              icon={faHeartRegular}
            />
          )}
          <p>{post.likedBy.length}</p>
        </div>
      </div>
    </>
  );
}

function Profile({
  uid,
  showProfile,
  user,
  currentUser,
  updateUser,
  setShowAlert,
}: any) {
  const [userInfo, setUserInfo] = useState(usernameStructure);
  //make a query for all posts
  const q = query(
    postsRef,
    where("uid", "==", uid),
    limit(3),
    orderBy("createdAt", "desc")
  );
  const [posts, loading, error] = useCollection(q);
  getUserInfo(uid).then((result) => {
    setUserInfo(result);
  });

  return (
    <>
      <h1>{userInfo.displayName}'s profile</h1>
      {error && <h2>Error: can't load content</h2>}
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
              currentUser={currentUser}
              updateUser={updateUser}
              setShowAlert={setShowAlert}
            />
          ))}
      </div>
    </>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).then(() => {
      const { uid, photoURL, displayName } = auth.currentUser as UserLogin;
      const q = query(usersRef, where("uid", "==", uid));
      async function checkUserData() {
        //DEBUG
        console.log("getDocs called (checkUserData)");
        const userSnap = await getDocs(q);
        //after sign in check if user is in the user collection, otherwise create a
        //new user
        if (userSnap.empty) {
          //DEBUG
          console.log("addDoc called");
          addDoc(usersRef, {
            uid,
            photoURL,
            displayName,
            followList: [],
          });
        } else {
          console.log("user already in db");
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
