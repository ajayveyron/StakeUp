export type WorkoutProofPrompt = {
  id: string;
  text: string;
  referenceImage: {
    assetKey: string;
    uri: string;
    alt: string;
  };
};

function prompt(id: string, text: string): WorkoutProofPrompt {
  return {
    id,
    text,
    referenceImage: {
      assetKey: id,
      uri: `/workout-proof-prompts/${id}.png`,
      alt: `Reference image for: ${text}`,
    },
  };
}

export const WORKOUT_PROOF_PROMPTS: WorkoutProofPrompt[] = [
  prompt("thumbs-up", "Show a thumbs-up with one hand"),
  prompt("peace-sign", "Show a peace sign with one hand"),
  prompt("ok-sign", "Make an OK sign with one hand"),
  prompt("both-palms", "Show both palms to the camera"),
  prompt("point-equipment", "Point at the equipment or mat you used"),
  prompt("side-on-raise-hand", "Stand side-on and raise one hand"),
  prompt("opposite-shoulder", "Touch one shoulder with the opposite hand"),
  prompt("squat-open-palm", "Hold a squat stance and show one open palm"),
  prompt("three-fingers", "Show three fingers with one hand"),
  prompt("four-fingers", "Show four fingers with one hand"),
  prompt("forearms-x", "Cross your forearms into an X"),
  prompt("hip-and-hand-up", "Put one hand on your hip and raise the other"),
  prompt("fist-chest", "Make a fist near your chest"),
  prompt("point-shoes", "Point at your workout shoes"),
  prompt("arm-side", "Hold one arm straight out to the side"),
  prompt("hands-shoulder-height", "Raise both hands to shoulder height"),
  prompt("opposite-ear", "Touch one ear with the opposite hand"),
  prompt("two-fingers-floor", "Point two fingers toward the floor"),
  prompt("wide-stance-palm", "Stand feet shoulder-width and show one open palm"),
  prompt("number-one", "Show the number one with one index finger"),
  prompt("flex-and-palm", "Flex one arm and show the opposite palm"),
  prompt("t-shape", "Make a T shape with your arms"),
  prompt("lunge-open-palm", "Stand in a lunge stance and show one open palm"),
  prompt("opposite-knee", "Touch one knee with the opposite hand"),
  prompt("hands-on-hips", "Put both hands on your hips"),
  prompt("point-camera", "Point at the camera with one index finger"),
  prompt("hand-heart", "Make a small heart shape with your hands"),
  prompt("hands-together", "Press both hands together in front of your chest"),
  prompt("overhead-v", "Hold both hands above your head in a V"),
  prompt("smile-open-palm", "Smile and show one open palm"),
];

export function selectWorkoutProofPrompt(
  commitmentId: string | undefined,
  date: string
) {
  const seed = `${commitmentId ?? "pact"}:${date}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return WORKOUT_PROOF_PROMPTS[hash % WORKOUT_PROOF_PROMPTS.length];
}
