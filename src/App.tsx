import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import B2B from "./pages/B2B";
import B2C from "./pages/B2C";

const TITLES: Record<string, string> = {
  "/": "Finous — The AI layer that helps banks understand their customers",
  "/b2b": "Finous for Institutions — White-labelled financial intelligence for Banks & NBFCs",
  "/b2c": "Finous for Customers — Your whole financial life in one place, free",
};

function Shell() {
  const { pathname } = useLocation();

  /* scroll to top on route change */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  /* per-route document title */
  useEffect(() => {
    document.title = TITLES[pathname] ?? TITLES["/"];
  }, [pathname]);

  /* reveal-on-scroll observer, re-armed for every page */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/b2b" element={<B2B />} />
          <Route path="/b2c" element={<B2C />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return <Shell />;
}
