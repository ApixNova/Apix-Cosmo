type UserLogin = {
  uid: string;
  photoURL: string;
  displayName: string;
};
type CurrentUser = {
  uid: string;
  smallPic: string;
  fullPic: string;
  displayName: string;
  followList: string[];
  docId: string;
};
type SignInProps = {
  updateUser: () => void;
};
type ProfileProps = {
  userProps: {
    user: User | null | undefined;
    currentUser: CurrentUser;
    updateUser: () => void;
    uid: string;
  };
  appProps: {
    showProfile: (userId: string) => void;
    setShowAlert: React.SetStateAction;
    setShowUserOptions: React.SetStateAction;
    setPostToDelete: React.SetStateAction;
    filter: string;
  };
};
type GalleryProps = {
  userProps: {
    user: User | null | undefined;
    currentUser: CurrentUser;
    updateUser: () => void;
  };
  appProps: {
    showProfile: (userId: string) => void;
    setShowAlert: React.SetStateAction;
    setPostToDelete: React.SetStateAction;
    filter: string;
  };
  uid: string;
};
type DocumentData = import("firebase/firestore").DocumentData;

type PostProps = {
  postProps: {
    post: DocumentData;
    postId: string;
  };
  userProps: {
    user: User | null | undefined;
    currentUser: CurrentUser;
    updateUser: () => void;
  };
  appProps: {
    showProfile: (userId: string) => void;
    setShowAlert: React.SetStateAction;
    setPostToDelete: React.SetStateAction;
  };
};
