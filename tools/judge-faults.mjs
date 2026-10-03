// The faults the measuring plants, each against one writing rule of the experience schema, over
// the example's own entries, so the judge is asked about a faulted page and the same page
// without the fault. Planted in code rather than copied into files, so they cannot drift from
// the example they are planted on. `rule` is the opening of the rule each one breaks;
// verify/judge-faults.test.mjs holds it to exactly one rule.

// The `## Achievements` of a page as groups of bullets, each bullet its lines, and the lines it
// spans, so a fault can rewrite the section and leave the rest of the page as it was.
/** @param {string[]} lines */
function achievementsOf(lines) {
  const start = lines.indexOf("## Achievements");
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end < 0) end = lines.length;
  /** @type {{ heading: string; bullets: string[][] }[]} */
  const groups = [];
  for (const line of lines.slice(start + 1, end)) {
    const last = groups[groups.length - 1];
    if (line.startsWith("### ")) groups.push({ heading: line.slice(4).trim(), bullets: [] });
    else if (/^[-*]\s/.test(line) && last) last.bullets.push([line]);
    else if (/^\s+\S/.test(line) && last?.bullets.length) last.bullets[last.bullets.length - 1]?.push(line);
  }
  return { start, end, groups };
}

/**
 * @param {string[]} lines
 * @param {{ start: number; end: number }} at
 * @param {{ heading: string; bullets: string[][] }[]} groups
 */
function withAchievements(lines, { start, end }, groups) {
  const body = groups.filter((g) => g.bullets.length).flatMap((g) => ["", `### ${g.heading}`, "", ...g.bullets.flat()]);
  const rest = lines.slice(end);
  return `${[...lines.slice(0, start + 1), ...body, ...(rest.length ? ["", ...rest] : [])].join("\n").replace(/\n*$/, "")}\n`;
}

/** @param {string[]} bullet */
const textOf = (bullet) => bullet.map((l) => l.trim()).join(" ").replace(/^[-*]\s+/, "");

export const FAULTS = [
  {
    name: "a stack listed as an achievement",
    rule: "A list of tools or a stack is not an achievement",
    /** @param {string} text */
    plant(text) {
      const lines = text.split("\n");
      const at = achievementsOf(lines);
      if (!at || !at.groups[0]) return null;
      at.groups[0].bullets.unshift(["- Java, Kafka, Kubernetes and Terraform."]);
      return { text: withAchievements(lines, at, at.groups) };
    },
  },
  {
    name: "a skill the body does not show",
    rule: "Every entry in `skills:` is one the body shows",
    /**
     * @param {string} text
     * @param {{ skills: string[] }} context
     */
    plant(text, { skills }) {
      const lines = text.split("\n");
      const fence = lines.indexOf("---", 1);
      const listed = lines.slice(0, fence).filter((l) => /^\s+-\s/.test(l)).map((l) => l.replace(/^\s+-\s+/, "").trim());
      const body = lines.slice(fence + 1).join("\n").toLowerCase();
      const skill = skills.find((s) => !listed.includes(s) && !body.includes(s.toLowerCase()));
      if (!skill) return null;
      const at = lines.indexOf("skills:");
      if (at >= 0 && at < fence) lines.splice(at + 1, 0, `  - ${skill}`);
      else lines.splice(fence, 0, "skills:", `  - ${skill}`);
      return { text: lines.join("\n") };
    },
  },
  {
    name: "a bullet under a kind it is not chiefly evidence of",
    rule: "Where an instance defines achievement kinds",
    /** @param {string} text */
    plant(text) {
      const lines = text.split("\n");
      const at = achievementsOf(lines);
      const from = at?.groups.find((g) => g.bullets.length);
      const to = at?.groups.find((g) => g !== from);
      if (!at || !from || !to) return null;
      const bullet = /** @type {string[]} */ (from.bullets.shift());
      to.bullets.push(bullet);
      return { text: withAchievements(lines, at, at.groups), moved: { bullet: textOf(bullet), from: from.heading, to: to.heading } };
    },
  },
  {
    name: "a running period whose tagline does not say so",
    rule: "A period still running has no `end`",
    /** @param {string} text */
    plant(text) {
      const lines = text.split("\n");
      const fence = lines.indexOf("---", 1);
      const end = lines.findIndex((l, i) => i < fence && l.startsWith("end:"));
      if (end >= 0) {
        lines.splice(end, 1);
        return { text: lines.join("\n") };
      }
      const tagline = lines.findIndex((l) => /^> Ongoing\.\s+\S/.test(l));
      if (tagline < 0) return null;
      lines[tagline] = /** @type {string} */ (lines[tagline]).replace(/^> Ongoing\.\s+/, "> ");
      return { text: lines.join("\n") };
    },
  },
];
