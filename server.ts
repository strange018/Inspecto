import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limits to handle base64 images
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy initializer for Google GenAI SDK to handle missing keys gracefully
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// B2B Compliance Analysis endpoint
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { businessDetails, checklist, photos } = req.body;

    if (!businessDetails || !checklist) {
      return res.status(400).json({ error: "Missing businessDetails or checklist in request body" });
    }

    const ai = getAiClient();

    // Compile checklist answers text
    const checklistText = checklist
      .map(
        (item: any) =>
          `- Category: ${item.category}\n  Question: ${item.question}\n  Answered: ${item.answer.toUpperCase()}${
            item.notes ? `\n  User Note: ${item.notes}` : ""
          }`
      )
      .join("\n\n");

    // Construct image parts if photos are uploaded
    const imageParts = (photos || []).map((photoBase64: string) => {
      // Clean base64 string if it contains prefix like 'data:image/png;base64,'
      const matches = photoBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      let data = photoBase64;
      let mimeType = "image/jpeg";

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        data = matches[2];
      }

      return {
        inlineData: {
          mimeType,
          data,
        },
      };
    });

    const systemInstruction = `You are InspectoB2B AI, a senior regulatory auditor, occupational health and safety commissioner, and industrial compliance advisor.
Analyze workplace safety checklist responses, business profile, local region, and uploaded photos (if any) to generate a comprehensive, professional compliance and audit report.

Contextualize the findings to the local region. For example, if the region mentions India, reference the National Building Code (NBC), Bureau of Indian Standards (BIS), Factories Act 1948, or local Fire Safety Acts. If the region is in the US, reference OSHA (Occupational Safety and Health Administration) standards, NFPA (National Fire Protection Association), etc.

If photos are attached, perform a rigorous visual inspection of each photo to detect physical hazards, poor lighting, blocked exits, wire clutter, lack of signage, unorganized setups, or exemplary safety practices. If you spot a hazard in a photo, create a corresponding finding and clearly state: "Identified from visual evidence: ..." in the description.

Your generated report must be strict JSON containing:
1. complianceScore: An integer between 0 and 100 representing their safety score. Be realistic! If there are NO failures, it can be 95-100. If there are high-severity gaps, it should drop significantly (e.g., 40-60).
2. riskLevel: Must be "Low", "Medium", or "High" depending on score and severities.
3. findings: An array of detailed safety gap items.

Each finding item must contain:
- title: Short, professional title of the safety gap (e.g., "Obstructed Fire Exit Route" or "Absence of Hazard Communication Signage").
- category: A clean category tag (e.g., "Fire Safety", "Electrical Safety", "Physical Safety", "Documentation", "PPE & Ergonomics", "First Aid & Hygiene").
- description: Detailed, formal explanation of the observed violation or gap, cross-referencing either the checklist failure or details from the workplace photos.
- severity: "high", "medium", or "low". (High severity is reserved for immediate life threats like blocked fire exits, live naked wires, absence of alarm systems).
- regulatoryReference: Explicit citation of realistic regional safety code/act (e.g. "Factories Act 1948 Section 38" or "OSHA CFR 1910.37").
- recommendation: Precise, actionable, step-by-step remediation advice to fix the issue.
- costEstimate: Estimated cost in the local currency or standard description (e.g., "Low (Zero Cost)", "₹2,500 - ₹5,000", "₹10,000+", "$50 - $100" depending on region).
- effortEstimate: Timeline/effort to complete (e.g. "Immediate", "1-2 days", "2-3 weeks").`;

    const textPart = {
      text: `BUSINESS DETAIL PROFILE:
- Business Name: ${businessDetails.name}
- Industry Sector: ${businessDetails.industry}
- Facility Size: ${businessDetails.size}
- Audit Location/Region: ${businessDetails.region}

CHECKLIST RESPONSES:
${checklistText}

Please perform the compliance audit. Verify both the checklist answers and the visual evidence in the photos, cross-reference them with regional laws, and output the compliance report JSON.`,
    };

    const parts = [...imageParts, textPart];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            complianceScore: {
              type: Type.INTEGER,
              description: "The calculated score from 0 to 100 based on standard audits.",
            },
            riskLevel: {
              type: Type.STRING,
              description: "The general risk tier: 'Low', 'Medium', or 'High'.",
            },
            findings: {
              type: Type.ARRAY,
              description: "A list of safety violations, code gaps, or improvement recommendations.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING }, // "low", "medium", "high"
                  regulatoryReference: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  costEstimate: { type: Type.STRING },
                  effortEstimate: { type: Type.STRING },
                },
                required: [
                  "title",
                  "category",
                  "description",
                  "severity",
                  "regulatoryReference",
                  "recommendation",
                  "costEstimate",
                  "effortEstimate",
                ],
              },
            },
          },
          required: ["complianceScore", "riskLevel", "findings"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini API");
    }

    const auditResult = JSON.parse(responseText.trim());
    res.json(auditResult);
  } catch (err: any) {
    console.error("Compliance audit generation error:", err);
    res.status(500).json({ error: err.message || "An error occurred during compliance report generation." });
  }
});

// Configure Vite or production static asset serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite to create the dev server middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from 'dist/'
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`InspectoB2B Full-Stack Server running on port ${PORT}`);
  });
}

setupServer();
