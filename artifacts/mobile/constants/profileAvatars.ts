import type { ImageSourcePropType } from "react-native";

type ProfileAvatar = {
  key: string;
  source: ImageSourcePropType;
};

const PROFILE_AVATARS: ProfileAvatar[] = [
  {
    key: "raven-avatar-01",
    source: require("../assets/images/profile-avatars/raven-avatar-01.png"),
  },
  {
    key: "raven-avatar-02",
    source: require("../assets/images/profile-avatars/raven-avatar-02.png"),
  },
  {
    key: "raven-avatar-03",
    source: require("../assets/images/profile-avatars/raven-avatar-03.png"),
  },
  {
    key: "raven-avatar-04",
    source: require("../assets/images/profile-avatars/raven-avatar-04.png"),
  },
  {
    key: "raven-avatar-05",
    source: require("../assets/images/profile-avatars/raven-avatar-05.png"),
  },
  {
    key: "raven-avatar-06",
    source: require("../assets/images/profile-avatars/raven-avatar-06.png"),
  },
  {
    key: "raven-avatar-07",
    source: require("../assets/images/profile-avatars/raven-avatar-07.png"),
  },
  {
    key: "raven-avatar-08",
    source: require("../assets/images/profile-avatars/raven-avatar-08.png"),
  },
  {
    key: "raven-avatar-09",
    source: require("../assets/images/profile-avatars/raven-avatar-09.png"),
  },
  {
    key: "raven-avatar-10",
    source: require("../assets/images/profile-avatars/raven-avatar-10.png"),
  },
  {
    key: "raven-avatar-11",
    source: require("../assets/images/profile-avatars/raven-avatar-11.png"),
  },
  {
    key: "raven-avatar-12",
    source: require("../assets/images/profile-avatars/raven-avatar-12.png"),
  },
];

export function selectProfileAvatar(seed?: string | null) {
  if (!seed) return PROFILE_AVATARS[0].source;

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return PROFILE_AVATARS[hash % PROFILE_AVATARS.length].source;
}
