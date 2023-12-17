import { useState, useEffect } from "react";
import { auth, db, getUserInfo, postsRef, usernameStructure } from "./App";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faHeart as faHeartSolid,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";

export default function Post({ postProps, userProps, appProps }: PostProps) {
  const { post, postId } = postProps;
  const { user, currentUser, updateUser } = userProps;
  const { showProfile, setShowAlert, setPostToDelete } = appProps;
  const [likedBy, setLikedBy] = useState(post.likedBy);
  const [text, setText] = useState(post.text?.slice(0, 137));
  const [showAll, setShowAll] = useState(false);
  const [author, setAuthor] = useState(usernameStructure);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;

  //get user info on mount:
  useEffect(() => {
    //DEBUG
    // console.log("Post mounted");
    getUserInfo(post.uid).then((result) => {
      setAuthor(result);
    });
  }, []);

  function showMore() {
    setShowAll(true);
    setText(post.text);
  }

  async function handleLike() {
    const postRef = doc(postsRef, postId);

    //if user is in the list
    if (likedBy.includes(uid)) {
      //unlike post
      const updatedList = likedBy.filter((id: String) => id != uid);
      //DEBUG
      console.log("updateDoc called");
      //test
      setLikedBy(updatedList);
      await updateDoc(postRef, {
        likedBy: updatedList,
      });
    } else {
      //like post
      const updatedList = likedBy.concat([uid]);
      //DEBUG
      console.log("updateDoc called");
      //test
      setLikedBy(updatedList);
      await updateDoc(postRef, {
        likedBy: updatedList,
      });
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
        giveChoice: false,
        alertMessage: "You need to be logged in to follow a user",
      });
    }
  }
  function isFollowed() {
    return currentUser.followList.includes(post.uid);
  }
  return (
    <>
      <div className="post" style={{ display: loading ? "none" : "flex" }}>
        <div className="author">
          <div className="show-profile" onClick={() => showProfile(post.uid)}>
            <img src={author.smallPic} className="profile-pic"></img>
            <p className="username">{author.displayName}</p>
          </div>
          {(!isFollowed() || !user) && (
            <button className="follow" onClick={handleFollow}>
              Follow
            </button>
          )}
          {author.uid == currentUser.uid && user && (
            <button
              type="button"
              className="close-btn"
              onClick={() => {
                setPostToDelete({ postId, postURL: post.postUrl });
                setShowAlert({
                  showAlert: true,
                  giveChoice: true,
                  alertMessage: "Are you sure you want to delete this post?",
                });
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="close delete" />
            </button>
          )}
        </div>
        <img
          className="post-image"
          src={post.postUrl}
          onLoad={() => setLoading(false)}
        ></img>
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
              onClick={handleLike}
              icon={likedBy.includes(uid) ? faHeartSolid : faHeartRegular}
            />
          ) : (
            <FontAwesomeIcon
              className="heart"
              onClick={() =>
                setShowAlert({
                  showAlert: true,
                  giveChoice: false,
                  alertMessage: "You need to be logged in to like a post",
                })
              }
              icon={faHeartRegular}
            />
          )}
          <p>{likedBy.length}</p>
        </div>
      </div>
    </>
  );
}
