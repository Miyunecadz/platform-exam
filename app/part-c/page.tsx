import type { Metadata } from "next";
import MarkdownSection from "@/components/MarkdownSection";

export const metadata: Metadata = {
  title: "Part C · Reflection",
  description:
    "What the design gets right, what it defers, and where it would strain first.",
};

export default function Page() {
  return <MarkdownSection href="/part-c" file="part-c.md" />;
}
