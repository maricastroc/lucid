"use client";

import dynamic from "next/dynamic";

const Studio = dynamic(() => import("./studio").then((m) => m.Studio), { ssr: false });

export function StudioClient() {
  return <Studio />;
}
