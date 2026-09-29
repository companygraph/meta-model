// Which seat made a commit, as the governing instance says it may. The author's address names a
// role at the instance's domain, and the Process, Phase and Track trailers name where the work
// sat; the phase's `executed-by` says whether that seat may do it. Pure: an instance as
// parseInstance returns it in, judgements out, so verify/seats.test.mjs feeds it fixtures. The
// design is docs/superpowers/specs/2026-09-28-a-commit-names-its-seat-design.md.
// The date the rule began, which `seats` reports from by default: the day robertblust/conventions
// tagged v1.36.0, the release that shipped the commit-msg hook. `--since` overrides it; commits
// made before it are authored by the person, and the report says so rather than claiming a seat.
export const SEATS_SINCE = "2026-09-28";
export const seatAddress = (role, domain) => `${role.trim().toLowerCase().replace(/\s+/g, "-")}@${domain}`;
// The host a seat's address sits at. `www.` is dropped because an identity's url is a web
// address and a seat's is a mail address, and no family domain receives mail at www.
export function domainOf(url) {
    let host;
    try {
        host = new URL(url).hostname;
    }
    catch {
        return null;
    }
    return host.toLowerCase().replace(/^www\./, "") || null;
}
const listOf = (value) => (Array.isArray(value) ? value : typeof value === "string" && value ? [value] : []);
export function governingOf({ entities }) {
    const identity = entities.find((e) => e.type === "identity");
    if (!identity)
        throw new Error("the instance has no identity, so nothing says whose seats these are");
    // No url, no domain, and so no seat has an address: every author but a person is outside.
    // init writes an identity without one, and its hook must pass a new instance's first commits.
    const domain = domainOf(identity.fields.url ?? "");
    const roles = new Map(domain ? entities.filter((e) => e.type === "role").map((r) => [seatAddress(r.name, domain), r.name]) : []);
    const processes = new Map();
    for (const p of entities.filter((e) => e.type === "process")) {
        const phases = new Map(entities.filter((e) => e.type === "phase" && e.owner === p.id).map((ph) => [ph.name, listOf(ph.fields["executed-by"])]));
        const tracks = new Set(entities.filter((e) => e.type === "track" && e.owner === p.id).map((t) => t.name));
        processes.set(p.name, { phases, tracks });
    }
    // A person commits under their own address, which is their profile's and never the identity's:
    // the identity's `email` is where to reach the company, a role address such as info@ that no one
    // commits under. Only a human's profile counts, since an agent commits under a seat.
    const people = new Set(entities
        .filter((e) => e.type === "profile" && e.fields.nature === "human" && typeof e.fields.email === "string" && e.fields.email.trim())
        .map((e) => e.fields.email.trim().toLowerCase()));
    return { name: identity.name, domain, people, roles, processes };
}
// Git reads trailers from the message's last paragraph alone, so a blank line between them and
// Co-Authored-By leaves them prose; every refusal for a missing trailer says so.
const LAST = "; git reads trailers only from the message's last paragraph";
export function judgeCommit(governing, { email, trailers }) {
    const address = (email ?? "").trim().toLowerCase();
    if (governing.people.has(address))
        return { kind: "owner", failures: [] };
    if (!governing.domain || address.split("@").pop() !== governing.domain)
        return { kind: "outside", failures: [] };
    const seat = governing.roles.get(address);
    if (!seat)
        return { kind: "seat", seat: null, failures: [`${address} is at ${governing.domain} and names no role of ${governing.name}`] };
    const failures = [];
    const one = (key, label) => {
        const values = (trailers[key] ?? []).map((v) => v.trim()).filter(Boolean);
        if (values.length > 1) {
            failures.push(`it names a ${label} twice: ${values.join(", ")}`);
            return null;
        }
        return values[0] ?? null;
    };
    const processName = one("process", "Process");
    const phaseName = one("phase", "Phase");
    const trackName = one("track", "Track");
    const twice = failures.length > 0;
    if (!processName && !twice)
        failures.push(`it has no Process trailer${LAST}`);
    if (!phaseName && !twice)
        failures.push(`it has no Phase trailer${LAST}`);
    const proc = processName ? governing.processes.get(processName) : null;
    if (processName && !proc)
        failures.push(`Process: ${processName} is no process of ${governing.name}`);
    if (proc && phaseName) {
        const executedBy = proc.phases.get(phaseName);
        if (!executedBy)
            failures.push(`Phase: ${phaseName} is no phase of ${processName}`);
        else if (!executedBy.includes(seat))
            failures.push(`${seat} does not execute ${phaseName} in ${processName}; its executed-by is ${executedBy.join(", ") || "empty"}`);
    }
    if (proc && !twice) {
        if (proc.tracks.size && !trackName)
            failures.push(`it has no Track trailer, and ${processName} runs on ${[...proc.tracks].join(", ")}`);
        if (trackName && !proc.tracks.has(trackName))
            failures.push(proc.tracks.size ? `Track: ${trackName} is no track of ${processName}` : `Track: ${trackName} is given, and ${processName} has no tracks`);
    }
    return { kind: "seat", seat, process: processName, phase: phaseName, track: trackName, failures };
}
// A commit from before the rule carries the person's own name and whatever address they used
// that day, neither of which need be a profile's `email`; the report cannot tell which seat
// made it, so it is the owner's. `name` is the commit's author name and `ownerName` is the
// identity's name governing that commit (the same field `judgeCommit`'s refusals name as
// `governing.name`), read per commit because a family report judges each repository against its
// own organization's instance. This is the report's own leniency: judgeCommit and the check it
// backs never see it, so a commit-msg hook and CI still refuse a name alone.
const byOwnerName = (name, ownerName) => typeof name === "string" && typeof ownerName === "string" &&
    name.trim() !== "" && name.trim().toLowerCase() === ownerName.trim().toLowerCase();
