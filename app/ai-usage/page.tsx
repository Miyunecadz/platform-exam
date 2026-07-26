import type { Metadata } from "next";
import MarkdownSection from "@/components/MarkdownSection";

export const metadata: Metadata = {
  title: "AI usage",
  description:
    "An honest account of where AI was used in this submission and where it was not.",
};

export default function Page() {
  return <MarkdownSection href="/ai-usage" file="ai-usage.md" />;
}
