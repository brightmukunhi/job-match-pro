// TypeScript port of the Python CV Auto-Ranker scoring engine (7-point rubric)

export interface PositionProfile {
  id: string;
  key: string;
  department_id: string;
  name: string;
  relevant_fields: string[];
  must_have_keywords: string[];
  skill_keywords: string[];
  certification_keywords: string[];
}

export interface CandidateData {
  id?: string;
  file_name: string;
  name: string;
  surname: string;
  age: string;
  gender: string;
  email: string;
  phone: string;
  qualifications: string[];
  certifications: string[];
  skills_extracted: string[];
  experience_months: number;
  raw_text: string;
}

export interface ScoringResult {
  candidate_id: string;
  position_profile_id: string;
  qualification_points: number;
  skills_points: number;
  certification_points: number;
  attachment_points: number;
  total_score: number;
  skills_matched: string;
  certs_matched: string;
  must_haves_missing: string;
  notes: string;
}

const SKILLS_MAX = 2;
const CERT_MAX = 1;
const ATTACHMENT_MONTHS_REQUIRED = 12;

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

const BAD_NAME_TOKENS = new Set([
  "curriculum vitae", "curriculum", "vitae", "resume", "résumé", "cv",
  "personal details", "profile", "contacts", "contact details",
  "email", "phone", "address", "objective", "career", "summary",
  "education", "experience", "skills", "references", "page",
  "date of birth", "dob", "nationality", "gender", "marital status"
]);

const SECTION_HEADINGS = [
  "skills", "technical skills", "competencies", "experience", "work experience",
  "employment", "projects", "certifications", "training", "education"
];

