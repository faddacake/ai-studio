import AppShell from "@/components/AppShell";
import DevCacheBuster from "@/components/DevCacheBuster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DevCacheBuster />
      <AppShell>{children}</AppShell>
    </>
  );
}
