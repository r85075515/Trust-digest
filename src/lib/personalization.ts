import type {
  Category,
  PreferenceWeights,
  PersonalizationState,
  Story,
  InteractionType,
} from "./types";

const STORAGE_KEY_V2 = "axiom-personalization-v2";
const STORAGE_KEY_V1 = "axiom-personalization-v1";

export const DEFAULT_WEIGHTS: PreferenceWeights = {
  international: 1,
  finance: 1,
  tech: 1,
  ai: 1,
  semiconductor: 1,
  taiwan: 1,
  us: 1,
  energy: 1,
  biotech: 1,
  entertainment: 1,
  eastAsiaGossip: 1,
  beauty: 1,
  shopping: 1,
  accountability: 1,
  publicFigures: 1,
  science: 1,
};

export const DEFAULT_STATE: PersonalizationState = {
  interactions: [],
  weights: { ...DEFAULT_WEIGHTS },
  savedIds: [],
  notInterestedIds: [],
  openedIds: [],
};

function freshState(): PersonalizationState {
  return { ...DEFAULT_STATE, weights: { ...DEFAULT_WEIGHTS } };
}

type LegacyParsed = Partial<PersonalizationState> & {
  adultOptIn?: boolean;
  weights?: Partial<PreferenceWeights>;
};

function parseState(raw: string): PersonalizationState {
  const parsed = JSON.parse(raw) as LegacyParsed;
  // Strip legacy adultOptIn; merge weights with defaults (incl. new society)
  const { adultOptIn: _drop, ...rest } = parsed;
  const state: PersonalizationState = {
    ...DEFAULT_STATE,
    ...rest,
    weights: { ...DEFAULT_WEIGHTS, ...(parsed.weights || {}) },
  };
  return state;
}

/**
 * 權重時間衰減（純函數）：w = 1 + (w - 1) × 0.5^(inactiveDays / 14)，
 * 半衰期 14 天，向預設值 1 收斂；上下限維持 0.2–3。
 */
export function decayWeights(
  weights: PreferenceWeights,
  inactiveDays: number
): PreferenceWeights {
  const days = Math.max(0, inactiveDays);
  const factor = Math.pow(0.5, days / 14);
  const next = { ...weights } as PreferenceWeights;
  (Object.keys(next) as (keyof PreferenceWeights)[]).forEach((k) => {
    const decayed = 1 + (next[k] - 1) * factor;
    next[k] = Math.max(0.2, Math.min(3, decayed));
  });
  return next;
}

function inactiveDaysOf(state: PersonalizationState, nowMs: number): number | null {
  if (state.interactions.length === 0) return null;
  const ref = state.lastActiveAt ?? state.interactions[state.interactions.length - 1]?.at;
  if (!ref) return null;
  const t = Date.parse(ref);
  if (Number.isNaN(t)) return null;
  return Math.max(0, (nowMs - t) / 864e5);
}

function withDecay(state: PersonalizationState, nowMs: number): PersonalizationState {
  const inactive = inactiveDaysOf(state, nowMs);
  if (inactive === null) return state;
  return { ...state, weights: decayWeights(state.weights, inactive) };
}

export function loadPersonalization(nowMs: number = Date.now()): PersonalizationState {
  if (typeof window === "undefined") return freshState();
  try {
    // v2 優先；已有 v2 就不覆寫
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) return withDecay(parseState(rawV2), nowMs);

    // v1 → v2 自動遷移：全部欄位保留，舊 key 留著不刪（可回滾）
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const migrated = parseState(rawV1);
      const last = migrated.interactions[migrated.interactions.length - 1]?.at;
      migrated.lastActiveAt = last ?? new Date(nowMs).toISOString();
      return withDecay(migrated, nowMs);
    }
    return freshState();
  } catch {
    return freshState();
  }
}

export function savePersonalization(state: PersonalizationState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
}

function bumpWeight(weights: PreferenceWeights, category: Category, delta: number) {
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
    lastActiveAt: at,
  };
}

function recencyBonus(publishedAt: string | undefined, nowMs: number): number {
  if (!publishedAt) return 0;
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return 0;
  const ageDays = (nowMs - t) / 864e5;
  return Math.max(0, 5 - ageDays);
}

/**
 * 多樣性穿插（純函數、確定性）：同一分類連續出現不超過 3 張；
 * 第 4 張起把後面最近的不同分類卡往前拉。
 */
export function interleaveDiverse(sorted: Story[]): Story[] {
  const remaining = [...sorted];
  const out: Story[] = [];
  let lastCategory: Category | null = null;
  let run = 0;
  while (remaining.length > 0) {
    let idx = 0;
    if (lastCategory !== null && run >= 3) {
      const alt = remaining.findIndex((s) => s.category !== lastCategory);
      if (alt !== -1) idx = alt;
    }
    const [picked] = remaining.splice(idx, 1);
    if (picked.category === lastCategory) {
      run += 1;
    } else {
      lastCategory = picked.category;
      run = 1;
    }
    out.push(picked);
  }
  return out;
}

export function rankStories(
  stories: Story[],
  state: PersonalizationState,
  nowMs: number = Date.now()
): Story[] {
  const sorted = [...stories]
    .filter((s) => !state.notInterestedIds.includes(s.id))
    .sort((a, b) => {
      const wa = state.weights[a.category] ?? 1;
      const wb = state.weights[b.category] ?? 1;
      const scoreA =
        wa * 10 +
        a.trustScore / 20 +
        (state.savedIds.includes(a.id) ? 5 : 0) +
        (state.openedIds.includes(a.id) ? -1 : 0) +
        recencyBonus(a.publishedAt, nowMs);
      const scoreB =
        wb * 10 +
        b.trustScore / 20 +
        (state.savedIds.includes(b.id) ? 5 : 0) +
        (state.openedIds.includes(b.id) ? -1 : 0) +
        recencyBonus(b.publishedAt, nowMs);
      return scoreB - scoreA;
    });
  return interleaveDiverse(sorted);
}
