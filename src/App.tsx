import "./App.css";
import "./Gallery.css";
import Gallery from "./Gallery";
import Profile from "./Profile";
import person from "./assets/person.svg";
import starPatternLeft from "./assets/star pattern left.png";
import starPatternRight from "./assets/star pattern right.png";
import mainPic from "./assets/main.jpg";

import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  getFirestore,
  collection,
  query,
  doc,
  addDoc,
  updateDoc,
  where,
  serverTimestamp,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { v4 } from "uuid";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowRight } from "@fortawesome/free-solid-svg-icons";

//to handle files
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";

// Initialize Firebase
const app = initializeApp(JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG));

export const auth = getAuth();
export const db = getFirestore(app);
//Create root and collection references
export const storage = getStorage();
export const postsRef = collection(db, "posts");
const usersRef = collection(db, "users");

export const usernameStructure: CurrentUser = {
  uid: "",
  smallPic: "",
  fullPic: "",
  displayName: "",
  docId: "",
  followList: [],
};

export async function getUserInfo(id: string) {
  const uid = id;
  let displayName = "";
  let smallPic = "";
  let fullPic = "";
  let docId = "";
  let followList: string[] = [];
  if (id) {
    try {
      const q = query(usersRef, where("uid", "==", uid));
      const userInfo = await getDocs(q);
      if (!userInfo.empty) {
        displayName = userInfo.docs[0].data().displayName;
        smallPic = userInfo.docs[0].data().smallPic;
        fullPic = userInfo.docs[0].data().fullPic;
        followList = userInfo.docs[0].data().followList;
        docId = userInfo.docs[0].id;
      }
      if (!smallPic) {
        //use the default profile pic
        const refDefaultPic = ref(storage, `profile-pics/default/black.png`);
        try {
          const url = await getDownloadURL(refDefaultPic);
          smallPic = url;
          fullPic = url;
        } catch (error) {
          //DEBUG
          console.log(JSON.stringify(error));
        }
      }
    } catch (error) {
      //DEBUG
      console.log(JSON.stringify(error));
    }
  }
  return {
    uid,
    displayName,
    smallPic,
    fullPic,
    followList,
    docId,
  };
}

