import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 64px)" }}>{children}</main>
      <Footer />
    </>
  );
}
