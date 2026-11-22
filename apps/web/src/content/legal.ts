// Privacy notice and terms of use. Same wording as the live site; drafted for legal review.
// Keep them true to what the site actually does, and update UPDATED whenever they change.
// Links are written as [text](/path).
export const UPDATED = "22 November 2026";
export interface LegalSection {
  h: string;
  p?: string[];
  list?: string[];
  after?: string[];
}
export interface LegalDoc {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACY: LegalDoc = {
  eyebrow: "Privacy notice",
  title: "How we use your personal data",
  intro:
    "This notice explains what personal data Afrimetrica collects through this website, why, who we share it with and your rights. Afrimetrica is operated by Regelco International Ltd, a company registered in Ghana, which is responsible for your data (the data controller).",
  sections: [
    {
      h: "What we collect",
      list: [
        "**Your account:** name, email address, a protected (hashed) version of your password, or your Google account identifier if you sign in with Google.",
        "**Enquiries and requests:** what you send us through our forms, such as your name, email, phone number, organisation and message, including course, analysis, consultancy, fieldwork, hotel and mailing-list requests.",
        "**Course registrations:** the course and date you register for and the details you give us.",
        "**Surveys:** if you create surveys, their questions and settings; if you answer surveys, your answers and your participant profile (age, gender, country and occupation), and the time you took.",
        "**Technical data:** a sign-in cookie, and information your browser stores on your own device (such as a survey draft). We don't use advertising or tracking cookies.",
      ],
    },
    {
      h: "Why we use it",
      list: [
        "To provide the services you ask for: your account, courses, surveys, analysis and consultancy.",
        "To reply to your enquiries and keep you informed about them.",
        "To send account emails, such as confirming your email address or resetting your password.",
        "To send you news about courses and resources, only if you joined our mailing list. You can ask us to stop at any time.",
        "To keep the website secure and prevent misuse.",
        "To meet our legal obligations.",
      ],
      after: [
        "We rely on your consent (for example, the box you tick on our forms), on the need to provide a service you asked for, and on our legitimate interest in running and protecting our services.",
      ],
    },
    {
      h: "Survey answers",
      p: [
        "Answers to a survey are visible only to the person who created it and to the participant who gave them. Our administrators see counts, not answers. Results are shown in summary; groups of fewer than 3 people are never shown on their own.",
        "If a survey's owner uses our AI features (such as the AI analyst or AI report), a summary of that survey's results, which can include written answers, is sent to our AI provider to produce the result. Participants are never identified to it.",
      ],
    },
    {
      h: "Who we share it with",
      p: [
        "We don't sell your personal data. We share it only with service providers who help us run the website, under their own data protection terms:",
      ],
      list: [
        "**Render**, which hosts the website and its data.",
        "**Resend**, which sends our emails.",
        "**Google**, only if you choose to sign in with Google.",
        "**Anthropic** (Claude), which provides our AI features, only when they are used.",
      ],
      after: [
        "Some of these providers store or process data outside Ghana. We may also disclose data where the law requires it.",
      ],
    },
    {
      h: "How long we keep it",
      p: [
        "We keep personal data only as long as we need it for the purposes above or as the law requires. You can ask us to delete your account and data at any time; some records, such as invoices, may need to be kept for legal reasons.",
      ],
    },
    {
      h: "How we protect it",
      p: [
        "Passwords are stored only in protected (hashed) form, connections to the website are encrypted, and access to personal data is limited to people who need it to provide our services.",
      ],
    },
    {
      h: "Your rights",
      p: [
        "Under Ghana's Data Protection Act, 2012 (Act 843), and other laws that may apply to you, you can ask us to:",
      ],
      list: [
        "tell you what personal data we hold about you and give you a copy",
        "correct data that is wrong",
        "delete your data",
        "stop using your data for a purpose you object to, such as our mailing list",
      ],
      after: [
        "To make a request, [contact us](/contact). If you are not satisfied with our answer, you can complain to Ghana's Data Protection Commission.",
      ],
    },
    {
      h: "Children",
      p: ["Our services are for adults. You must be 18 or over to create a participant profile or take paid surveys."],
    },
    {
      h: "Changes and contact",
      p: [
        "We will update this notice when our practices change and show the date at the top. Questions? [Contact us](/contact).",
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  eyebrow: "Terms of use",
  title: "Terms of use",
  intro:
    "These terms apply when you use the Afrimetrica website and its services. Afrimetrica is operated by Regelco International Ltd, a company registered in Ghana. By using the website or creating an account, you agree to them.",
  sections: [
    {
      h: "Your account",
      list: [
        "Give accurate information and keep your password safe.",
        "You are responsible for what happens under your account.",
        "We may suspend accounts that misuse the website or break these terms.",
      ],
    },
    {
      h: "Training courses",
      list: [
        "Course details, dates, fees and payment terms are confirmed in writing when you book. Fees shown or quoted are not final until we confirm them.",
        "Participants who attend and complete a course receive a certificate of completion. It confirms attendance and completion; it is not an accredited academic or professional qualification.",
        "We may change or cancel a course date. If we do, we will offer another date or a refund of fees paid for that date.",
      ],
    },
    {
      h: "Analytics and consultancy",
      p: [
        "Analysis and consultancy work is carried out under a written proposal or agreement, which sets out the scope, timeline, price and how your data will be handled. That agreement takes priority over these terms.",
      ],
    },
    {
      h: "Afrimetrica Surveys",
      list: [
        "If you create a survey, you are responsible for its content, for having a lawful reason to collect the answers, and for telling participants how their answers will be used.",
        "Don't ask for more personal data than you need, and never use surveys to collect passwords, payment details or data about children without proper safeguards.",
        "Participant rewards and the platform fee are shown before you publish a survey.",
        "If you take surveys, answer honestly; responses that fail quality checks may be rejected.",
      ],
    },
    {
      h: "AI features",
      p: [
        "Some features use artificial intelligence to draft questions, read questionnaires or summarise results. AI output can be incomplete or wrong. Check it before you rely on it, and don't treat it as professional advice.",
      ],
    },
    {
      h: "Acceptable use",
      list: [
        "Don't use the website for anything unlawful, harmful or misleading.",
        "Don't try to access accounts or data that aren't yours, or to disrupt the website.",
        "Don't upload content you don't have the right to use.",
      ],
    },
    {
      h: "Our content",
      p: [
        "The website's text, guides, course outlines and design belong to Afrimetrica or its licensors. You may use our free guides and templates for your own work; please credit Afrimetrica when you share them.",
      ],
    },
    {
      h: "Liability",
      p: [
        "We provide the website with reasonable care and skill, but we can't promise it will always be available or error-free. To the extent the law allows, we are not liable for indirect losses, or for decisions made on the basis of information on the website. Nothing in these terms limits liability that cannot be limited by law.",
      ],
    },
    {
      h: "Changes and law",
      p: [
        "We may update these terms and will show the date at the top. These terms are governed by the laws of Ghana. Questions? [Contact us](/contact).",
      ],
    },
  ],
};
