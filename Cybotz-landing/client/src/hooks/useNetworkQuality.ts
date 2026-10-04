import { useState, useEffect } from "react";

export interface NetworkQuality {
  isSlow: boolean;
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlink: number | null; // Mbps
  rtt: number | null; // ms round-trip time
  saveData: boolean;
  isOnline: boolean;
}

function getNetworkInfo(): NetworkQuality {
  if (typeof window === "undefined") {
    return {
      isSlow: false,
      effectiveType: "4g",
      downlink: null,
      rtt: null,
      saveData: false,
      isOnline: true,
    };
  }

  // Support manual dev / test toggle via URL param or localStorage (?slow_net=1 or localStorage.getItem('cybotz_sim_slow'))
  const urlParams = new URLSearchParams(window.location.search);
  const isSimulatedSlow =
    urlParams.get("slow_net") === "1" ||
    urlParams.get("slow") === "true" ||
    localStorage.getItem("cybotz_simulate_slow_net") === "true";

  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  const isOnline = navigator.onLine !== false;

  if (isSimulatedSlow) {
    return {
      isSlow: true,
      effectiveType: "2g",
      downlink: 0.4,
      rtt: 850,
      saveData: true,
      isOnline,
    };
  }

  if (!conn) {
    return {
      isSlow: false,
      effectiveType: "unknown",
      downlink: null,
      rtt: null,
      saveData: false,
      isOnline,
    };
  }

  const effectiveType = conn.effectiveType || "unknown";
  const downlink = typeof conn.downlink === "number" ? conn.downlink : null;
  const rtt = typeof conn.rtt === "number" ? conn.rtt : null;
  const saveData = Boolean(conn.saveData);

  // Slow if on 2G, 3G, downlink under 1.8 Mbps, RTT over 400ms, or Data Saver enabled
  const isSlow =
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g" ||
    (downlink !== null && downlink < 1.8) ||
    (rtt !== null && rtt > 400) ||
    saveData;

  return {
    isSlow,
    effectiveType,
    downlink,
    rtt,
    saveData,
    isOnline,
  };
}

export function useNetworkQuality(): NetworkQuality {
  const [network, setNetwork] = useState<NetworkQuality>(getNetworkInfo);

  useEffect(() => {
    const handleUpdate = () => {
      setNetwork(getNetworkInfo());
    };

    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (conn) {
      conn.addEventListener("change", handleUpdate);
    }
    window.addEventListener("online", handleUpdate);
    window.addEventListener("offline", handleUpdate);

    return () => {
      if (conn) {
        conn.removeEventListener("change", handleUpdate);
      }
      window.removeEventListener("online", handleUpdate);
      window.removeEventListener("offline", handleUpdate);
    };
  }, []);

  return network;
}
