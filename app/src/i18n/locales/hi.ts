import type { Messages } from "./en";

/**
 * Hindi. Typed against the English catalog, so every key must exist here.
 * Finance terms people already say in English (EMI, tax, consent) stay in Devanagari transliteration or
 * Latin script, whichever is more familiar. Needs a native-speaker review before launch.
 */
export const hi: Messages = {
  nav: {
    label: "मुख्य",
    home: "होम",
    advisor: "सलाहकार",
    plans: "योजनाएँ",
    you: "आप",
  },
  offline: {
    title: "आप ऑफ़लाइन हैं",
    body: "हम सहेजे हुए बैलेंस नहीं दिखाते। ऑनलाइन होते ही हम ताज़ा डेटा लाएँगे।",
    retry: "फिर कोशिश करें",
  },
  update: {
    ready: "Finous का नया संस्करण तैयार है।",
    later: "बाद में",
    reload: "रीलोड करें",
  },
  language: {
    label: "भाषा",
  },
  common: {
    back: "वापस",
  },
  plans: {
    tools: {
      emi: { title: "EMI कैलकुलेटर", subtitle: "कोई भी लोन, कोई भी दर" },
    },
  },
  emi: {
    title: "EMI कैलकुलेटर",
    monthly: "मासिक EMI",
    principal: "मूलधन",
    interest: "ब्याज",
    total: "कुल",
    loanAmount: "लोन की राशि",
    rate: "ब्याज दर",
    tenure: "अवधि",
    tenureValue_one: "{{count}} वर्ष",
    tenureValue_other: "{{count}} वर्ष",
  },
  pages: {
    home: {
      eyebrow: "होम",
      title: "हर खाता। एक संख्या।",
      note: "नेट वर्थ, कैश फ़्लो और किस पर नज़र रखनी है। M4 में आएगा।",
    },
    advisor: {
      eyebrow: "सलाहकार",
      title: "किसी भी लेन-देन के बारे में पूछिए।",
      note: "चैट, स्रोत और आवाज़। M5 और M6 में आएगा।",
    },
    plans: {
      eyebrow: "योजनाएँ",
      title: "आप क्या समझना चाहते हैं?",
      note: "कैलकुलेटर, हेल्थ स्कोर, लक्ष्य और टैक्स। और टूल M2 में आएँगे।",
    },
    you: {
      eyebrow: "आप",
      title: "प्रोफ़ाइल और प्राइवेसी।",
      note: "लिंक किए गए खाते, कंसेंट मैनेजर और डेटा नियंत्रण। M7 में आएँगे।",
    },
  },
};
