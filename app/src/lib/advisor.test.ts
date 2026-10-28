import { describe, expect, it } from "vitest";
import { topicFor } from "./advisor";

describe("topicFor", () => {
  it.each([
    ["What's my biggest expense this month?", "biggest"],
    ["which is the largest spend", "biggest"],
    ["Should I prepay my home loan?", "prepay"],
    ["can i pre-pay it", "prepay"],
    ["Prepayment options", "prepay"],
    ["How much did I spend on food this month?", "food"],
    ["swiggy and zomato total", "food"],
    ["Can I afford a ₹40L car?", "afford"],
    ["could I afford a flat", "afford"],
  ] as const)("reads %j as %s", (question, topic) => {
    expect(topicFor(question)).toBe(topic);
  });

  it("matches whole English words: 'card' is not 'car', 'foodie' is not 'food'", () => {
    expect(topicFor("show my card statement")).toBeUndefined();
    expect(topicFor("my career")).toBeUndefined();
    expect(topicFor("foodie")).toBeUndefined();
  });

  it("prefers prepaying over the other words in the same question", () => {
    expect(topicFor("Should I prepay or afford a car, given my biggest expense is food?")).toBe("prepay");
  });

  it.each([
    ["इस महीने मेरा सबसे बड़ा खर्च क्या है?", "biggest"],
    ["क्या मुझे होम लोन का प्रीपेमेंट करना चाहिए?", "prepay"],
    ["इस महीने मैंने खाने पर कितना खर्च किया?", "food"],
    ["क्या मैं ₹40 लाख की कार खरीद सकता हूँ?", "afford"],
  ] as const)("reads the Hindi %j as %s", (question, topic) => {
    expect(topicFor(question)).toBe(topic);
  });

  it("returns nothing for a question it has no answer for, and for nothing", () => {
    expect(topicFor("What is the weather?")).toBeUndefined();
    expect(topicFor("")).toBeUndefined();
  });
});
