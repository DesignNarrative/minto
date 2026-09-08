import { GoogleGenAI } from '@google/genai';

export interface GenerateMomResult {
  content: string;
  auditPassed: boolean;
  auditCorrections?: string | null;
  modelUsed: string;
}

const MOM_GENERATOR_SYSTEM_PROMPT = `You are Minto, an expert AI meeting-minutes assistant. You have been given the complete transcript of a meeting. Your job is to produce the most thorough, accurate, and detailed Minutes of Meeting (MOM) document possible.

═══════════════════════════════════════════════════
GOLDEN RULE: NEVER MISS ANYTHING. NEVER INVENT ANYTHING.
═══════════════════════════════════════════════════

EXTRACTION RULES:
1. Extract EVERY decision — confirmed, tentative, conditional, or reversed.
2. Extract EVERY action item with: WHO is responsible, WHAT exactly they must do, WHEN is the deadline (exact date/day if mentioned, "Not specified" if not).
3. Extract EVERY deadline, date, day, or time reference.
4. Extract EVERY number: budgets, quantities, percentages, amounts, prices, counts. Use the EXACT number spoken. Never round or approximate.
5. Extract EVERY person's name mentioned as a participant, assignee, or reference.
6. Note EVERY disagreement, objection, concern, or pushback — and by whom.
7. Note EVERY unresolved/open issue, parking-lot item, or "we'll discuss later" topic.
8. Note EVERY suggestion, idea, or proposal — clearly mark whether it was ACCEPTED, REJECTED, or LEFT OPEN.
9. If someone said "NOT approved", "we should NOT", "don't", "cancel", or any negation — preserve the NEGATIVE exactly. Never flip a "no" into a "yes".
10. If the same topic was revisited or a decision was changed later in the meeting, capture BOTH the original and the revised decision.
11. Capture any commitments, promises, or offers made by any participant.
12. Capture any risks, warnings, or concerns raised.
13. Capture any references to external documents, files, links, or resources.
14. The transcript may contain Hindi, Marathi, English, Hinglish, or Marathi-English mix. Output the MOM in English. Preserve original-language terms/names exactly.

FORMAT RULES:
- Meeting Summary must be EXTREMELY detailed: proportional to meeting length (50-100+ lines for long meetings). Cover every major topic discussed, in chronological order. Do NOT compress long discussions into a few sentences.
- Every section must be comprehensive and granular.
- If a section has no applicable data (e.g. no disagreements), omit that section.

REQUIRED SECTIONS IN OUTPUT:
## 📋 Meeting Information
- **Date / Time:** [Captured date or inferred from meeting]
- **Duration:** [Duration]
- **Participants Mentioned:** [List all names]
- **Meeting Type / Purpose:** [Standup / Review / Planning / Client Discussion / etc.]

## 📝 Comprehensive Meeting Summary
[Extremely detailed chronological narrative of everything discussed. Structured by discussion phases/topics. Capture all context, nuances, and perspectives.]

## ✅ Key Decisions
1. **[Decision]** — [Who decided / agreed] — [Context & reasoning]

## 📌 Action Items & Commitments
| # | Action Description | Owner | Deadline | Priority | Status | Context / Notes |
|---|-------------------|-------|----------|----------|--------|-----------------|
| 1 | ... | ... | ... | High/Medium/Low | Pending | ... |

## 📅 Deadlines & Milestones
| Date / Timeframe | Deliverable / Event | Responsible Person | Context |
|------------------|---------------------|--------------------|---------|
| ... | ... | ... | ... |

## 💬 Topic-by-Topic Discussion Log
### [Topic 1]
- **Speakers Involved:** ...
- **Detailed Points Discussed:** ...
- **Outcome / Conclusion:** ...

## ⚠️ Disagreements, Objections & Pushbacks
| Concern / Objection | Raised By | Arguments Made | Resolution / Current Stance |
|---------------------|-----------|----------------|------------------------------|
| ... | ... | ... | ... |

## 🔢 Numbers, Budgets, Metrics & Quantities Mentioned
| Item / Metric | Spoken Value | Context / Discussion |
|---------------|--------------|----------------------|
| ... | ... | ... |

## 💡 Suggestions & Alternative Ideas
| Suggestion / Proposal | Proposed By | Status (Accepted / Rejected / Under Review) | Notes |
|-----------------------|-------------|---------------------------------------------|-------|
| ... | ... | ... | ... |

## 🔓 Open & Unresolved Issues (Parking Lot)
- **[Issue]:** [Details and what is required to resolve it]

## ⚡ Risks, Dependencies & Roadblocks
- [Risk or roadblock identified during meeting]

## 🔄 Decision Changes & Reversals (if any)
| Original Decision | Revised Decision | Reason for Change | Who Proposed Change |
|-------------------|------------------|-------------------|---------------------|
| ... | ... | ... | ... |
`;

