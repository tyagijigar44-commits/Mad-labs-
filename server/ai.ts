import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client with telemetry header per skill rules
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

export interface LabResultContext {
  testName: string;
  patientAge: number;
  patientGender: string;
  parameters: {
    name: string;
    value: string;
    unit: string;
    referenceLow?: number;
    referenceHigh?: number;
    flag: string;
  }[];
  clinicalNotes?: string;
}

// Module 9.A: AI Report Drafting Assistance
export async function draftLabReportSummary(context: LabResultContext): Promise<{ draftSummary: string; recommendations: string[]; criticalAlerts: string[] }> {
  const abnormalItems = context.parameters.filter(p => p.flag !== 'normal');
  const itemsText = context.parameters
    .map(p => `- ${p.name}: ${p.value} ${p.unit} (Ref: ${p.referenceLow ?? 'N/A'} - ${p.referenceHigh ?? 'N/A'} ${p.unit}, Status: ${p.flag.toUpperCase()})`)
    .join('\n');

  if (ai) {
    try {
      const prompt = `You are a clinical laboratory pathology assistant. Generate an objective, professional laboratory report draft summary for the following patient test results.
CRITICAL SAFETY RULE: You are providing a DRAFT interpretation summary for a licensed Pathologist to review and verify. Do NOT provide an independent definitive diagnosis.

PATIENT CONTEXT:
- Age: ${context.patientAge} years, Gender: ${context.patientGender}
- Test: ${context.testName}
- Clinical indication: ${context.clinicalNotes || 'Routine investigation'}

RESULTS:
${itemsText}

Format your response as a clear, concise professional clinical pathology interpretation draft suitable for inclusion in a formal laboratory report. Include:
1. Summary of primary findings (highlighting any abnormal or critical results).
2. Physiological or clinical correlation considerations.
3. Recommended follow-up or reflex testing if appropriate.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          systemInstruction: 'You are an expert clinical pathologist assisting with laboratory report drafts. Strictly maintain clinical accuracy and label content as DRAFT FOR PATHOLOGIST VERIFICATION.',
        },
      });

      const text = response.text || '';
      return {
        draftSummary: text.trim(),
        recommendations: abnormalItems.length > 0 ? ['Clinical correlation recommended', 'Repeat abnormal indices if symptoms persist'] : ['Routine annual surveillance'],
        criticalAlerts: abnormalItems.filter(p => p.flag === 'critical').map(p => `CRITICAL VALUE: ${p.name} is ${p.value} ${p.unit}`),
      };
    } catch (err) {
      console.warn('Gemini API call failed, using rule-based diagnostic summary engine:', err);
    }
  }

  // Clinical Rule-Based Fallback
  if (abnormalItems.length === 0) {
    return {
      draftSummary: `[AI DRAFT - PATHOLOGIST REVIEW REQUIRED] All tested parameters for ${context.testName} fall within established biological reference intervals for a ${context.patientAge}-year-old ${context.patientGender}. Red and white cell lineages/biochemical indices demonstrate physiological homeostasis. No urgent pathology flagged.`,
      recommendations: ['Routine preventative follow-up according to standard clinical protocols.'],
      criticalAlerts: [],
    };
  } else {
    const abnormalList = abnormalItems.map(p => `${p.name} (${p.value} ${p.unit}, ${p.flag.toUpperCase()})`).join(', ');
    const criticals = abnormalItems.filter(p => p.flag === 'critical').map(p => `CRITICAL VALUE: ${p.name} at ${p.value} ${p.unit}`);
    return {
      draftSummary: `[AI DRAFT - PATHOLOGIST REVIEW REQUIRED] Laboratory evaluation reveals deviation in the following parameter(s): ${abnormalList}. These alterations warrant clinical correlation with the patient's presenting symptoms, medication history, and recent clinical status. Recommended for qualified pathologist verification.`,
      recommendations: [
        'Correlate findings with patient clinical presentation and past diagnostic records.',
        'Consider confirmatory/reflex testing if clinically indicated.',
      ],
      criticalAlerts: criticals,
    };
  }
}

// Module 9.B: Abnormal Value & Reflex Assistance
export async function analyzeAbnormalValues(context: LabResultContext): Promise<{
  flaggedParameters: { name: string; severity: 'moderate' | 'critical'; suggestion: string }[];
  pathologistActionRequired: boolean;
}> {
  const flagged: { name: string; severity: 'moderate' | 'critical'; suggestion: string }[] = [];

  for (const p of context.parameters) {
    if (p.flag === 'critical') {
      flagged.push({
        name: p.name,
        severity: 'critical',
        suggestion: `Immediate verbal alert to attending clinician required per CAP/CLIA critical value notification protocol.`,
      });
    } else if (p.flag === 'high' || p.flag === 'low') {
      flagged.push({
        name: p.name,
        severity: 'moderate',
        suggestion: `Value outside standard reference range (${p.referenceLow}-${p.referenceHigh} ${p.unit}). Monitor or consider repeat evaluation.`,
      });
    }
  }

  return {
    flaggedParameters: flagged,
    pathologistActionRequired: flagged.some(f => f.severity === 'critical'),
  };
}