function App() {
  const [user] = useAuthState(auth);
  const [newPost, setNewPost] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [profileId, setProfileId] = useState("");
  const [text, setText] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showUserOptions, setShowUserOptions] = useState(false);
  const [currentUser, setCurrentUser] = useState(usernameStructure);
  const [newUsername, setNewName] = useState("");
  const [filter, setFilter] = useState("all");
  const [newUserInfo, setNewUserInfo] = useState({
    state: "false",
    value: "",
  });
  const [showAlert, setShowAlert] = useState({
    showAlert: false,
    giveChoice: false,
    alertMessage: "",
  });
  const [postToDelete, setPostToDelete] = useState({ postId: "", postURL: "" });

  async function handleDelete(confirmed: boolean) {
    //alert to ask for confirmation
    if (confirmed) {
      if (user) {
        try {
          console.log("delete post: " + postToDelete);
          await deleteDoc(doc(db, "posts", postToDelete.postId));
          const refToDelete = ref(storage, postToDelete.postURL);
          await deleteObject(refToDelete).catch((e) =>
            console.log(JSON.stringify(e))
          );
          setShowAlert({
            showAlert: true,
            giveChoice: false,
            alertMessage: "Post Succesfully deleted",
          });
          setPostToDelete({ postId: "", postURL: "" });
        } catch (e) {
          setShowAlert({
            showAlert: true,
            giveChoice: false,
            alertMessage: "Error: " + JSON.stringify(e),
          });
        }
      } else {
        setShowAlert({
          showAlert: true,
          giveChoice: false,
          alertMessage: "You must be logged in to delete your posts",
        });
      }
    } else {
      setShowAlert({
        showAlert: false,
        giveChoice: false,
        alertMessage: "",
      });
    }
  }

  function updateUser() {
    console.log("updateUser called");
    if (auth.currentUser) {
      getUserInfo(auth.currentUser!.uid).then((result) => {
        console.log("setCurrentUser Called");
        setCurrentUser(result);
      });
    }
  }

  useEffect(() => {
    updateUser();
    getRedirectResult(auth).then((result) => {
      if (result) {
        async function handleSignIn() {
          const { uid, displayName } = auth.currentUser as UserLogin;
          const q = query(usersRef, where("uid", "==", uid));
          const userSnap = await getDocs(q);
          //after sign in check if user is in the user collection, otherwise create a
          //new user

          if (userSnap.empty) {
            try {
              //use the default profile pic
              const refDefaultPic = ref(
                storage,
                `profile-pics/default/black.png`
              );
              const url = await getDownloadURL(refDefaultPic);
              const smallPic = url;
              const fullPic = url;
              //check if displayName is available otherwise keep trying to add a number until it is
              let available = false;
              let nameToCheck = displayName;
              let digit = 0;
              while (!available) {
                nameToCheck = digit == 0 ? displayName : displayName + digit;
                const queryUsername = query(
                  usersRef,
                  where("displayName", "==", nameToCheck)
                );
                try {
                  const snapshot = await getDocs(queryUsername);
                  if (!snapshot.empty) {
                    console.log(
                      "not available for " + nameToCheck + ", next try..."
                    );
                    digit++;
                  } else {
                    console.log("available for" + nameToCheck);
                    available = true;
                  }
                } catch (error) {
                  //DEBUG
                  console.log(JSON.stringify(error));
                }
              }
              //DEBUG
              console.log("addDoc called");
              await addDoc(usersRef, {
                uid,
                smallPic,
                fullPic,
                displayName: nameToCheck,
                followList: [uid],
              });
              console.log("addDoc resolved, trying to get the user info: ");
              const queryToTest = query(usersRef, where("uid", "==", uid));
              const snappy = await getDocs(queryToTest);
              console.log(snappy.docs[0].data());
              console.log("now, update user will be called: ");
              updateUser();
            } catch (error) {
              //DEBUG
              console.log(JSON.stringify(error));
            }
          } else {
            console.log("user already in db");
          }
        }
        handleSignIn();
      }
    });
  }, [user]);

  useEffect(() => {
    setDefaultFilter();
  }, [currentUser, user]);

  function setDefaultFilter() {
    if (user) {
      if (currentUser.followList.length > 1) {
        setFilter("follow");
      } else {
        setFilter("all");
      }
    } else {
      setFilter("welcome");
    }
  }

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
      try {
        const snapshot = await getDocs(q);
        const newUserRef = doc(db, "users", snapshot.docs[0].id);
        //DEBUG
        console.log("updateDoc called");
        setNewUserInfo({
          state: "true",
          value: "Loading...",
        });
        await updateDoc(newUserRef, {
          displayName: newUsername,
        }).then(() => {
          updateUser();
          setNewUserInfo({
            state: "success",
            value: newUsername + " is your new username",
          });
        });
      } catch (e) {
        console.log(JSON.stringify(e));
      }
    }
  }

  async function handleChangeUsername(newUsername: string) {
    setNewName(newUsername);
    //on every change
    //check if username available
    const q = query(usersRef, where("displayName", "==", newUsername));
    setNewUserInfo({ state: "false", value: "Loading..." });
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
        const { uid } = currentUser;
        getDownloadURL(storageRef).then((url) => {
          //DEBUG
          console.log("addDoc called");
          addDoc(postsRef, {
            uid,
            text: text,
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

  function showProfile(userId: string) {
    setProfileId(userId);
    setFilter("profile");
  }

  function handleFilter() {
    if (user) {
      setFilter("follow");
    } else {
      setShowAlert({
        showAlert: true,
        giveChoice: false,
        alertMessage: "You must login to follow users",
      });
    }
  }

  return (
    <div className="display">
      <div className="content">
        <header>
          <div onClick={setDefaultFilter} id="logo">
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

        {showAlert.showAlert && (
          <div className="alert">
            <button
              className="close-btn"
              onClick={() =>
                setShowAlert((prev) => ({
                  ...prev,
                  showAlert: false,
                  giveChoice: false,
                }))
              }
            >
              <FontAwesomeIcon className="close" icon={faPlus} />
            </button>
            <div className="separation"></div>
            <p>{showAlert.alertMessage}</p>
            {showAlert.giveChoice && (
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
            {user && (
              <>
                <button onClick={() => showProfile(currentUser.uid)}>
                  Profile
                </button>
              </>
            )}
            <button onClick={() => setShowAbout(true)}>About Cosmo</button>
          </div>
        )}
        {["follow", "all"].includes(filter) && (
          <>
            <div className="toggle">
              <button
                className={
                  (filter == "all" ? "" : " selected") + " toggle-btn left"
                }
                onClick={() => handleFilter()}
              >
                Follow List
              </button>
              <button
                className={
                  (filter == "all" ? " selected" : "") + " toggle-btn right"
                }
                onClick={() => setFilter("all")}
              >
                All Posts
              </button>
            </div>
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
                        onChange={(e: React.ChangeEvent) => {
                          setImage((e.target as HTMLInputElement).files![0]);
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
              }}
              uid=""
            />
          </>
        )}
        {filter == "welcome" && (
          <div className="welcome">
            <h2>
              A <span>Space</span> To Share <span>Art</span>
            </h2>
            <div className="welcome-images">
              <img
                className="star-pattern"
                src={starPatternLeft}
                draggable={false}
              ></img>
              <img className="main-pic" src={mainPic} draggable={false}></img>
              <img
                className="star-pattern"
                src={starPatternRight}
                draggable={false}
              ></img>
            </div>
            <button
              onClick={() => {
                setFilter("all");
              }}
            >
              Explore <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        )}
        {showUserOptions && user && (
          <>
            <div className="background"></div>
            <div className="user-options">
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
                  <span className="tiny">✦</span>Change Username
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
        {showAbout && (
          <div className="edit about">
            <button className="close-btn" onClick={() => setShowAbout(false)}>
              <FontAwesomeIcon className="close" icon={faPlus} />
            </button>
            <div className="separation"></div>
            <div className="about-text">
              <p>
                Cosmo is a social media for people to share art.
                <br />
                Created by <span>Apix Nova</span>
              </p>
            </div>
          </div>
        )}
        {filter == "profile" && (
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
                setShowUserOptions,
                setPostToDelete,
                filter,
              }}
            />
          </>
        )}
      </div>
      <div className="footer"></div>
    </div>
  );
}

function SignIn() {
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.log(JSON.stringify(error));
    }
  }
  return <button onClick={signInWithGoogle}>Sign in with Google</button>;
}

function SignOut() {
  function handleSignOut() {
    auth.signOut().then(() => {
      console.log("succesfully signed out");
    });
  }
  return <button onClick={handleSignOut}>Sign Out</button>;
}

export default App;
