// Checks the questionnaire reader (public/index.html, between IMPORT-START and IMPORT-END) on text laid out
// like real uploads. Fixtures are synthetic: names, emails and phone numbers are made up.
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const block = html.slice(html.indexOf("/*IMPORT-START*/"), html.indexOf("/*IMPORT-END*/"));
const likertWords = html.match(/const LIKERT_WORDS = [^\n]+/)[0];
const parseQuestionnaire = new Function(`${likertWords}\n${block}\nreturn parseQuestionnaire;`)();

let pass = 0, fail = 0;
const check = (name, ok, info) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || info === undefined ? "" : "  " + JSON.stringify(info)}`); };

// --- an academic questionnaire read from a PDF: numbered 1–7 scales, sections, a contact block, demographics ---
const intro = "Thank you very much for agreeing to participate in our study on the strategic change capabilities of firms in Ghana. We are a team of researchers from two universities. Our research seeks to deepen understanding of how firms develop and deploy strategic change capabilities and how these capabilities influence firm outcomes. The purpose of this study is therefore to examine the strategic change capabilities of firms in Ghana and their associated outcomes. The findings will be used solely for academic and research purposes. Participation is voluntary and your answers are confidential. You may stop at any time without giving a reason.";
const S = "\t1\t2\t3\t4\t5\t6\t7";
const academic = [
  "SURVEY ON ENVIRONMENTAL ACTIVITIES OF FIRMS IN GHANA.", intro,
  "SECTION I: REGARDING YOUR STRATEGIC CHANGE CAPABILITY",
  "To what extent do you agree or disagree with the following statements relating to how your firm plans change. Please circle the number that best represents your opinion.",
  "I strongly\tI neither agree\tI strongly", "disagree\tnor disagree\tagree",
  "In this firm we establish a clear rationale for the change we decide to make." + S,
  "In this firm we establish a clear and compelling vision for the change" + S,
  "In this firm we ensure that there is a clear and realistic timeline for executing the change plan" + S,
  "SECTION II: REGARDING YOUR STRATEGIC CHANGE CAPABILITY",
  "To what extent do you agree or disagree with the following statements relating to how your firm prepares employees for change. Please circle the number that best represents your opinion.",
  "I strongly\tI neither agree\tI strongly", "disagree\tnor disagree\tagree",
  "Preparing Employees for Change",
  "Ama Mensah, Ph.D", "Sample Business School", "Accra, Ghana", "Email: ama.mensah@example.edu", "Tel: +233200000000",
  "Kofi Owusu, Ph.D", "Example University of Science and", "Technology", "Kumasi, Ghana", "Email: kofi.owusu@example.org", "Tel: +233200000001",
  "Serial No.: FAM…………",
  "In this firm we communicate the change vision across our firm" + S,
  "In this firm we explain the reasons for making the change and its benefits", "for our firm" + S,
  "Our firm reduced the environmental impacts of its products/service.", "1 2 3 4 5 6 7",
  "Our firm reduced environmental impact by establishing partnerships.",
  "Our firm reduced the risk of environmental accidents, spills, and releases." + S,
  "SECTION VII: ABOUT YOUR COMPANY CHARACTERISTICS",
  "Your gender:\tFemale\tMale",
  "Your education:\tHigh school\tHND\tBachelors\tPostgraduate",
  "1. What is your current position in your company?",
  "2. How long has your company been in business? ____ years ____ months 3. What is your company’s estimated annual sales/revenue (before tax deductions)? US$ ………",
  "Company size\tLess than 100 Full-time Employees\t101-200 Full-time Employees",
  "301-400 Full-time Employees\t400+ Full-time Employees",
  "Your Age? ……………………………………. This ends the questionnaire. Thank you very much for your time and participation.",
];
const a = parseQuestionnaire(academic, "file");
const qs = a.questions, all = JSON.stringify(qs);
const rated = qs.filter((q) => q.type === "rating");
const byText = (rx) => qs.find((q) => rx.test(q.text));
check("title is the questionnaire's title", a.title === "SURVEY ON ENVIRONMENTAL ACTIVITIES OF FIRMS IN GHANA.", a.title);
check("the whole introduction is kept", a.description.includes("Participation is voluntary") && a.description.length > 600, a.description.length);
check("statements ending in 1–7 become 7-point rating questions", rated.length === 8 && rated.every((q) => q.scale.min === 1 && q.scale.max === 7), rated.map((q) => q.text));
check("the scale's end labels come from the legend", rated.every((q) => q.scale.minLabel === "Strongly disagree" && q.scale.maxLabel === "Strongly agree"), rated[0] && rated[0].scale);
check("scale numbers are not left in the wording", rated.every((q) => !/\d\s+\d\s+\d/.test(q.text)));
check("a statement wrapped over two lines is joined", !!byText(/^In this firm we explain the reasons for making the change and its benefits for our firm$/), rated.map((q) => q.text));
check("a statement whose numbers are on the next line is kept", !!byText(/^Our firm reduced the environmental impacts of its products\/service\.$/));
check("a statement that lost its numbers is still kept", !!byText(/^Our firm reduced environmental impact by establishing partnerships\.$/));
check("section headings and instructions go above their first question", /^SECTION I:/.test(rated[0].section.title) && /To what extent/.test(rated[0].section.text) && /^SECTION II:/.test((qs[3].section || {}).title || ""), [rated[0].section, qs[3].section]);
check("a short title inside a block becomes a sub-heading", !!qs.find((q) => q.section && /^SECTION II/.test(q.section.title) && q.section.sub === "Preparing Employees for Change"), qs.map((q) => q.section && q.section.title));
check("contact details, serial numbers and legends never become questions or options", !/@|Tel|Ph\.D|Serial|Business School|Accra, Ghana|Kumasi|strongly|nor disagree|Technology/i.test(all.replace(/"minLabel":"Strongly disagree","maxLabel":"Strongly agree"/g, "")), all.match(/.{40}(@|Tel|Ph\.D|Serial|Business School|Kumasi|nor disagree|Technology).{20}/));
const gender = byText(/^Your gender/), edu = byText(/^Your education/);
check("'Your gender: Female  Male' becomes a choice with two options", gender && gender.type === "single" && gender.options.join("|") === "Female|Male", gender);
check("options separated by gaps are split", edu && edu.options.join("|") === "High school|HND|Bachelors|Postgraduate", edu);
const howLong = byText(/^How long has your company/), sales = byText(/estimated annual sales/);
check("two numbered questions on one line are split", howLong && sales && howLong !== sales, qs.map((q) => q.text));
check("'How long…' asks for a number", howLong && howLong.type === "number", howLong);
const size = byText(/^Company size/);
check("options continuing on the next line are added", size && size.type === "single" && size.options.length === 4, size);
const age = byText(/^Your Age/);
check("the closing thank-you is dropped and age asks for a number", age && age.text === "Your Age?" && age.type === "number" && !/ends the questionnaire|Thank you/i.test(all), age);
check("the last section's heading goes on its first question", /^SECTION VII/.test((gender.section || {}).title || ""), gender.section);

// --- an ordinary numbered questionnaire (Word or text) keeps working ---
const plain = [
  "Customer survey", "Please answer every question.",
  "1. How often do you shop with us?", "a) Daily", "b) Weekly", "c) Monthly",
  "2. Which products did you buy? (select all that apply)", "• Food", "• Clothes", "• Electronics",
  "3. How satisfied are you with our service?", "Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied",
  "4. On a scale of 0 to 10, how likely are you to recommend us?",
  "5. How old are you?",
  "6. Any other comments?",
];
const p = parseQuestionnaire(plain, "file");
check("plain questionnaire: six questions", p.questions.length === 6, p.questions.map((q) => q.text));
check("plain questionnaire: types are recognised", p.questions.map((q) => q.type).join(",") === "single,multi,likert,rating,number,text", p.questions.map((q) => q.type));
check("plain questionnaire: options are cleaned", p.questions[0].options.join("|") === "Daily|Weekly|Monthly" && p.questions[1].options.join("|") === "Food|Clothes|Electronics", p.questions.slice(0, 2));
check("plain questionnaire: 0–10 scale", p.questions[3].scale && p.questions[3].scale.min === 0 && p.questions[3].scale.max === 10);
check("plain questionnaire: no sections invented", p.questions.every((q) => !q.section));
check("plain questionnaire: intro kept", p.title === "Customer survey" && p.description === "Please answer every question.", p);

// --- options on one line with tick boxes, and a numbered rating legend ---
const boxes = parseQuestionnaire(["Staff survey", "1. Do you work full time? ☐ Yes ☐ No", "Rate each statement where 1 = strongly disagree and 5 = strongly agree.", "My manager listens to me 1 2 3 4 5", "I have the tools I need 1 2 3 4 5"], "file");
check("tick boxes on one line become options", boxes.questions[0].options.join("|") === "Yes|No", boxes.questions[0]);
check("'1 = … and 5 = …' gives the end labels", boxes.questions[1].type === "rating" && boxes.questions[1].scale.max === 5 && boxes.questions[1].scale.minLabel === "Strongly disagree" && boxes.questions[2].scale.maxLabel === "Strongly agree", boxes.questions.slice(1));

// --- details seen in PDFs: a caps title after the contacts, single-line legends, wide gaps, wrapped closings ---
const pdf = parseQuestionnaire(["Ama Mensah, Ph.D", "Sample Business School", "Email: ama@example.edu", "Serial No.: 12", "SURVEY ON FIRMS IN GHANA.", "Thank you for taking part in this study.",
  "SECTION I: ABOUT CHANGE", "Please circle the number that best represents your opinion.", "I strongly\tI neither agree\tI strongly", "disagree\tnor disagree\tagree",
  "We plan change carefully." + S, "We review change often." + S, "SECTION II: ABOUT YOU",
  "1. Ownership structure:      State owned        Non-state owned", "2. Your age? ………… This ends the questionnaire. Thank you very much for your time and", "participation."], "file");
check("a title in capitals after the contact block is the title", pdf.title === "SURVEY ON FIRMS IN GHANA." && pdf.description === "Thank you for taking part in this study.", [pdf.title, pdf.description]);
check("legend pieces on separate lines give the end labels and no sub-heading", pdf.questions[0].scale.minLabel === "Strongly disagree" && !pdf.questions[0].section.sub, pdf.questions[0]);
check("wide gaps between options split them", pdf.questions[2].text === "Ownership structure:" && pdf.questions[2].options.join("|") === "State owned|Non-state owned", pdf.questions[2]);
check("a closing sentence wrapped onto the next line is dropped", pdf.questions[3].text === "Your age?" && pdf.questions.length === 4, pdf.questions.slice(3));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
