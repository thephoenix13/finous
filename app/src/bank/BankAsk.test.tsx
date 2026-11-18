// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SharingState } from "../api/bankSharing";
import { MemberDataProvider } from "../api/memberContext";
import type { MemberData } from "../api/memberData";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import { createI18n } from "../i18n";
import { ALICE, createFakeAuth } from "../test/fakeAuth";
import { createFakeMember } from "../test/fakeMember";
import { forgetNotNow } from "./asked";
import BankAsk, { forgetSettled } from "./BankAsk";
import { parseBranding, type BankBranding } from "./branding";
import { BankProvider } from "./BankProvider";

const bankRow = (id: string, subdomain: string): BankBranding =>
  parseBranding({
    id,
    subdomain,
    name: `Bank ${id}`,
    install_name: "Bank",
    logo: null,
    brand_colour: "#0F6B4A",
    on_brand_colour: "#FFFFFF",
    disclaimer: "Regulated by the RBI. Not investment advice.",
    english: true,
    hindi: true,
    advisor: "rules",
  })!;

const answered: SharingState = { sharing: true, history: [{ sharing: true, at: "2026-11-10T04:30:00.000Z" }] };
const unanswered: SharingState = { sharing: false, history: [] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** In the app the gate sits inside the member's space, where the sign-in is already known: show nothing until it is, as the app does. */
function WhenSignedIn({ children }: { children: ReactNode }) {
  return useAuth().access === "member" ? <>{children}</> : null;
}

/** Shows where the router is, so a test can see a redirect. */
function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

type Props = { data: MemberData; host?: string };

const BANKS: Record<string, BankBranding> = { one: bankRow("b1", "one"), two: bankRow("b2", "two") };
const findBank = async (sub: string) => BANKS[sub] ?? null;

function Harness({ data, host = "one.app.finous.site" }: Props) {
  // One sign-in for the life of the screen: a new one on every render would sign the person in afresh each time.
  const [auth] = useState(() => createFakeAuth({ session: ALICE, consented: true }));
  return (
    <I18nextProvider i18n={createI18n("en")}>
      <BankProvider host={host} lookup={findBank}>
        <AuthProvider client={auth.client}>
          <MemoryRouter initialEntries={["/"]}>
            <MemberDataProvider data={data}>
              <Where />
              <WhenSignedIn>
              <Routes>
                <Route
                  index
                  element={
                    <BankAsk>
                      <p>the front door</p>
                    </BankAsk>
                  }
                />
                <Route path="you/bank" element={<p>the question</p>} />
              </Routes>
              </WhenSignedIn>
            </MemberDataProvider>
          </MemoryRouter>
        </AuthProvider>
      </BankProvider>
    </I18nextProvider>
  );
}

/** A member whose reads of the sharing state are answered by the test, one at a time. */
function member(reads: Array<Promise<SharingState>>) {
  const fake = createFakeMember();
  let n = 0;
  const reading: string[] = [];
  const data: MemberData = {
    ...fake.data,
    bankSharing: {
      read: (bankId) => {
        reading.push(bankId);
        return reads[n++] ?? Promise.resolve(unanswered);
      },
      join: fake.data.bankSharing.join,
      set: fake.data.bankSharing.set,
    },
  };
  return { data, reading };
}

beforeEach(() => {
  forgetSettled();
  forgetNotNow();
  window.localStorage.clear();
});
afterEach(() => window.history.pushState({}, "", "/"));

describe("BankAsk", () => {
  it("shows the front door and asks the database nothing on Finous's own address", async () => {
    const { data, reading } = member([]);
    render(<Harness data={data} host="app.finous.site" />);
    expect(await screen.findByText("the front door")).toBeInTheDocument();
    expect(reading).toEqual([]);
  });

  it("shows nothing of the front door until it knows whether to ask", async () => {
    const answer = deferred<SharingState>();
    const { data } = member([answer.promise]);
    render(<Harness data={data} />);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/"));
    // Waiting for the answer: neither the front door nor the question yet
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText("the front door")).not.toBeInTheDocument();
    expect(screen.queryByText("the question")).not.toBeInTheDocument();
    answer.resolve(answered);
    expect(await screen.findByText("the front door")).toBeInTheDocument();
  });

  it("asks someone who has not answered", async () => {
    const { data } = member([Promise.resolve(unanswered)]);
    render(<Harness data={data} />);
    expect(await screen.findByText("the question")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/you/bank");
  });

  it("does not take what it learned about one bank for another: each is asked about on its own", async () => {
    const first = member([Promise.resolve(answered)]);
    const { unmount } = render(<Harness data={first.data} />);
    expect(await screen.findByText("the front door")).toBeInTheDocument();
    unmount();
    // Same person, same session, a different bank, who has not been answered
    const second = member([Promise.resolve(unanswered)]);
    render(<Harness data={second.data} host="two.app.finous.site" />);
    expect(await screen.findByText("the question")).toBeInTheDocument();
    expect(second.reading).toEqual(["b2"]);
  });

  it("does not ask the database again once it knows the person has answered", async () => {
    const first = member([Promise.resolve(answered)]);
    const { unmount } = render(<Harness data={first.data} />);
    await screen.findByText("the front door");
    unmount();
    const second = member([Promise.resolve(unanswered)]);
    render(<Harness data={second.data} />);
    expect(await screen.findByText("the front door")).toBeInTheDocument();
    expect(second.reading).toEqual([]);
  });

  it("ignores an answer that arrives late for a question that has since changed", async () => {
    const late = deferred<SharingState>();
    const slow = member([late.promise]);
    const view = render(<Harness data={slow.data} />);
    await waitFor(() => expect(slow.reading).toEqual(["b1"]));
    // The member's data is replaced (a new sign-in): the new one says they have answered
    const fresh = member([Promise.resolve(answered)]);
    view.rerender(<Harness data={fresh.data} />);
    expect(await screen.findByText("the front door")).toBeInTheDocument();
    // The old read now comes back "not answered": it must not send them to the question
    late.resolve(unanswered);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByTestId("where")).toHaveTextContent("/");
    expect(screen.getByText("the front door")).toBeInTheDocument();
  });

  it("lets them in when the answer cannot be found out", async () => {
    const down = Promise.reject(new Error("down"));
    down.catch(() => undefined);
    const { data } = member([down]);
    render(<Harness data={data} />);
    expect(await screen.findByText("the front door")).toBeInTheDocument();
  });
});
