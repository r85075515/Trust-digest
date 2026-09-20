export type Category =
  | "international"
  | "finance"
  | "tech"
  | "ai"
  | "entertainment"
  | "eastAsiaGossip"
  | "society"
  | "beauty";

/** East Asia gossip regional tag (TW / JP / KR / CN). */
export type EastAsiaRegion = "tw" | "jp" | "kr" | "cn";

export type Language = "zh-TW" | "en";

export interface SourceOutlet {
  name: string;
  url: string;
  stance?: string;
}

export interface LocalizedText {
  "zh-TW": string;
  en: string;
}

export interface TrustBreakdown {
  sourceDiversity: number; // 0-25
  outletReputation: number; // 0-25
  crossCorroboration: number; // 0-25
  recencyClarity: number; // 0-25
}

export interface Story {
  id: string;
  category: Category;
  /** @deprecated Adult zone removed — always false */
  adult: boolean;
  /** Featured as HEADLINE / 頭條 on the home feed */
  isHeadline?: boolean;
  /** High online buzz / trending — shown as 熱門 / Popular */
  isPopular?: boolean;
  /** Cover / thumbnail image URL */
  imageUrl?: string;
  /** Optional alt text for the cover image */
  imageAlt?: LocalizedText;
  publishedAt: string;
  title: LocalizedText;
  /** Short card briefing for home / lists */
  summary: LocalizedText;
  /** Full AI-digested article for the detail page */
  body: LocalizedText;
  sources: SourceOutlet[];
  disagreements: LocalizedText | null;
  /** Background / glossary entries for key people, orgs, proper nouns */
  glossary?: Array<{ term: LocalizedText; blurb: LocalizedText }>;
  trustScore: number;
  trustBreakdown: TrustBreakdown;
  tags: string[];
  /** East Asia gossip region when category is eastAsiaGossip */
  region?: EastAsiaRegion;
}

export type InteractionType = "open" | "save" | "not_interested";

export interface UserInteraction {
  storyId: string;
  type: InteractionType;
  at: string;
}

export interface PreferenceWeights {
  international: number;
  finance: number;
  tech: number;
  ai: number;
  entertainment: number;
  eastAsiaGossip: number;
  society: number;
  beauty: number;
}

export interface PersonalizationState {
  interactions: UserInteraction[];
  weights: PreferenceWeights;
  savedIds: string[];
  notInterestedIds: string[];
  openedIds: string[];
}
