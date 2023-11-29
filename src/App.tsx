import "./App.css";
import person from "./assets/person.svg";

import { useState, useEffect, useRef, ChangeEvent } from "react";
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
  deleteDoc,
} from "firebase/firestore";
import { v4 } from "uuid";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faHeart as faHeartSolid,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";

//to handle files
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import Resizer from "react-image-file-resizer";

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

async function resizePic(
  file: File
): Promise<string | File | Blob | ProgressEvent<FileReader>> {
  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      48,
      48,
      "JPEG",
      100,
      0,
      (uri) => {
        resolve(uri);
      },
      "base64",
      20,
      20
    );
  });
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
  const [giveChoice, setGiveChoice] = useState(false);
  const [postToDelete, setPostToDelete] = useState("");
  function handleDelete(confirmed: boolean) {
    //alert to ask for confirmation
    if (confirmed) {
      if (user) {
        console.log("delete post: " + postToDelete);
        deleteDoc(doc(db, "posts", postToDelete))
          .then(() => {
            setShowAlert({
              showAlert: true,
              alertMessage: "Post Succesfully deleted",
            });
            setGiveChoice(false);
            setPostToDelete("");
          })
          .catch((error) => {
            setShowAlert({
              showAlert: true,
              alertMessage: "Error: " + JSON.stringify(error),
            });
          });
      } else {
        setGiveChoice(false);
        setShowAlert({
          showAlert: true,
          alertMessage: "You must be logged in to delete your posts",
        });
      }
    } else {
      setShowAlert({
        showAlert: false,
        alertMessage: "",
      });
      setGiveChoice(false);
    }
  }

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

  useEffect(() => {
    if (currentUser.followList.length > 0) {
      setFilter("follow");
    }
  }, [currentUser]);

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
    setNewUserInfo({ state: "false", value: "Loading..." });
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
    //DEBUG
    console.log("submit called");
    if (image && user) {
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
            setText("");
          });
        });
      });
    }
  }

  function showProfile(userId: String) {
    setProfileId(userId);
    setDisplay("profile");
  }

  function handleFilter() {
    if (user) {
      setFilter("follow");
    } else {
      setShowAlert({
        showAlert: true,
        alertMessage: "You must login to follow users",
      });
    }
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
          onClick={() => handleFilter()}
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
          <div className="separation"></div>
          <p>{showAlert.alertMessage}</p>
          {giveChoice && (
            <div className="choice">
              <button className="confirm" onClick={() => handleDelete(true)}>
                Yes
              </button>
              <button className="deny" onClick={() => handleDelete(false)}>
                No
              </button>
            </div>
          )}
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
              <>
                {user ? (
                  <div className="edit new-post">
                    <h2>
                      <span className="tiny">✦</span>New Post
                      <span className="tiny">✦</span>
                    </h2>
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
                      src={
                        image ? window.URL.createObjectURL(image) : undefined
                      }
                    ></img>
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
                ) : (
                  <>
                    <div className="edit new-post">
                      <h2>
                        <span className="tiny">✦</span>Sign in
                        <span className="tiny">✦</span>
                      </h2>
                      <p>You need to be signed in to upload content</p>
                      <div className="sign-in-wrapper">
                        <SignIn />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </form>
          <Gallery
            userProps={{
              user,
              currentUser,
              updateUser,
            }}
            appProps={{
              showProfile,
              setShowAlert,
              filter,
              setPostToDelete,
              setGiveChoice,
            }}
          />
        </>
      )}
      {showUserOptions && user && (
        <>
          <div className="background"></div>
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
              <h2>
                <span className="tiny">✦</span>User Options
                <span className="tiny">✦</span>
              </h2>
              <div className="separation"></div>
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
        </>
      )}
      {display == "profile" && (
        <>
          <Profile
            userProps={{
              user,
              currentUser,
              updateUser,
              uid: profileId,
            }}
            appProps={{
              showProfile,
              setShowAlert,
              setPostToDelete,
              setGiveChoice,
            }}
          />
        </>
      )}
    </>
  );
}

function Gallery({ userProps, appProps }: any) {
  const { user, currentUser, updateUser } = userProps;
  const { showProfile, setShowAlert, filter, setPostToDelete, setGiveChoice } =
    appProps;
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
  useEffect(() => {
    //DEBUG
    console.log("Gallery mounted");
  }, []);
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
              postProps={{
                post: post.data(),
                postId: post.id,
              }}
              userProps={{
                user,
                currentUser,
                updateUser,
              }}
              appProps={{
                showProfile,
                setShowAlert,
                setPostToDelete,
                setGiveChoice,
              }}
            />
          ))}
      </div>
    </>
  );
}

