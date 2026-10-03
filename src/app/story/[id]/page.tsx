import { notFound } from "next/navigation";
import { getStoryById } from "@/lib/stories";
import storiesData from "../../../../data/stories.json";
import StoryDetailClient from "./StoryDetailClient";

// 靜態匯出用：build 時為每張卡預渲染內頁（2026-10-03）
export async function generateStaticParams() {
  const stories = storiesData as Array<{ id?: string }>;
  return stories
    .filter((s) => s && typeof s.id === "string" && s.id.length > 0)
    .map((s) => ({ id: s.id as string }));
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = getStoryById(id);
  if (!story) {
    notFound();
  }
  return <StoryDetailClient story={story} />;
}
