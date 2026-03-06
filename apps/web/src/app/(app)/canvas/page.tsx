import { Suspense } from "react";
import CanvasClient from "./CanvasClient";

export default function CanvasPage() {
  return (
    <Suspense fallback={null}>
      <CanvasClient />
    </Suspense>
  );
}
