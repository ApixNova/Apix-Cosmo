import { useState, useEffect, useRef, ChangeEvent } from "react";
import { updateDoc, doc, arrayRemove } from "firebase/firestore";
import { db, getUserInfo, storage, usernameStructure } from "./App";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Resizer from "react-image-file-resizer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

import Gallery from "./Gallery";

async function resizePic(
  file: File
): Promise<string | File | Blob | ProgressEvent<FileReader>> {
  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      70,
      70,
      "JPEG",
      100,
      0,
      (uri) => {
        resolve(uri);
      },
      "file"
    );
  });
}
async function resizeFullPic(
  file: File
): Promise<string | File | Blob | ProgressEvent<FileReader>> {
  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      500,
      500,
      "JPEG",
      100,
      0,
      (uri) => {
        resolve(uri);
      },
      "file"
    );
  });
}

export default function Profile({ userProps, appProps }: any) {
  const [userInfo, setUserInfo] = useState(usernameStructure);
  const { user, currentUser, updateUser, uid } = userProps;
  const { showProfile, setShowAlert, setPostToDelete, setGiveChoice, filter } =
    appProps;
  const [editPofile, setEditProfile] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
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
        setShowAlert({
          showAlert: true,
          alertMessage: "Loading...",
        });
        //upload new one
        const fullPic = await resizeFullPic(newProfilePic);
        await uploadBytes(refFullPic, fullPic as File);
        const smallPic = await resizePic(newProfilePic);
        //upload the smaller one
        await uploadBytes(refSmallPic, smallPic as File);
        const userRef = doc(db, "users", currentUser.docId);
        const smallURL = await getDownloadURL(refSmallPic);
        const fullURL = await getDownloadURL(refFullPic);
        await updateDoc(userRef, {
          smallPic: smallURL,
          fullPic: fullURL,
        });
        setShowAlert({
          showAlert: true,
          alertMessage: "New Profile Picture Set!",
        });
      } catch (error) {
        //on error display an alert
        setShowAlert({
          showAlert: true,
          alertMessage: "error: " + JSON.stringify(error),
        });
      }
    }
  }
  //get user info on mount:
  useEffect(() => {
    //DEBUG
    console.log("Profile mounted!");
    getUserInfo(uid).then((result) => {
      setUserInfo(result);
    });
  }, [uid]);

  function handleUnfollow() {
    const userRef = doc(db, "users", currentUser.docId);
    updateDoc(userRef, {
      followList: arrayRemove(userInfo.uid),
    })
      .then(() => {
        updateUser();
      })
      .catch((e) => {
        console.log(JSON.stringify(e));
      });
  }

  return (
    <>
      <div className="profile">
        <img
          draggable={false}
          src={userInfo.fullPic}
          alt={userInfo.displayName + "'s profile picture"}
        ></img>
        <h1>{userInfo.displayName}</h1>
        {userInfo.uid == currentUser.uid && (
          <>
            <button onClick={() => setEditProfile(true)}>Edit</button>
          </>
        )}
        {currentUser.followList.includes(userInfo.uid) &&
          currentUser.uid != userInfo.uid && (
            <>
              <button onClick={handleUnfollow}>Unfollow</button>
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
                  : currentUser.fullPic
              }
              alt={currentUser.displayName + "'s profile picture"}
              onClick={handleClick}
            ></img>
            <h2>Update Profile Picture</h2>
            {newProfilePic && (
              <>
                <button onClick={changeProfilePic}>Submit</button>
              </>
            )}
          </div>
        </>
      )}
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
        uid={uid}
      />
    </>
  );
}