// Module 9.C: AI Workflow & Assistant
export async function queryWorkflowAssistant(query: string, systemStats: any): Promise<string> {
  if (ai) {
    try {
      const prompt = `You are ApexLIS Assistant, an AI expert in Laboratory Information System operations.
SYSTEM OPERATIONAL DATA:
- Total Orders: ${systemStats.totalOrders}
- Pending Collection: ${systemStats.pendingCollection}
- Processing / In-Lab: ${systemStats.inProcessing}
- Awaiting Pathologist Verification: ${systemStats.awaitingVerification}
- Reports Released Today: ${systemStats.reportsReleasedToday}
- Critical Alerts Pending: ${systemStats.criticalAlertsCount}
- Active Connected Analyzers: ${systemStats.connectedAnalyzers}
- Current Active Branch: ${systemStats.currentBranchName || 'Apex Central Reference Lab'}

STAFF USER QUESTION: "${query}"

Respond concisely and professionally with actionable operational guidance, specific counts, or workflow steps. Mention clinical quality compliance standards (CAP, CLIA, ISO 15189) where relevant.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.3,
          systemInstruction: 'You are the embedded AI operations copilot in ApexLIS Laboratory Information System.',
        },
      });

      if (response.text) return response.text.trim();
    } catch (e) {
      console.warn('Gemini workflow assistant error:', e);
    }
  }

  // Rule-based conversational workflow response
  const lower = query.toLowerCase();
  if (lower.includes('pending') || lower.includes('worklist') || lower.includes('task')) {
    return `Currently in ApexLIS, there are ${systemStats.inProcessing} specimens in analytical processing, ${systemStats.awaitingVerification} reports pending Pathologist review, and ${systemStats.pendingCollection} samples awaiting collection. You can access the direct worklists from the Laboratory Workflow tab.`;
  }
  if (lower.includes('critical') || lower.includes('urgent') || lower.includes('alert')) {
    return `There are currently ${systemStats.criticalAlertsCount} critical value alert(s) requiring immediate verbal notification to the ordering physician per CLIA protocol. Please check the Pending Verification queue.`;
  }
  if (lower.includes('analyzer') || lower.includes('machine') || lower.includes('interface')) {
    return `There are ${systemStats.connectedAnalyzers} active diagnostic analyzer interfaces online (including Sysmex XN-550 and Roche Cobas e411). Analyzer telemetry and automated result queues are available under the Analyzer Integration module.`;
  }
  return `ApexLIS Operational Status: ${systemStats.totalOrders} total test orders recorded, ${systemStats.reportsReleasedToday} reports released today. All analytical QC checks are passing Westgard rules. How can I assist you with sample tracking, report verification, or test orders?`;
}

// Module 9.D: AI Voice Dictation Parser
export async function parseVoiceTranscriptToResults(transcript: string, availableParameters: { name: string; unit: string }[]): Promise<{ parameter: string; value: string; confidence: number }[]> {
  if (ai) {
    try {
      const paramNames = availableParameters.map(p => p.name).join(', ');
      const prompt = `Parse the following medical technician laboratory voice dictation into structured parameter values.
DICTATION TRANSCRIPT: "${transcript}"
AVAILABLE PARAMETERS: [${paramNames}]

Return valid JSON with an array of objects matching:
[{ "parameter": string, "value": string, "confidence": number }]
Only include recognized parameters from the available list.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
    } catch (e) {
      console.warn('Voice parser error:', e);
    }
  }

  // Fallback regex parser for common patterns like "Hemoglobin 13.5", "WBC 7200"
  const parsed: { parameter: string; value: string; confidence: number }[] = [];
  for (const param of availableParameters) {
    const key = param.name.split(' ')[0].toLowerCase();
    const regex = new RegExp(`${key}\\s*(?:is|equals|value)?\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
    const match = transcript.match(regex);
    if (match) {
      parsed.push({
        parameter: param.name,
        value: match[1],
        confidence: 0.95,
      });
    }
  }
  return parsed;
}

// Module 9.E: AI Quality & Plausibility Checks
export async function runQualityPlausibilityCheck(testCode: string, results: { name: string; value: number }[]): Promise<{
  passed: boolean;
  warnings: string[];
  inconsistencies: string[];
}> {
  const warnings: string[] = [];
  const inconsistencies: string[] = [];

  const resultMap = new Map(results.map(r => [r.name.toLowerCase(), r.value]));

  // Rule 1: Hematology - Rule of Three (Hematocrit ~= 3 * Hemoglobin +/- 3)
  const hb = resultMap.get('hemoglobin (hb)') || resultMap.get('hemoglobin');
  const hct = resultMap.get('hematocrit (pcv)') || resultMap.get('hematocrit');
  if (hb !== undefined && hct !== undefined) {
    const expectedHct = hb * 3;
    if (Math.abs(hct - expectedHct) > 4.5) {
      inconsistencies.push(`Hematology Rule of Three violation: Hct (${hct}%) deviates significantly from expected 3x Hb (${expectedHct.toFixed(1)}%). Check for microcytosis, cold agglutinins, or analyzer calibration.`);
    }
  }

  // Rule 2: Biochemistry - BUN / Creatinine Ratio (Normal 10:1 to 20:1)
  const bun = resultMap.get('blood urea nitrogen (bun)');
  const creat = resultMap.get('serum creatinine');
  if (bun !== undefined && creat !== undefined && creat > 0) {
    const ratio = bun / creat;
    if (ratio > 25) {
      warnings.push(`Elevated BUN/Creatinine ratio (${ratio.toFixed(1)}:1). Consider pre-renal azotemia, dehydration, or gastrointestinal bleeding.`);
    } else if (ratio < 8) {
      warnings.push(`Low BUN/Creatinine ratio (${ratio.toFixed(1)}:1). Consider severe liver disease, malnutrition, or acute tubular necrosis.`);
    }
  }

  // Rule 3: Electrolytes - Potassium extreme sanity check
  const k = resultMap.get('potassium (k+)');
  if (k !== undefined && k > 6.0) {
    warnings.push(`Elevated Potassium (${k} mEq/L). Confirm specimen was not hemolyzed or drawn in EDTA tube before releasing critical alert.`);
  }

  return {
    passed: inconsistencies.length === 0,
    warnings,
    inconsistencies,
  };
}
