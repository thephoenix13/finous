import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { useApi } from "../api/context";
import { useSaver } from "../lib/useSaver";
import { Card, Field, PageHeader, Select, TextArea } from "../ui";
import SaveBar from "../ui/SaveBar";

const FAQ: { q: string; a: string }[] = [
  { q: "What can each role open?", a: "Admins can open everything. Compliance, Marketing, Branch and Read-only each open fewer screens. If you reach one you can't open, the screen tells you which roles can." },
  { q: "Why is my brand colour blocked?", a: "Text on your brand colour must be easy to read, and the colour itself must stand out against the app's pale background. If a pair fails, try white text on a darker colour." },
  { q: "What does the advisor setting change?", a: "Off hides the advisor. Fixed rules answers from rules about money, with no AI provider. AI with consent also lets customers ask in their own words, and sends their figures outside India to write the answer, only after they agree." },
  { q: "Why can't I use a web address?", a: "Addresses use lower case letters, digits and hyphens, 3 to 30 characters. A few words are reserved, and another bank may already hold the one you want." },
  { q: "How do I give a colleague access?", a: "An Admin opens Team, then Invite staff, and picks a role and a branch. The invitation shows as Invited until they sign in." },
];

const TOPICS = [
  { value: "question", label: "A question" },
  { value: "problem", label: "Something isn't working" },
  { value: "request", label: "A request" },
];

function TicketForm() {
  const api = useApi();
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(TOPICS.some((t) => t.value === params.get("topic")) ? (params.get("topic") as string) : "question");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const saver = useSaver();

  const subjectError = subject.trim() === "" ? "Say what it's about in a few words." : undefined;
  const messageError = message.trim().length < 10 ? "Tell us a little more, at least 10 characters." : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (subjectError || messageError) return;
    const ok = await saver.run(async () => {
      const { id } = await api.raiseTicket({ topic, subject: subject.trim(), message: message.trim() });
      setTicket(id);
    });
    if (ok) {
      setSubject("");
      setMessage("");
      setAttempted(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-[560px] space-y-5">
      <Select label="Topic" value={topic} options={TOPICS} onChange={(e) => setTopic(e.target.value)} />
      <Field label="Subject" value={subject} error={attempted ? subjectError : undefined} onChange={(e) => setSubject(e.target.value)} />
      <TextArea label="Message" value={message} error={attempted ? messageError : undefined} onChange={(e) => setMessage(e.target.value)} />
      <SaveBar state={saver.state} label="Raise a ticket" />
      {ticket ? (
        <p role="status" className="text-[14px] text-ink-2">
          Thanks. Your ticket number is <b>{ticket}</b>. We'll reply by email.
        </p>
      ) : null}
    </form>
  );
}

/** I11.1: answers to the common questions, and a way to raise a ticket with Finous. */
export default function Help() {
  return (
    <>
      <PageHeader title="Help" description="Answers to common questions, and a way to reach Finous." />
      <section aria-labelledby="faq" className="mb-10">
        <h2 id="faq" className="mb-3 text-[18px] font-semibold">Common questions</h2>
        <Card className="divide-y divide-line p-0">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium after:float-right after:text-ink-3 after:content-['+'] group-open:after:content-['–']">{item.q}</summary>
              <p className="mt-2 max-w-[70ch] text-ink-2">{item.a}</p>
            </details>
          ))}
        </Card>
      </section>
      <section aria-labelledby="ticket">
        <h2 id="ticket" className="mb-3 text-[18px] font-semibold">Raise a ticket</h2>
        <TicketForm />
      </section>
    </>
  );
}
