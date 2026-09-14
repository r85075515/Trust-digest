import type {
  Category,
  PreferenceWeights,
  PersonalizationState,
  Story,
  InteractionType,
} from "./types";

const STORAGE_KEY = "axiom-personalization-v1";

export const DEFAULT_WEIGHTS: PreferenceWeights = {
  international: 1,
  finance: 1,
  tech: 1,
  ai: 1,
  entertainment: 1,
  beauty: 1,
};

export const DEFAULT_STATE: PersonalizationState = {
  interactions: [],
  weights: { ...DEFAULT_WEIGHTS },
  savedIds: [],
  notInterestedIds: [],
  openedIds: [],
  adultOptIn: false,
};

export function loadPersonalization(): PersonalizationState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE, weights: { ...DEFAULT_WEIGHTS } };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, weights: { ...DEFAULT_WEIGHTS } };
    const parsed = JSON.parse(raw) as PersonalizationState;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      weights: { ...DEFAULT_WEIGHTS, ...parsed.weights },
    };
  } catch {
    return { ...DEFAULT_STATE, weights: { ...DEFAULT_WEIGHTS } };
  }
}

export function savePersonalization(state: PersonalizationState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bumpWeight(weights: PreferenceWeights, category: Category, delta: number) {
  if (category === "adult") return weights;
  const next = { ...weights };
  next[category] = Math.max(0.2, Math.min(3, next[category] + delta));
  return next;
}

export function applyInteraction(
  state: PersonalizationState,
  story: Story,
  type: InteractionType
): PersonalizationState {
  const at = new Date().toISOString();
  const interactions = [
    ...state.interactions,
    { storyId: story.id, type, at },
  ].slice(-200);

  let { weights, savedIds, notInterestedIds, openedIds } = state;

  if (type === "open") {
    openedIds = Array.from(new Set([...openedIds, story.id]));
    weights = bumpWeight(weights, story.category, 0.15);
  } else if (type === "save") {
    if (savedIds.includes(story.id)) {
      savedIds = savedIds.filter((id) => id !== story.id);
    } else {
      savedIds = [...savedIds, story.id];
      notInterestedIds = notInterestedIds.filter((id) => id !== story.id);
      weights = bumpWeight(weights, story.category, 0.35);
    }
  } else if (type === "not_interested") {
    notInterestedIds = Array.from(new Set([...notInterestedIds, story.id]));
    savedIds = savedIds.filter((id) => id !== story.id);
    weights = bumpWeight(weights, story.category, -0.4);
  }

  return {
    ...state,
    interactions,
    weights,
    savedIds,
    notInterestedIds,
    openedIds,
  };
}

export function rankStories(stories: Story[], state: PersonalizationState): Story[] {
  return [...stories]
    .filter((s) => !state.notInterestedIds.includes(s.id))
    .sort((a, b) => {
      const wa =
        a.category === "adult"
          ? 0
          : state.weights[a.category as keyof PreferenceWeights] ?? 1;
      const wb =
        b.category === "adult"
          ? 0
          : state.weights[b.category as keyof PreferenceWeights] ?? 1;
      const scoreA =
        wa * 10 +
        a.trustScore / 20 +
        (state.savedIds.includes(a.id) ? 5 : 0) +
        (state.openedIds.includes(a.id) ? -1 : 0);
      const scoreB =
        wb * 10 +
        b.trustScore / 20 +
        (state.savedIds.includes(b.id) ? 5 : 0) +
        (state.openedIds.includes(b.id) ? -1 : 0);
      return scoreB - scoreA;
    });
}
