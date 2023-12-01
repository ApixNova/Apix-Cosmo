type UserLogin = {
  uid: string;
  photoURL: string;
  displayName: string;
};
type User = {
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
