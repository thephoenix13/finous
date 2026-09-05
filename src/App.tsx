import { useEffect } from "react";
import Header from "./components/Header";
import Hero, { Ticker } from "./components/Hero";
import About from "./components/About";
import Platform from "./components/Platform";
import Moat from "./components/Moat";
import Security from "./components/Security";
import Faq from "./components/Faq";
import Engagement from "./components/Engagement";
import Waitlist from "./components/Waitlist";
import Footer from "./components/Footer";

export default function App() {
  /* single IntersectionObserver powers every .reveal on the page */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
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
      { threshold: 0.14, rootMargin: "0px 0px -46px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Ticker />
        <About />
        <Platform />
        <Moat />
        <Security />
        <Faq />
        <Engagement />
        <Waitlist />
      </main>
      <Footer />
    </>
  );
}
