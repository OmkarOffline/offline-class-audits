/* =========================================================
   CONFIG — shared by every page. Fill these in before going live (see SETUP.md)
   ========================================================= */
const CONFIG = {
  GOOGLE_CLIENT_ID: "353541612670-tr8iqd78in1tcv2j99ibrp4tj1ujd31u.apps.googleusercontent.com",
  APPS_SCRIPT_URL: "",           // e.g. "https://script.google.com/macros/s/XXXX/exec"
  ALLOWED_DOMAIN: "artiumacademy.com"
};

/* =========================================================
   DATA — from "Basic Information" sheet
   ========================================================= */
const ALL = "All Centres";
const CENTRES = [
  { name: "Alwarpet",      city: "Chennai" },
  { name: "Thoraipakkam",  city: "Chennai" },
  { name: "Borewell Road", city: "Bangalore" }
];
/* Everyone who can sign in. audit: "Auditor" fills audits; "Auditee" (teacher) only sees their scores.
   Keep in step with the "Offline Team" tab (the server reads that tab directly). */
const TEAM = [
  { name: "Omkar Shirsat",    role: "Head of Offline Operations", centre: ALL,             course: "",               email: "omkar@artiumacademy.com",          audit: "Auditor" },
  { name: "Mahalakshmi R",    role: "Centre Manager",             centre: "Alwarpet",      course: "",               email: "mahalakshimi@artiumacademy.com",   audit: "Auditor" },
  { name: "Padma Priya",      role: "Centre Manager",             centre: "Thoraipakkam",  course: "",               email: "padma@artiumacademy.com",          audit: "Auditor" },
  { name: "Dipali Modhvadia", role: "Centre Manager",             centre: "Borewell Road", course: "",               email: "dipali@artiumacademy.com",         audit: "Auditor" },
  { name: "Poojalakshmi R",   role: "Academic Counsellor",        centre: "Alwarpet",      course: "",               email: "poojalakshmi@artiumacademy.com",   audit: "Auditor" },
  { name: "Devika Dev",       role: "Academic Counsellor",        centre: "Thoraipakkam",  course: "",               email: "poojalakshmi@artiumacademy.com",   audit: "Auditor" },
  { name: "Sneha KS",         role: "Academic Counsellor",        centre: "Borewell Road", course: "",               email: "sneha.ks@artiumacademy.com",       audit: "Auditor" },
  { name: "Pooja Jagan",      role: "Teacher", centre: "Alwarpet",      course: "South Vocals",   email: "pooja.j@artiumacademy.com",       audit: "Auditee" },
  { name: "Anila Raman",      role: "Teacher", centre: "Alwarpet",      course: "South Vocals",   email: "anila@artiumacademy.com",         audit: "Auditee" },
  { name: "Rajasree Reghu",   role: "Teacher", centre: "Alwarpet",      course: "South Vocals",   email: "rajasree@artiumacademy.com",      audit: "Auditee" },
  { name: "Vishnu Prakash",   role: "Teacher", centre: "Alwarpet",      course: "South Vocals",   email: "vishnu@artiumacademy.com",        audit: "Auditee" },
  { name: "Suriya Prakash",   role: "Teacher", centre: "Alwarpet",      course: "Keyboard",       email: "suriyaprakash@artiumacademy.com", audit: "Auditee" },
  { name: "Boja Rajan",       role: "Teacher", centre: "Alwarpet",      course: "Guitar",         email: "boja@artiumacademy.com",          audit: "Auditee" },
  { name: "Alex George",      role: "Teacher", centre: "Thoraipakkam",  course: "South Vocals",   email: "alex@artiumacademy.com",          audit: "Auditee" },
  { name: "Sobitha Baburaj",  role: "Teacher", centre: "Thoraipakkam",  course: "South Vocals",   email: "sobitha@artiumacademy.com",       audit: "Auditee" },
  { name: "Jisna Manoj",      role: "Teacher", centre: "Thoraipakkam",  course: "South Vocals",   email: "",                                audit: "Auditee" },
  { name: "Dharshana V",      role: "Teacher", centre: "Thoraipakkam",  course: "South Vocals",   email: "",                                audit: "Auditee" },
  { name: "Shraddha Pakhare", role: "Teacher", centre: "Thoraipakkam",  course: "Western Vocals", email: "",                                audit: "Auditee" },
  { name: "Balu Mungali",     role: "Teacher", centre: "Thoraipakkam",  course: "Keyboard",       email: "balu@artiumacademy.com",          audit: "Auditee" },
  { name: "Siva Shanker",     role: "Teacher", centre: "Thoraipakkam",  course: "Guitar",         email: "siva@artiumacademy.com",          audit: "Auditee" },
  { name: "Prachita Patil",   role: "Teacher", centre: "Borewell Road", course: "North Vocals",   email: "prachita.p@artiumacademy.com",    audit: "Auditee" },
  { name: "Vrinda Pillai",    role: "Teacher", centre: "Borewell Road", course: "South Vocals",   email: "vrinda@artiumacademy.com",        audit: "Auditee" },
  { name: "Konaok Phom",      role: "Teacher", centre: "Borewell Road", course: "Western Vocals", email: "konaok@artiumacademy.com",        audit: "Auditee" },
  { name: "Joel Devraj",      role: "Teacher", centre: "Borewell Road", course: "Keyboard",       email: "joel@artiumacademy.com",          audit: "Auditee" },
  { name: "Gagan Kumar",      role: "Teacher", centre: "Borewell Road", course: "Guitar",         email: "gagan@artiumacademy.com",         audit: "Auditee" }
];
const AUDITORS = TEAM.filter(p => p.audit === "Auditor");
const TEACHERS = TEAM.filter(p => p.audit === "Auditee");
const BATCH_TYPES = ["Kids", "Adults", "Mixed"];
// Centre hours by weekday (0 = Sunday). null = weekly off. Batches run hourly within these hours.
const HOURS = { 0: [8, 16], 1: null, 2: [13, 21], 3: [13, 21], 4: [13, 21], 5: [13, 21], 6: [13, 21] };

