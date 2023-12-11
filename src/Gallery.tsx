import { useState, useEffect, useRef } from "react";
import {
  query,
  limit,
  where,
  orderBy,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { postsRef } from "./App";

import Post from "./Post";

export default function Gallery({ userProps, appProps, uid = "" }: any) {
  const { user, currentUser, updateUser } = userProps;
  const { showProfile, setShowAlert, filter, setPostToDelete, setGiveChoice } =
    appProps;
  //max number of posts to fetch per batch
  const postLimit = 3;

  const mainPic =
    "https://firebasestorage.googleapis.com/v0/b/apix-cosmo.appspot.com/o/public%2Fmain.jpg?alt=media&token=c0cfd097-a91d-492a-8f92-91b0bdeb4b86";

  async function getCurrentData(): Promise<
    QueryDocumentSnapshot<DocumentData, DocumentData>[]
  > {
    return new Promise((resolve) => {
      setPosts((current) => {
        resolve(current);
        return current;
      });
    });
  }
  function getQuery() {
    if (filter == "follow" && currentUser.followList.length > 0) {
      console.log("follow filter");
      return query(
        postsRef,
        limit(postLimit),
        orderBy("createdAt", "desc"),
        where("uid", "in", currentUser.followList)
      );
    } else if (filter == "profile") {
      console.log("profile filter");
      return query(
        postsRef,
        where("uid", "==", uid),
        limit(postLimit),
        orderBy("createdAt", "desc")
      );
    } else {
      console.log("all posts filter");
      return query(postsRef, limit(postLimit), orderBy("createdAt", "desc"));
    }
  }

  const [posts, setPosts] = useState<
    QueryDocumentSnapshot<DocumentData, DocumentData>[]
  >([]);

  async function getMorePosts() {
    const currentData = await getCurrentData();
    const queryMore = query(
      postsRef,
      limit(postLimit),
      orderBy("createdAt", "desc"),
      startAfter(currentData[currentData.length - 1].data().createdAt)
    );
    return await getDocs(queryMore);
  }
  const [isLoading, setIsLoading] = useState(false);
  const [allShown, setAllShown] = useState(false);
  const allShownRef = useRef(allShown);
  const [error, setError] = useState({
    state: false,
    text: "",
  });

  function handleScroll() {
    if (
      window.innerHeight + document.documentElement.scrollTop + 200 <=
        document.documentElement.offsetHeight ||
      allShownRef.current ||
      isLoading
    ) {
      return;
    }
    allShownRef.current = true;
    console.log("You've hit rock bottom ;)");
    fetchMorePosts();
  }

  async function fetchMorePosts() {
    const currentData = await getCurrentData();
    if (currentData.length > 0) {
      setIsLoading(true);
      getMorePosts()
        .then((data) => {
          if (data.docs.length < postLimit || data.empty) {
            console.log("that was the last batch");
            setAllShown(true);
            allShownRef.current = true;
          } else {
            allShownRef.current = false;
          }
          setPosts((prev) => {
            return prev.concat(data.docs);
          });
          setIsLoading(false);
        })
        .catch((e) => {
          setError({
            state: true,
            text: JSON.stringify(e),
          });
        });
    }
  }

  function getFirstBatch() {
    setIsLoading(true);
    getDocs(getQuery())
      .then((data) => {
        setPosts(data.docs);
        setIsLoading(false);
        if (data.docs.length < postLimit || data.empty) {
          setAllShown(true);
        }
      })
      .catch((e) => {
        setError({
          state: true,
          text: JSON.stringify(e),
        });
      });
  }

  useEffect(() => {
    //DEBUG
    console.log("Gallery mounted");
    getFirstBatch();
    window.addEventListener("scroll", handleScroll);
    setAllShown(false);
    allShownRef.current = false;
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filter, uid]);

  return (
    <>
      {error.state && <h2>Error: {error.text}</h2>}
      {posts.length == 0 && allShown && (
        <>
          <h2 className="posts-state">Nothing here yet</h2>
          <img className="main-pic" src={mainPic}></img>
        </>
      )}
      <div className="gallery">
        {posts.length > 0 &&
          posts.map((post) => (
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
      {isLoading && (
        <div>
          <h2 className="posts-state">Loading...</h2>
        </div>
      )}
    </>
  );
}
