import React from "react";
import OfflineOverlay from "@/components/OfflineOverlay";

export default function OfflinePage() {
  return (
    <OfflineOverlay
      isStandalonePage={true}
      onRetry={() => {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }}
    />
  );
}
