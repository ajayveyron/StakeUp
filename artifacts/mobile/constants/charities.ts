export const CHARITY_DESTINATIONS = [
  {
    id: "akshaya_patra",
    name: "The Akshaya Patra Foundation",
    description: "Child nutrition and school meals.",
  },
  {
    id: "goonj",
    name: "Goonj",
    description: "Rural development, disaster relief, and dignity-led community work.",
  },
  {
    id: "cry",
    name: "Child Rights and You (CRY)",
    description: "Child rights, education, and protection.",
  },
  {
    id: "helpage_india",
    name: "HelpAge India",
    description: "Elderly care and support.",
  },
  {
    id: "wildlife_sos",
    name: "Wildlife SOS",
    description: "Wildlife rescue, animal welfare, and conservation.",
  },
] as const;

export type CharityDestination = (typeof CHARITY_DESTINATIONS)[number]["id"];

export function charityName(destination?: CharityDestination) {
  return (
    CHARITY_DESTINATIONS.find((charity) => charity.id === destination)?.name ??
    "selected charity"
  );
}
