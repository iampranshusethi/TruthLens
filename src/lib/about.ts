/**
 * Everything the About page says about the developer, in one place.
 * Only confirmed facts go here. Fields left empty are simply not shown.
 */
export const DEVELOPER = {
  name: "Pranshu Sethi",
  /** One line under the name, e.g. "Computer science student at …". Fill from LinkedIn. */
  headline: "",
  intro:
    "I build software for people who usually get left out of it: tenants signing their first agreement, small shop owners who'd rather speak than type. TruthLens started as a 24-hour hackathon build in my first year, and I rebuilt it from scratch to see how far careful engineering could take the idea.",
  links: {
    github: "https://github.com/iampranshusethi",
    /** Fill in the public LinkedIn profile URL. */
    linkedin: "",
  },
  /** Education, roles and achievements from LinkedIn, newest first. */
  timeline: [
    {
      when: "2025",
      title: "Runner-up, Eudia legal AI hackathon",
      detail: "Built TruthLens v1 in 24 hours as a first-year student and won the ₹40,000 runner-up award.",
    },
  ] as { when: string; title: string; detail: string }[],
};

export const PROJECTS = [
  {
    name: "TruthLens",
    tagline: "Know what you're signing",
    detail:
      "Reviews rental agreements, insurance policies and contracts clause by clause. Every finding is checked word for word against the document, personal details are hidden before analysis, and it runs entirely on free AI tiers.",
    href: "https://github.com/iampranshusethi/TruthLens",
  },
  {
    name: "Bolo",
    tagline: "Speak it. Snap it. It's an app.",
    detail:
      "Lets a milkman, tutor or tailor describe the app they need out loud, in their own language, or photograph the notebook they already keep, and get a working app in their own script.",
    href: "https://github.com/iampranshusethi/bolo",
  },
];
