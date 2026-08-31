"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Staff header Back — browser history when available. */
export function BackButton() {
  const router = useRouter();
  const [canBack, setCanBack] = useState(false);

  useEffect(() => {
    setCanBack(window.history.length > 1);
  }, []);

  if (!canBack) return null;

  return (
    <button
      type="button"
      className="sg-btn-ghost"
      onClick={() => router.back()}
      title="Go back"
    >
      ← Back
    </button>
  );
}