// The report's second leniency, beside byOwnerName: an author also counts as the owner's when
// their name matches the identity of the instance the report was run from, or their address a
// human profile of it — the reporting instance, `governingOf`'s own shape, passed by `seats` and
// distinct from a member's own governing instance in a family, since a member's people need not
// be the reporting instance's. Null in a family run from a folder that is no instance itself,
// where nothing extra applies.
const byReportingIdentity = (name, email, reporting) => {
    if (!reporting)
        return false;
    const address = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (reporting.people?.has(address))
        return true;
    return byOwnerName(name, reporting.name);
};
export function tally(judged, reporting) {
    const seats = new Map();
    let owner = 0, outside = 0, refused = 0;
    for (const { email, name, ownerName, judgement: j } of judged) {
        if (j.kind === "owner" || byOwnerName(name, ownerName) || byReportingIdentity(name, email, reporting))
            owner++;
        else if (j.kind === "outside")
            outside++;
        else if (j.failures.length)
            refused++;
        else {
            const address = email.trim().toLowerCase();
            const s = seats.get(address) ?? { seat: j.seat, email: address, commits: 0, by: new Map() };
            s.commits++;
            const where = [j.process, j.phase, j.track].filter(Boolean).join(" · ");
            s.by.set(where, (s.by.get(where) ?? 0) + 1);
            seats.set(address, s);
        }
    }
    const rows = [...seats.values()]
        .sort((a, b) => b.commits - a.commits || a.email.localeCompare(b.email))
        .map((s) => ({
        seat: s.seat,
        email: s.email,
        commits: s.commits,
        by: [...s.by].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([where, commits]) => ({ where, commits })),
    }));
    return { seats: rows, owner, outside, refused };
}
export function renderReport({ scope, since, read, unread, seats, owner, outside, refused }) {
    const where = scope === "family" ? `across the family, ${read.length} of ${read.length + unread.length} members read` : `in ${read[0]}`;
    const lines = [`Commits by seat ${where}, ${since ? `since ${since}` : "since the first commit"}`];
    for (const u of unread)
        lines.push(`  not read, ${u.reason ?? `no clone at ${u.path}`}: ${u.repo}`);
    lines.push("");
    if (!seats.length)
        lines.push("  no commit is authored by a seat yet");
    for (const s of seats) {
        lines.push(`  ${s.seat} <${s.email}>  ${s.commits}`);
        for (const b of s.by)
            lines.push(`    ${b.where}  ${b.commits}`);
    }
    lines.push("", `  the owner's own  ${owner}`, `  outside the model  ${outside}`, `  at a seat's domain, refused by the check  ${refused}`);
    if (!since)
        lines.push("", "  commits made before the rule are authored by the person, and counted as the owner's by the identity's name or address — of the instance the report is run from, in a family");
    return `${lines.join("\n")}\n`;
}
