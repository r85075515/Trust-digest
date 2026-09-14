import storiesData from "../../data/stories.json";
import type { Category, Story } from "./types";

const stories = (storiesData as Story[]).filter(
  (s) => !s.adult && s.category !== ("adult" as unknown as Category)
);

export function getAllStories(): Story[] {
  return stories;
}

export function getMainStories(): Story[] {
  return stories;
}

export function getStoryById(id: string): Story | undefined {
  return stories.find((s) => s.id === id);
}

export function getHeadlineStories(): Story[] {
  return getMainStories().filter((s) => s.isHeadline);
}

export function getPopularStories(): Story[] {
  return getMainStories().filter((s) => s.isPopular);
}

export function getStoriesByCategory(category: Category | "all"): Story[] {
  if (category === "all") return getMainStories();
  return getMainStories().filter((s) => s.category === category);
}

export const CATEGORY_LABELS: Record<
  Category | "all",
  { en: string; "zh-TW": string }
> = {
  all: { en: "All", "zh-TW": "全部" },
  international: { en: "International", "zh-TW": "國際" },
  finance: { en: "Finance", "zh-TW": "財經" },
  tech: { en: "Tech", "zh-TW": "科技" },
  ai: { en: "AI", "zh-TW": "人工智慧" },
  entertainment: { en: "Entertainment", "zh-TW": "演藝" },
  society: { en: "Society", "zh-TW": "社會" },
  beauty: { en: "Beauty", "zh-TW": "美妝" },
};
