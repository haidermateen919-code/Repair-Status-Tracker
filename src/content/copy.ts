/**
 * Every user-facing string in the app (PRD §5.3, §8). Components must not
 * contain literal copy, so that a full-Urdu/RTL release is a change to this
 * file rather than a rewrite.
 *
 * Owner UI: English labels + a short Roman Urdu helper where useful.
 * Customer UI: English status word paired with a Roman Urdu reassurance line.
 */

import type { JobStatus } from "@/lib/status";

export type StatusCopy = {
  /** English label used everywhere. */
  label: string;
  /** Short Roman Urdu helper shown to the owner under the English label. */
  ownerHelper: string;
  /** One reassuring Roman Urdu sentence shown to the customer. */
  customerMessage: string;
};

const status: Record<JobStatus, StatusCopy> = {
  RECEIVED: {
    label: "Received",
    ownerHelper: "Cheez mil gayi",
    customerMessage: "Aap ki cheez dukaan pe mil gayi hai.",
  },
  IN_REPAIR: {
    label: "In repair",
    ownerHelper: "Repair ho rahi hai",
    customerMessage: "Abhi repair ho rahi hai.",
  },
  WAITING_FOR_PART: {
    label: "Waiting for part",
    ownerHelper: "Part ka intezar",
    customerMessage: "Part ka intezar hai — thoda waqt lagega.",
  },
  READY: {
    label: "Ready",
    ownerHelper: "Theek ho gayi",
    customerMessage: "Aap ki cheez theek ho gayi hai. Dukaan se le jayen.",
  },
  DELIVERED: {
    label: "Delivered",
    ownerHelper: "De di gayi",
    customerMessage: "Aap ki cheez de di gayi hai. Shukriya!",
  },
  CANCELLED: {
    label: "Cancelled",
    ownerHelper: "Cancel",
    customerMessage: "Yeh repair cancel kar di gayi hai. Dukaan se rabta karein.",
  },
};

