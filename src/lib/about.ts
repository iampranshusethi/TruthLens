/**
 * Everything the About page says about the developer, in one place.
 * Taken from the developer's own LinkedIn profile and posts; only confirmed facts.
 * Fields left empty are simply not shown.
 */
export const DEVELOPER = {
  name: "Pranshu Sethi",
  /** Profile photo URL (LinkedIn). If it ever fails to load, initials are shown instead. */
  // LinkedIn photo links are signed and expire (this one on 19 Nov 2026); a copy in /public would last.
  photo:
    "https://media.licdn.com/dms/image/v2/D5603AQFFLV9BUgWcJA/profile-displayphoto-crop_800_800/B56aCgzYgpG0AM-/0/1789404222069?e=1795046400&v=beta&t=NyLBd9Wx6P2uLV0LvgOJvC2s-hvkYxL2LpYqbKvco-0",
  headline: "B.Tech IT at IIIT Allahabad · AI and software engineering",
  intro:
    "I build AI products for people who usually get left out of software: tenants signing their first agreement, a milkman who'd rather speak than type. TruthLens began as a solo 24-hour hackathon build in my first year at IIIT Allahabad. I rebuilt it from scratch to see how far careful engineering could take the idea.",
  links: {
    github: "https://github.com/iampranshusethi",
    linkedin: "https://www.linkedin.com/in/pranshusethi/",
  },
  /** Newest first. */
  timeline: [
    {
      when: "Oct 2026",
      title: "Top 3, Sarvam AI buildathon",
      detail: "Built Bolo, a voice-first app builder for Indian languages, in 45 minutes at IIIT Allahabad.",
    },
    {
      when: "Oct 2026",
      title: "Led an AI/ML workshop for 100+ first-years",
      detail: "Ran most of a Gravity session on what you can actually build with AI, using TruthLens as a case study.",
    },
    {
      when: "Sep 2026",
      title: "Joined Gravity's AI Wing and GDG IIITA's Web Development Wing",
      detail: "Building AI-driven projects and modern web products with two of the institute's tech communities.",
    },
    {
      when: "Nov 2025",
      title: "Runner-up, IIITA × Eudia AI-ML hackathon",
      detail: "Built TruthLens v1 solo in 24 hours and won the ₹40,000 runner-up award, competing against 33 teams.",
    },
    {
      when: "Oct 2025",
      title: "Cyber Security Wing, Club of Professionals",
      detail: "Working on institute and government-backed projects around network security and digital infrastructure.",
    },
    {
      when: "Aug 2025",
      title: "Started B.Tech in Information Technology",
      detail: "Indian Institute of Information Technology Allahabad, class of 2029.",
    },
  ] as { when: string; title: string; detail: string }[],
};

export const PROJECTS: { name: string; tagline: string; detail: string; href?: string }[] = [
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
      "Describe the app you need out loud in your own language, or photograph the notebook you already keep, and get a working app in your own script. Top 3 at the Sarvam AI buildathon.",
    href: "https://github.com/iampranshusethi/bolo",
  },
  {
    name: "BlackiaX",
    tagline: "An AI co-pilot for crypto trading",
    detail:
      "Market, news, portfolio and insight agents work together: LLM sentiment on live news, a combined signal score, strategy modes and a full trading simulation with live P&L.",
  },
];
