import type { Metadata } from "next";
import MarkdownSection from "@/components/MarkdownSection";

export const metadata: Metadata = {
  title: "Part A · Architecture",
  description:
    "The nine questions answered — how one platform serves many clients without forking per client.",
};

export default function Page() {
  return <MarkdownSection href="/part-a" file="part-a.md" rail />;
}