export function normalize(text: string): string {
  return (text || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim().toLowerCase();
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function fuzzyRatio(a: string, b: string): number {
  if (a === b) return 1;
  const len = Math.max(a.length, b.length);
  if (len === 0) return 1;
  let matches = 0;
  const bChars = b.split("");
  const used = new Array(bChars.length).fill(false);
  for (const ch of a) {
    for (let j = 0; j < bChars.length; j++) {
      if (!used[j] && bChars[j] === ch) {
        matches++;
        used[j] = true;
        break;
      }
    }
  }
  return (2.0 * matches) / (a.length + b.length);
}

function keywordInText(keyword: string, textLc: string): boolean {
  const kw = normalize(keyword);
  if (!kw) return false;
  if (kw.length <= 4) {
    return new RegExp("\\b" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(textLc);
  }
  return textLc.includes(kw);
}

function splitSections(rawText: string): Record<string, string> {
  const lines = (rawText || "").split("\n").map(l => l.trim());
  const sections: Record<string, string[]> = { __all__: [...lines], __other__: [] };
  let current = "__other__";

  for (const ln of lines) {
    const lnLc = normalize(ln);
    if (SECTION_HEADINGS.some(h => lnLc === h || lnLc.startsWith(h + ":"))) {
      current = lnLc.replace(":", "");
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(ln);
  }

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(sections)) {
    result[k] = v.join("\n");
  }
  return result;
}

function countMatches(
  keywords: string[],
  fullTextLc: string,
  sectionsLc: Record<string, string>,
  extractedItems: string[] = []
): { score: number; matched: string[] } {
  const extractedNorm = extractedItems.map(normalize).filter(Boolean);
  const matched: string[] = [];
  let score = 0;

  const strongSections = Object.keys(sectionsLc).filter(k => {
    const kl = normalize(k);
    return ["skills", "experience", "projects", "certifications", "training"].some(s => kl.includes(s));
  });

  for (const kw of keywords) {
    const kwLc = normalize(kw);
    if (!kwLc) continue;

    let hit = keywordInText(kw, fullTextLc);
    let sectionHit = false;
    let extractedHit = false;

    for (const sk of strongSections) {
      if (keywordInText(kw, sectionsLc[sk] || "")) {
        sectionHit = true;
        break;
      }
    }

    if (!hit) {
      for (const item of extractedNorm) {
        if (item.length >= 5 && (kwLc.includes(item) || item.includes(kwLc))) {
          extractedHit = true;
          break;
        }
        if (item.length >= 6 && kwLc.length >= 6 && fuzzyRatio(item, kwLc) >= 0.86) {
          extractedHit = true;
          break;
        }
      }
    }

    if (hit || sectionHit || extractedHit) {
      matched.push(kw);
      score += 1;
      if (sectionHit) score += 1;
      if (extractedHit) score += 1;
    }
  }

  const seen = new Set<string>();
  const uniq = matched.filter(m => {
    const ml = normalize(m);
    if (seen.has(ml)) return false;
    seen.add(ml);
    return true;
  });

  return { score, matched: uniq };
}

function detectQualificationLevel(
  textLc: string,
  qualificationsList: string[],
  relevantFields: string[]
): { level: string; isRelevant: boolean; detail: string } {
  const qualsText = qualificationsList.map(q => q.toLowerCase()).join(" ") + " " + (textLc || "");
  const isRelevant = (relevantFields || []).some(f => qualsText.includes(f.toLowerCase()));
  const detail = qualificationsList[0] || "";

  const degreePatterns = [
    /\b(bachelor|bsc|b\.sc|beng|b\.eng|be\b|honours|hons|master|msc|m\.sc|meng|m\.eng|mba|phd|ph\.d|doctorate)\b/,
    /\bdegree\b/,
  ];
  if (degreePatterns.some(p => p.test(qualsText))) return { level: "degree", isRelevant, detail };

  const diplomaPatterns = [/\b(national diploma|higher national diploma|hnd|nd)\b/, /\bdiploma\b/];
  if (diplomaPatterns.some(p => p.test(qualsText))) return { level: "diploma", isRelevant, detail };

  const certPatterns = [/\bcertificate\b/, /\bnational certificate\b/];
  if (certPatterns.some(p => p.test(qualsText))) return { level: "certificate", isRelevant, detail };

  return { level: "other", isRelevant: false, detail };
}

function qualificationPoints(level: string, isRelevant: boolean): number {
  if (!isRelevant) return 0;
  if (level === "degree") return 3;
  if (level === "diploma") return 2;
  if (level === "certificate") return 1;
  return 0;
}

export function scoreAgainstProfile(candidate: CandidateData, profile: PositionProfile): ScoringResult {
  const textLc = normalize(candidate.raw_text);
  const sections = splitSections(candidate.raw_text);
  const sectionsLc: Record<string, string> = {};
  for (const [k, v] of Object.entries(sections)) {
    sectionsLc[k] = normalize(v);
  }

  // Qualification
  const { level: qLevel, isRelevant: qRelevant, detail: qDetail } = detectQualificationLevel(
    textLc, candidate.qualifications, profile.relevant_fields
  );
  const qualPts = qualificationPoints(qLevel, qRelevant);

  // Must-haves
  const must = countMatches(profile.must_have_keywords, textLc, sectionsLc, candidate.skills_extracted);
  const mustMissing = profile.must_have_keywords.filter(
    kw => !must.matched.some(m => normalize(m) === normalize(kw))
  );

  // Skills scoring (0..2)
  const skill = countMatches(profile.skill_keywords, textLc, sectionsLc, candidate.skills_extracted);
  const coverage = profile.skill_keywords.length > 0 ? skill.matched.length / profile.skill_keywords.length : 0;

  let skillsPts = 0;
  if (skill.score > 0) {
    skillsPts = 1;
    if (skill.score >= 6 || coverage >= 0.20) skillsPts = 2;
  }

  if (profile.must_have_keywords.length > 0) {
    if (must.matched.length === 0) skillsPts = Math.min(skillsPts, 1);
    if (mustMissing.length >= Math.max(1, Math.floor(profile.must_have_keywords.length / 2))) {
      skillsPts = Math.min(skillsPts, 1);
    }
  }
  skillsPts = clamp(skillsPts, 0, SKILLS_MAX);

  // Certification (0..1)
  const cert = countMatches(profile.certification_keywords, textLc, sectionsLc, candidate.certifications);
  const hasAnyCert = candidate.certifications.length > 0;
  const certPts = clamp(cert.score > 0 || hasAnyCert ? 1 : 0, 0, CERT_MAX);

  // Attachment (>= 12 months)
  const attachPts = candidate.experience_months >= ATTACHMENT_MONTHS_REQUIRED ? 1 : 0;

  const total = qualPts + skillsPts + certPts + attachPts;

  return {
    candidate_id: candidate.id || "",
    position_profile_id: profile.id,
    qualification_points: qualPts,
    skills_points: skillsPts,
    certification_points: certPts,
    attachment_points: attachPts,
    total_score: total,
    skills_matched: skill.matched.slice(0, 25).join(", ") || "None",
    certs_matched: cert.matched.slice(0, 15).join(", ") || (hasAnyCert ? "Listed certs" : "None"),
    must_haves_missing: mustMissing.join(", ") || "",
    notes: `Qual: ${qLevel} (${qRelevant ? "relevant" : "not relevant"})${qDetail ? ` | ${qDetail}` : ""} || Skills score=${skill.score}, coverage=${coverage.toFixed(2)} || Exp=${candidate.experience_months}mo`,
  };
}

// Auto-detect best-fit position
export function findBestFitProfile(candidate: CandidateData, profiles: PositionProfile[]): ScoringResult | null {
  let best: ScoringResult | null = null;
  for (const profile of profiles) {
    const result = scoreAgainstProfile(candidate, profile);
    if (!best || result.total_score > best.total_score) {
      best = result;
    }
  }
  return best;
}

// Extract candidate info from raw text using regex (same patterns as Python script)
export function extractCandidateFromText(rawText: string, fileName: string): CandidateData {
  const text = rawText || "";
  const textLc = text.toLowerCase();

  // Name extraction — robust for various CV formats
  let firstName = "", lastName = "";
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Helper to capitalize a name part
  const capName = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  // Helper to check if a string looks like a person name (2-4 alpha words)
  const looksLikeName = (s: string): string[] | null => {
    const clean = s.replace(/[^\p{L}\s'-]/gu, " ").trim();
    if (clean.length < 3 || clean.length > 60) return null;
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2 || words.length > 5) return null;
    const stopWords = new Set(["the", "and", "for", "with", "from", "page", "of", "to", "in", "a", "an", "on", "at", "by"]);
    if (words.some(w => stopWords.has(w.toLowerCase()))) return null;
    // Each word should be alphabetic (allow hyphens/apostrophes)
    if (!words.every(w => /^[\p{L}'-]+$/u.test(w))) return null;
    // Filter out words that are common section headings
    const lower = clean.toLowerCase();
    if ([...BAD_NAME_TOKENS].some(bad => lower.includes(bad))) return null;
    return words;
  };

  // Strategy 1: Explicit labels (Name:, Full Name:, Applicant:, etc.)
  const nameLabels = [
    /(?:full\s*name|name|applicant|candidate|naam)\s*[:：]\s*(.+)/i,
    /(?:first\s*name|given\s*name)\s*[:：]\s*(.+)/i,
    /(?:surname|last\s*name|family\s*name)\s*[:：]\s*(.+)/i,
  ];

  for (const ln of lines.slice(0, 50)) {
    for (const re of nameLabels) {
      const m = ln.match(re);
      if (m) {
        const val = m[1].replace(/[^\p{L}\s'-]/gu, " ").trim();
        if (val.length >= 2 && val.length <= 50) {
          const parts = val.split(/\s+/).filter(w => w.length > 0);
          // Check if it's a first-name-only label
          if (/first\s*name|given\s*name/i.test(ln)) {
            if (!firstName && parts[0]) firstName = capName(parts[0]);
          } else if (/surname|last\s*name|family\s*name/i.test(ln)) {
            if (!lastName && parts[0]) lastName = capName(parts[0]);
          } else if (parts.length >= 2) {
            firstName = capName(parts[0]);
            lastName = capName(parts[parts.length - 1]);
          } else if (parts.length === 1 && !firstName) {
            firstName = capName(parts[0]);
          }
        }
      }
    }
    if (firstName && lastName) break;
  }

  // Strategy 2: First non-heading line that looks like a name (title-case, ALL CAPS, or mixed)
  if (!firstName) {
    for (const ln of lines.slice(0, 30)) {
      const words = looksLikeName(ln);
      if (words) {
        // Accept title-case, ALL CAPS, or lowercase names
        const allAlpha = words.every(w => /^[\p{L}'-]+$/u.test(w));
        if (allAlpha) {
          firstName = capName(words[0]);
          lastName = capName(words[words.length - 1]);
          break;
        }
      }
    }
  }

  // Strategy 3: Look for "Name Surname" pattern near email/phone in first 20 lines
  if (!firstName) {
    for (const ln of lines.slice(0, 20)) {
      // Lines containing email or phone often have the name nearby
      if (EMAIL_RE.test(ln) || PHONE_RE.test(ln)) {
        // Remove email and phone, see if what's left is a name
        const stripped = ln
          .replace(EMAIL_RE, "")
          .replace(PHONE_RE, "")
          .replace(/[|•·,;]/g, " ")
          .trim();
        const words = looksLikeName(stripped);
        if (words) {
          firstName = capName(words[0]);
          lastName = capName(words[words.length - 1]);
          break;
        }
      }
    }
  }

  // Email & phone
  const emailMatch = text.match(EMAIL_RE);
  const phoneMatch = text.match(PHONE_RE);
  const email = emailMatch ? emailMatch[0] : "";
  const phone = phoneMatch ? phoneMatch[1].trim() : "";

  // Strategy 4: Email prefix fallback
  if (!firstName && email) {
    const prefix = email.split("@")[0];
    const parts = prefix.split(/[._-]/).filter(p => p.length > 1 && /^[a-zA-Z]+$/.test(p));
    if (parts.length >= 2) {
      firstName = capName(parts[0]);
      lastName = capName(parts[parts.length - 1]);
    }
  }

  // Strategy 5: Filename fallback (e.g. "John_Doe_CV.pdf" or "John Doe Resume.pdf")
  if (!firstName) {
    const baseName = fileName.replace(/\.[^.]+$/, ""); // remove extension
    const cleaned = baseName
      .replace(/[-_]+/g, " ")
      .replace(/\b(cv|resume|résumé|curriculum\s*vitae)\b/gi, "")
      .trim();
    const words = looksLikeName(cleaned);
    if (words) {
      firstName = capName(words[0]);
      lastName = capName(words[words.length - 1]);
    }
  }

  // Age
  let age = "";
  const agePatterns = [/\bage[:\s]+(\d{2})\b/i, /\b(\d{2})\s+years\s+old\b/i];
  for (const p of agePatterns) {
    const m = textLc.match(p);
    if (m) { const a = parseInt(m[1]); if (a >= 16 && a <= 75) { age = String(a); break; } }
  }

  // Gender
  let gender = "";
  const genderMatch = textLc.match(/\bgender[:\s]+(male|female|m|f)\b/) || textLc.match(/\bsex[:\s]+(male|female|m|f)\b/);
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    gender = (g === "male" || g === "m") ? "Male" : "Female";
  }

  // Experience months
  let experienceMonths = 0;
  for (const m of textLc.matchAll(/\b(\d{1,2})\s*(months?)\b/g)) {
    const n = parseInt(m[1]); if (n > 0 && n <= 240) experienceMonths = Math.max(experienceMonths, n);
  }
  for (const m of textLc.matchAll(/\b(\d{1,2})\s*(years?)\b/g)) {
    const n = parseInt(m[1]) * 12; if (n > 0 && n <= 240) experienceMonths = Math.max(experienceMonths, n);
  }
  const currentYear = new Date().getFullYear();
  for (const m of textLc.matchAll(/\b(\d{4})\s*[-–—]\s*(\d{4}|present|current|now)\b/g)) {
    const sy = parseInt(m[1]);
    const ey = ["present", "current", "now"].includes(m[2]) ? currentYear : parseInt(m[2]);
    if (sy <= currentYear && sy <= ey && (ey - sy) <= 30) {
      experienceMonths = Math.max(experienceMonths, Math.max(1, (ey - sy) * 12));
    }
  }

  // Basic qualifications/certifications extraction from text
  const qualifications: string[] = [];
  const certifications: string[] = [];
  const qualPatterns = [
    /\b(bachelor[s']?\s+(?:of\s+)?(?:science|arts|engineering|technology)\s+in\s+[\w\s]+)/gi,
    /\b(bsc|b\.sc|beng|b\.eng|msc|m\.sc|mba|phd|ph\.d|diploma|certificate|national diploma|higher national diploma)\s+(?:in\s+)?([\w\s]{3,40})/gi,
  ];
  for (const p of qualPatterns) {
    for (const m of text.matchAll(p)) {
      qualifications.push(m[0].trim());
    }
  }

  return {
    file_name: fileName,
    name: firstName,
    surname: lastName,
    age,
    gender,
    email,
    phone,
    qualifications: [...new Set(qualifications)],
    certifications: [...new Set(certifications)],
    skills_extracted: [],
    experience_months: experienceMonths,
    raw_text: rawText,
  };
}