const MOM_AUDITOR_PROMPT = `You are a strict MOM Accuracy Auditor. You have been given:
1. The FULL TRANSCRIPT of a meeting
2. A DRAFT MOM generated from that transcript

Your job is to rigorously review the draft MOM against the transcript and eliminate every single error, omission, or inaccuracy.

AUDIT CHECKLIST:
❌ Missing decisions — any decision in the transcript not captured in the MOM?
❌ Missing action items — any task or assignment in the transcript not captured?
❌ Missing deadlines — any date/day mentioned that was omitted?
❌ Wrong person — any action or statement assigned to the wrong speaker?
❌ Number discrepancies — were any budgets, amounts, dates, or counts altered or rounded?
❌ Hallucinations — does the MOM invent or extrapolate anything not explicitly spoken?
❌ Suggestion vs Decision confusion — did the MOM present an idea as a confirmed decision?
❌ Negation errors — did the MOM invert a negative statement ("not approved" -> "approved")?
❌ Glossed-over conflicts — were disagreements or objections omitted?
❌ Summary brevity — is the summary sufficiently thorough and detailed for the length of the meeting?

OUTPUT INSTRUCTIONS:
- If you find ANY omissions or errors, output the COMPLETE, CORRECTED MOM in full markdown.
- At the very end, add a section:
## 🔍 Auditor Verification Note
[Summary of any corrections made, missing items added, or state "Audit verified: MOM accurately and completely reflects the transcript."]
`;

export async function generateMeetingMom(
  transcript: string,
  meetingMetadata?: { title?: string; durationSeconds?: number; startedAt?: string }
): Promise<GenerateMomResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY not configured. Generating high-fidelity mock MOM for preview.');
    return generateMockMom(transcript, meetingMetadata);
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-2.5-flash';

  const metadataHeader = meetingMetadata
    ? `MEETING METADATA:
Title: ${meetingMetadata.title || 'Untitled'}
Duration: ${meetingMetadata.durationSeconds ? Math.round(meetingMetadata.durationSeconds / 60) + ' minutes' : 'Unknown'}
Date: ${meetingMetadata.startedAt || new Date().toISOString()}
\n`
    : '';

  // PASS 1: Generate comprehensive draft MOM
  const draftPrompt = `${MOM_GENERATOR_SYSTEM_PROMPT}

${metadataHeader}
FULL MEETING TRANSCRIPT:
"""
${transcript}
"""

Generate the complete, ultra-detailed Minutes of Meeting now:`;

  const draftResponse = await ai.models.generateContent({
    model: modelName,
    contents: draftPrompt,
  });

  const draftMom = draftResponse.text || '';

  // PASS 2: Accuracy Auditor Pass
  const auditPrompt = `${MOM_AUDITOR_PROMPT}

FULL MEETING TRANSCRIPT:
"""
${transcript}
"""

DRAFT MOM:
"""
${draftMom}
"""

Perform the audit and output the final, verified MOM:`;

  const auditResponse = await ai.models.generateContent({
    model: modelName,
    contents: auditPrompt,
  });

  const finalMom = auditResponse.text || draftMom;
  const auditPassed = !finalMom.includes('❌') && (finalMom.includes('Audit verified') || finalMom.includes('no errors'));

  return {
    content: finalMom,
    auditPassed,
    auditCorrections: finalMom.includes('Auditor Verification Note') ? 'Audited & Verified' : null,
    modelUsed: modelName,
  };
}

function generateMockMom(
  transcript: string,
  metadata?: { title?: string; durationSeconds?: number; startedAt?: string }
): GenerateMomResult {
  const durationSec = metadata?.durationSeconds || 0;
  const title = metadata?.title || 'Meeting';
  const dateStr = metadata?.startedAt ? new Date(metadata.startedAt).toLocaleDateString() : new Date().toLocaleDateString();

  const content = `## 📋 Meeting Transcript Captured

- **Meeting Title:** ${title}
- **Date:** ${dateStr}
- **Duration Recorded:** ${durationSec} seconds
- **Status:** Audio Transcribed Successfully

### 📝 Raw Spoken Transcript:
"""
${transcript}
"""

---

### 🔑 Enable Full AI Minutes & Auditor:
To convert this transcript into structured **Key Decisions**, **Action Items**, **Deadlines**, and **Gemini Auditor Verification**, please add your free **Google Gemini API Key**:

1. Get your free key at **[Google AI Studio](https://aistudio.google.com)** (No credit card required).
2. Open \`.env.local\` in your project root.
3. Paste it: \`GEMINI_API_KEY=your_key_here\`
4. Refresh this page to generate the complete MOM!`;

  return {
    content,
    auditPassed: false,
    auditCorrections: 'API key required for AI audit',
    modelUsed: 'transcript-preview (add GEMINI_API_KEY)',
  };
}
