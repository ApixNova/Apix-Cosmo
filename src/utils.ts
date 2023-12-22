import Resizer from "react-image-file-resizer";
import { query, where, getDocs } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { usersRef, storage } from "./App";

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

export async function resizePic(file: File, type: string): ResizePic {
  let size = 70;
  switch (type) {
    case "small":
      break;
    case "full":
      size = 500;
      break;
    case "post":
      size = 1000;
      break;
  }
  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      size,
      size,
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
