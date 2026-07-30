"use client";

// Mounts heavy below-the-fold content shortly before it enters the viewport.

import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { shouldShowDeferredContent } from "@/lib/deferredLoading";

export default function DeferredSection({ children, minHeight = 240, rootMargin = "400px 0px" }) {
  const anchorRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observerSupported = typeof window !== "undefined" && "IntersectionObserver" in window;
    if (shouldShowDeferredContent({ observerSupported, isIntersecting: false })) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!shouldShowDeferredContent({ observerSupported: true, isIntersecting: entry?.isIntersecting })) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin }
    );
    const anchor = anchorRef.current;
    if (anchor) observer.observe(anchor);
    return () => observer.disconnect();
  }, [rootMargin]);

  if (visible) return children;

  return (
    <Box
      ref={anchorRef}
      aria-hidden="true"
      sx={{
        minHeight,
        borderRadius: "16px",
        background: "rgba(15,23,42,0.18)",
      }}
    />
  );
}
