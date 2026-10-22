// Stable IDs: only this small number is stored in a user's profile.
export const AVATARS = Object.freeze([
  { id: 0, name: "Amara", background: "#EEE8FF", skin: "#A95E3D", shade: "#87462F", hair: "#29202E", shirt: "#7361D7" },
  { id: 1, name: "Leo", background: "#DDF3EE", skin: "#F1BB8D", shade: "#D7996B", hair: "#45312B", shirt: "#318E82" },
  { id: 2, name: "Zuri", background: "#FFE9D5", skin: "#714631", shade: "#563326", hair: "#25202A", shirt: "#E58954" },
  { id: 3, name: "Kai", background: "#DFECFF", skin: "#E8B48D", shade: "#C78F6D", hair: "#273549", shirt: "#4E7BB9" },
  { id: 4, name: "Nia", background: "#FBE2ED", skin: "#BD7A54", shade: "#9C5C3F", hair: "#3D2730", shirt: "#BD638C" },
]);

export function isAvatarId(value) {
  return Number.isInteger(value) && AVATARS.some((avatar) => avatar.id === value);
}

export function getAvatar(value) {
  return AVATARS.find((avatar) => avatar.id === value) ?? AVATARS[0];
}