function Post({ postProps, userProps, appProps }: any) {
  const { post, postId } = postProps;
  const { user, currentUser, updateUser } = userProps;
  const { showProfile, setShowAlert, setPostToDelete, setGiveChoice } =
    appProps;
  const [likedBy, setLikedBy] = useState(post.likedBy);
  const [text, setText] = useState(post.text?.slice(0, 137));
  const [showAll, setShowAll] = useState(false);
  const [author, setAuthor] = useState(usernameStructure);
  const uid = auth.currentUser?.uid;

  //get user info on mount:
  useEffect(() => {
    //DEBUG
    console.log("Post mounted");
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
          {author.uid == currentUser.uid && (
            <button
              type="button"
              className="close-btn"
              onClick={() => {
                setPostToDelete(postId);
                setGiveChoice(true);
                setShowAlert({
                  showAlert: true,
                  alertMessage: "Are you sure you want to delete this post?",
                });
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="close delete" />
            </button>
          )}
        </div>
        <img className="post-image" src={post.postUrl}></img>
        {post.text && post.text.length <= 137 ? (
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

function Profile({ userProps, appProps }: any) {
  const [userInfo, setUserInfo] = useState(usernameStructure);
  const { user, currentUser, updateUser, uid } = userProps;
  const { showProfile, setShowAlert, setPostToDelete, setGiveChoice } =
    appProps;
  const [editPofile, setEditProfile] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [resizedPic, setResizedPic] = useState<
    string | File | null | Blob | ProgressEvent<FileReader>
  >(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  function handleClick() {
    inputRef.current?.click();
  }

  function handleChangePic(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const image = (e.target as HTMLInputElement).files![0];
      setNewProfilePic(image);
    }
  }

  async function changeProfilePic() {
    const refFullPic = ref(storage, `profile-pics/full/${currentUser.uid}`);
    const refSmallPic = ref(storage, `profile-pics/small/${currentUser.uid}`);
    if (newProfilePic) {
      try {
        //delete the old ones
        await deleteObject(refFullPic);
        await deleteObject(refSmallPic);
        //upload new one
        await uploadBytes(refFullPic, newProfilePic as File);
        const smallPic = await resizePic(newProfilePic);
        //upload the smaller one
        await uploadBytes(refSmallPic, smallPic as File);
      } catch (error) {
        //on error delete profile pic and display an alert
        console.log(JSON.stringify(error));
        setShowAlert({
          showAlert: true,
          alertMessage: "error: " + JSON.stringify(error),
        });
        deleteObject(refFullPic);
        deleteObject(refSmallPic);
      } finally {
        setShowAlert({
          showAlert: true,
          alertMessage: "",
        });
      }
    }
  }

  //make a query for all posts
  const q = query(
    postsRef,
    where("uid", "==", uid),
    limit(3),
    orderBy("createdAt", "desc")
  );
  const [posts, loading, error] = useCollection(q);
  //get user info on mount:
  useEffect(() => {
    //DEBUG
    console.log("Profile mounted!");
    getUserInfo(uid).then((result) => {
      setUserInfo(result);
    });
  }, []);

  useEffect(() => {
    if (newProfilePic) {
      resizePic(newProfilePic).then((result) => {
        setResizedPic(result);
      });
    }
  }, [newProfilePic]);

  return (
    <>
      <div className="profile">
        <img
          draggable={false}
          src={userInfo.photoURL}
          alt={userInfo.displayName + "'s profile picture"}
        ></img>
        <h1>{userInfo.displayName}</h1>
        {userInfo.uid == currentUser.uid && (
          <>
            <button onClick={() => setEditProfile(true)}>Edit</button>
          </>
        )}
      </div>
      {editPofile && (
        <>
          <div className="edit info">
            <button className="close-btn" onClick={() => setEditProfile(false)}>
              <FontAwesomeIcon className="close" icon={faPlus} />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={inputRef}
              onChange={handleChangePic}
              style={{ display: "none" }}
            ></input>
            <img
              draggable={false}
              src={
                newProfilePic
                  ? window.URL.createObjectURL(newProfilePic)
                  : currentUser.photoURL
              }
              alt={currentUser.displayName + "'s profile picture"}
              onClick={handleClick}
            ></img>
            {resizedPic && (
              <>
                <img src={resizedPic as string}></img>
              </>
            )}
          </div>
        </>
      )}
      {error && <h2>Error: can't load content</h2>}
      {loading && <h2>Loading...</h2>}
      <div className="gallery">
        {posts &&
          posts.docs.map((post) => (
            <Post
              key={post.id}
              postProps={{
                post: post.data(),
                postId: post.id,
              }}
              userProps={{
                user,
                currentUser,
                updateUser,
              }}
              appProps={{
                showProfile,
                setShowAlert,
                setPostToDelete,
                setGiveChoice,
              }}
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