export const copy = {
  app: {
    name: "Repair Status Tracker",
    description: "Apni cheez ki repair ka status dekhein.",
  },

  common: {
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    cancel: "Cancel",
    close: "Close",
    copy: "Copy link",
    copied: "Link copy ho gaya",
    copyFailed: "Copy nahi hua — link ko daba kar copy karein",
    call: "Call",
    whatsapp: "WhatsApp",
    back: "Wapas",
    tryAgain: "Dobara try karein",
    optional: "optional",
    none: "—",
    confirm: "Confirm",
    more: "More",
    delete: "Delete",
    required: "Required",
  },

  nav: {
    dashboard: "Jobs",
    newJob: "Naya job",
    logout: "Log out",
    loggedInAs: "Logged in as",
  },

  auth: {
    title: "Owner login",
    subtitle: "Apni dukaan ka hisab rakhein.",
    emailLabel: "Email",
    emailPlaceholder: "owner@shop.pk",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    submit: "Log in",
    submitting: "Logging in…",
    invalidCredentials:
      "Email ya password theek nahi hai. Agar bohat zyada koshishein kar li hain to 15 minute baad try karein.",
    genericError: "Login nahi ho saka. Internet check karke dobara try karein.",
    missingFields: "Email aur password dono likhein.",
  },

  dashboard: {
    title: "Jobs",
    counts: (active: number, ready: number) => `Active ${active} · Ready ${ready}`,
    tabs: {
      active: "Active",
      ready: "Ready",
      delivered: "Delivered",
      all: "All",
    },
    searchLabel: "Search jobs",
    searchPlaceholder: "Naam, number, cheez ya #job",
    searchClear: "Clear search",
    newJob: "+ Naya job",
    emptyTitle: "Abhi koi repair nahi.",
    emptyBody: "+ Naya job se shuru karein.",
    emptyReadyTitle: "Koi cheez ready nahi hai.",
    emptyReadyBody: "Jab cheez theek ho jaye, status Ready karein.",
    emptyDeliveredTitle: "Abhi koi delivered job nahi.",
    emptyDeliveredBody: "Delivered jobs yahan aa jayengi.",
    noResultsTitle: "Kuch nahi mila.",
    noResultsBody: "Naam ya number check karein.",
    noResultsClear: "Search clear karein",
    jobNumber: (jobNumber: number) => `#${jobNumber}`,
    expectedPrefix: "expected:",
    expectedMissing: "—",
    share: "WhatsApp",
  },

  newJob: {
    title: "Naya job",
    subtitle: "Sirf naam, number aur cheez zaroori hain.",
    customerNameLabel: "Customer name",
    customerNamePlaceholder: "Ali Raza",
    customerPhoneLabel: "Customer phone",
    customerPhonePlaceholder: "0300 1234567",
    customerPhoneHint: "03001234567 ya +923001234567",
    itemNameLabel: "Item",
    itemNamePlaceholder: "Geyser",
    itemChipsLabel: "Quick pick",
    itemChips: ["Juicer", "Geyser", "Heater", "Fan", "Other"] as const,
    issueLabel: "Fault / issue",
    issuePlaceholder: "heating nahi kar raha",
    estimateDaysLabel: "Estimated days",
    estimateDaysHint: "1–30 din",
    expectedReadyLabel: "Expected ready date",
    internalNoteLabel: "Internal note",
    internalNoteHint: "Customer ko nahi dikhega",
    submit: "Save job",
    submitting: "Saving…",
    created: (jobNumber: number) => `Job #${jobNumber} ban gaya`,
    validation: {
      nameRequired: "Customer ka naam likhein.",
      nameTooLong: "Naam bohat lamba hai (80 harf tak).",
      phoneRequired: "Phone number likhein.",
      phoneInvalid: "Phone number theek nahi. Misal: 0300 1234567.",
      itemRequired: "Cheez ka naam likhein.",
      itemTooLong: "Cheez ka naam bohat lamba hai (60 harf tak).",
      issueTooLong: "Fault bohat lamba hai (300 harf tak).",
      noteTooLong: "Note bohat lamba hai (300 harf tak).",
      estimateRange: "Din 1 se 30 ke darmiyan likhein.",
    },
    submitError: "Job save nahi hui. Internet check karke dobara try karein.",
  },

  jobDetail: {
    backToJobs: "Wapas jobs par",
    jobNumber: (jobNumber: number) => `Job #${jobNumber}`,
    createdLabel: "Created",
    itemLabel: "Item",
    issueLabel: "Fault",
    issueMissing: "—",
    statusLabel: "Status",
    statusHint: "Ek tap — foran save ho jata hai.",
    updateStatusError: "Status save nahi hua. Dobara try karein.",
    cancelJob: "Cancel job",
    cancelJobConfirmTitle: "Job cancel karein?",
    cancelJobConfirmBody:
      "Customer ko cancel status dikhega. Aap baad mein dobara khol sakte hain.",
    cancelJobConfirm: "Haan, cancel karein",
    reopenJobConfirmTitle: "Job dobara kholein?",
    reopenJobConfirmBody:
      "Yeh job band ho chuki hai (delivered/cancelled). Status badalne se job dobara khul jayegi.",
    reopenJobConfirm: "Haan, khol dein",
    expectedReadyLabel: "Expected ready date",
    expectedReadyHint: "Customer ko yahi date dikhegi.",
    dateLabel: "Date",
    daysStepperLabel: "Days from today",
    daysStepperApply: "Set date",
    clearDate: "Clear",
    publicNoteLabel: "Public note",
    publicNoteHint: "Customer ko dikhta hai. Khali chhod dein to kuch nahi dikhega.",
    publicNoteSave: "Save note",
    internalNoteLabel: "Internal note",
    internalNoteHint: "Sirf aap ko dikhta hai.",
    internalNoteSave: "Save note",
    shareTitle: "Customer ka link",
    shareHint: "Yeh link WhatsApp par bhejein. Status khud badalta rehta hai.",
    shareWhatsApp: "WhatsApp pe bhejein",
    shareUpdate: "Customer ko batao",
    timelineTitle: "Timeline",
    timelineEmpty: "Abhi koi update nahi.",
    timelineNoteUpdated: "Public note updated",
    dangerZone: "Danger zone",
    deleteJob: "Delete job",
    deleteJobConfirmTitle: "Job delete karein?",
    deleteJobConfirmBody:
      "Job list se hat jayegi aur customer ka link band ho jayega. Wapas nahi aa sakti.",
    deleteJobConfirm: "Haan, delete karein",
    deleteJobError: "Job delete nahi hui. Dobara try karein.",
    notFoundTitle: "Job nahi mili.",
    notFoundBody: "Ho sakta hai delete ho gayi ho.",
    overdue: (days: number) => `${days} din late`,
  },

  publicStatus: {
    title: "Repair status",
    jobNumber: (jobNumber: number) => `Job #${jobNumber}`,
    itemLabel: "Item",
    issueLabel: "Fault",
    statusLabel: "Current status",
    expectedLabel: "Andaza",
    expectedToday: "Andaza: aaj",
    expectedDays: (humanDate: string, days: number) => `Andaza: ${humanDate} (${days} din)`,
    expectedSoon: (humanDate: string) => `Andaza: ${humanDate} (kal)`,
    overdueNote: (days: number) =>
      `Andaza se ${days} din zyada lag rahe hain — dukaan se rabta karein.`,
    overdueToday: "Andaza aaj tak tha — dukaan se rabta karein.",
    noteLabel: "Dukaan ki taraf se",
    timelineTitle: "Updates",
    noteUpdated: "Note updated",
    updatedAt: (when: string) => `Last updated ${when}`,
    shopTitle: "Dukaan",
    shopTimings: "Timings",
    shopAddress: "Address",
    whatsappShop: "WhatsApp",
    callShop: "Call",
    lostLink: "Link kho gaya? Number se try karein",
    invalidTitle: "Yeh link kaam nahi kar raha.",
    invalidBody: "Phone number se try karein.",
    invalidCta: "Phone number se dekhein",
  },

  track: {
    title: "Apni repair dhoondein",
    subtitle: "Wahi number likhein jo dukaan par diya tha.",
    phoneLabel: "Phone number",
    phonePlaceholder: "0300 1234567",
    submit: "Dekhein",
    submitting: "Dekh rahe hain…",
    invalidPhone: "Number theek nahi. Misal: 0300 1234567.",
    emptyTitle: "Koi repair nahi mili.",
    emptyBody: "Number check karein ya dukaan se rabta karein.",
    resultsTitle: (count: number) => (count === 1 ? "1 repair mili" : `${count} repairs mili`),
    open: "Status dekhein",
    rateLimitedTitle: "Bohat zyada koshishein.",
    rateLimitedBody: "15 minute baad try karein ya dukaan ko call karein.",
    errorTitle: "Kuch masla hua.",
    errorBody: "Internet check karke dobara try karein.",
    privacyNote: "Hum sirf aap ke number ki repairs dikhate hain.",
    ownerLogin: "Dukaan owner login",
  },

  errors: {
    genericTitle: "Kuch masla hua.",
    genericBody: "Dobara try karein.",
    notFoundTitle: "Safha nahi mila.",
    notFoundBody: "Yeh page mojood nahi hai.",
    offline: "Internet nahi hai",
    offlineBody: "Connection wapas aane par form dobara try karein.",
    validation: "Kuch fields theek nahi hain.",
    rateLimited: "Bohat zyada koshishein. Thodi der baad try karein.",
  },

  status,

  whatsapp: {
    newJobMessage: (params: {
      customerName: string;
      itemName: string;
      jobNumber: number;
      publicUrl: string;
      shopName: string;
      shopPhone: string;
    }) =>
      `Assalam-o-alaikum ${params.customerName}! Aap ki ${params.itemName} (#${params.jobNumber}) ki repair ka status yahan dekh sakte hain:\n${params.publicUrl}\n\nDukaan: ${params.shopName} — ${params.shopPhone}`,
    updateMessage: (params: {
      customerName: string;
      itemName: string;
      jobNumber: number;
      statusLabel: string;
      publicUrl: string;
    }) =>
      `${params.customerName}, aap ki ${params.itemName} (#${params.jobNumber}) ka status update: ${params.statusLabel}\n${params.publicUrl}`,
  },
} as const;

export type Copy = typeof copy;

/** Convenience accessor so components never index the copy object by hand. */
export function statusCopy(statusValue: JobStatus): StatusCopy {
  return copy.status[statusValue];
}
