export const CHARITY_DESTINATIONS = [
  {
    id: "akshaya_patra",
    name: "The Akshaya Patra Foundation",
  },
  {
    id: "goonj",
    name: "Goonj",
  },
  {
    id: "cry",
    name: "Child Rights and You (CRY)",
  },
  {
    id: "helpage_india",
    name: "HelpAge India",
  },
  {
    id: "wildlife_sos",
    name: "Wildlife SOS",
  },
] as const;

export type CharityDestination = (typeof CHARITY_DESTINATIONS)[number]["id"];

export function charityName(destination: CharityDestination) {
  return (
    CHARITY_DESTINATIONS.find((charity) => charity.id === destination)?.name ??
    "Selected charity"
  );
}