/* Leaderboard weighting. Each teacher's average is blended with the overall average as if they
   had this many extra audits at the overall average, so a teacher with one great audit can't top
   the board. The more audits a teacher has, the closer their weighted score gets to their own average. */
const LEADERBOARD = { priorAudits: 3 };

/* Automatic referral to the academic team — placeholder rules, change any time.
   Keep in sync with REFERRAL_RULES in Code.gs (the server re-checks). */
const REFERRAL_RULES = {
  minScorePct: 60,     // refer if score % is below this
  zeroRatingsLimit: 4  // refer if this many items or more are rated 0
};

/* =========================================================
   CHECKLIST — from "Audit Checklist | Centre Manager" › Omkar tab
   ========================================================= */
const CHECKLIST = [
  { id: "A", title: "Class Readiness", items: [
    { id: "A1", p: "Class starts and ends on time; setup doesn't eat into teaching time",
      look: "Teaching begins within the first five minutes; tuning (in case of 1st class of the day) and books are sorted before learners settle" },
    { id: "A2", p: "Learning resources are ready and utilised",
      look: "Instruments, books, stands and audio/video are available and accessible, and used during the class wherever applicable." }
  ]},
  { id: "B", title: "Opening the Class", items: [
    { id: "B1", p: "Teacher recaps the previous class",
      look: "Asks learners what they learned last class, or briefly revisits it, before starting the day's agenda (listed topics on the dashboard)" },
    { id: "B2", p: "Teacher checks in on homework / practice since the last class",
      look: ["Asks each learner what they practised (generally homework, and any extra mile the student has gone)",
             "Asks if they tried anything new and if they found anything difficult",
             "Asks them to demonstrate what they learned / practised / explored",
             "Offers constructive feedback on the homework and classwork done"] },
    { id: "B3", p: "Today's learning objective is stated",
      look: ["Teacher tells learners what they will learn or work on today",
             "Clearly displays / writes the lesson objectives on the screen, whiteboard, chart paper or posters"] }
  ]},
  { id: "C", title: "Teacher Demeanour", items: [
    { id: "C1", p: "Teacher greets each learner by name",
      look: "Individual greeting on arrival or at the start; uses learners' names during class" },
    { id: "C2", p: "Teacher is patient with mistakes and repeated questions",
      look: "No raised voice, sighs or visible irritation; doesn't take over the instrument or sing over the learner; lets the learner try again" }
  ]},
  { id: "D", title: "Teaching & Individual Attention", items: [
    { id: "D1", p: "Teacher demonstrates before asking learners to try",
      look: "Shows the part first, often in small chunks, then the learner attempts it" },
    { id: "D2", p: "Teacher adapts when a learner struggles",
      look: "After 2 to 3 failed attempts, the teacher changes approach: slows down, breaks it into smaller parts or demonstrates differently (employs visual / sketch / textual / aural / sensory activity prompts as applicable)" },
    { id: "D3", p: "Authentic checks on understanding, avoids 'teacher echo'",
      look: "Asks the learners to sing / play / demonstrate a skill or concept back instead of asking \"understood?\"" },
    { id: "D4", p: "Teacher actively supervises during practice time",
      look: "Moves around the room and checks on each learner; doesn't assign a task and then sit idle or look elsewhere" },
    { id: "D5", p: "Every learner gets a turn and individual attention",
      look: "Each learner sings or plays individually at least once; no learner is skipped or ignored" },
    { id: "D6", p: "No idle time, 100% engagement through the paid class duration",
      look: "No stretch of more than 2 to 3 minutes where learners are waiting with nothing to do, or on 'stand by' while another student is being attended to." }
  ]},
  { id: "E", title: "Feedback", items: [
    { id: "E1", p: "Feedback is given in an encouraging manner",
      look: "Mentions what went well before what to fix; never compares learners or corrects in a mocking way; learner tries again willingly rather than going quiet" },
    { id: "E2", p: "Feedback is specific, not generic",
      look: "Feedback refers to exact topics and gives something objective / concrete for the learner to act on, not just \"good job!\" or \"try again\" (judge specificity, not musical accuracy)" }
  ]},
  { id: "F", title: "Learner Participation", items: [
    { id: "F1", p: "Learners spend most of the class doing, not watching",
      look: "Singing class: learners are singing for more than 50% of the lesson. Instrument class: learners are playing for more than 50% of the lesson. The teacher doesn't do most of the singing or playing, and doesn't lecture for more than 15–20 minutes in a lesson." },
    { id: "F2", p: "Learners ask questions",
      look: "All learners participate actively: discussing, debating or asking questions throughout the class when they are not performing." }
  ]},
  { id: "G", title: "Closing the Class", items: [
    { id: "G1", p: "There is a visible win by the end of class: tangible outcomes per class",
      look: "At least one learner can do something at the end that they couldn't at the start" },
    { id: "G2", p: "Teacher recaps what was covered",
      look: "Summarises the class, or asks learners to summarise it" },
    { id: "G3", p: "Teacher discusses the practice plan with the learner",
      look: "Goes through what to practise, how and how often, and checks the learner understood; doesn't just post it on the app" }
  ]},
  { id: "H", title: "Learner Check (ask 1 to 2 learners after class)", items: [
    { id: "H1", p: "Learner can explain what they learned today",
      look: "The learners describe the day's learning in their own words" },
    { id: "H2", p: "Learner knows what to practise at home",
      look: "Can say what they'll practise, and roughly why and how" }
  ]}
];
const ITEMS = CHECKLIST.flatMap(s => s.items.map(i => ({ ...i, section: s.id + ". " + s.title })));
const RATINGS = [
  { v: "2",  label: "Consistently" },
  { v: "1",  label: "Partly" },
  { v: "0",  label: "Not observed" },
  { v: "NA", label: "Not applicable", short: "N/A" }
];
