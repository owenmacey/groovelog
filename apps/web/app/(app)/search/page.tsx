import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchContent } from "./SearchContent";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
