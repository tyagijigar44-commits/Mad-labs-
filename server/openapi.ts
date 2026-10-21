export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ApexLIS Clinical Pathology & Diagnostic Laboratory API",
    version: "2.4.0",
    description: "Enterprise REST API for Apex Laboratory Information System supporting specimen tracking, analyzer interfacing, pathologist verification, and patient diagnostics.",
    contact: {
      name: "Apex Laboratory Information Systems Support",
      email: "support@apexlis.health"
    }
  },
  servers: [
    { url: "/api", description: "Current LIS Instance" }
  ],
  paths: {
    "/auth/login": {
      post: {
        summary: "Staff & Patient Authentication",
        description: "Validates user credentials against server role hierarchy and returns signed session token.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" }
                },
                required: ["email", "password"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Session authorized with role-based permissions." },
          "401": { description: "Invalid credentials." }
        }
      }
    },
    "/dashboard/stats": {
      get: {
        summary: "Aggregated Laboratory Operational Metrics",
        description: "Calculates real-time patient registrations, turnaround times, pending batches, and revenue.",
        responses: {
          "200": { description: "Operational metrics payload." }
        }
      }
    },
    "/patients": {
      get: {
        summary: "Search & List Registered Patients",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search by Name, Patient ID, Phone or Email" }
        ],
        responses: { "200": { description: "List of matched patients." } }
      },
      post: {
        summary: "Register New Patient",
        description: "Enforces demographic validation and duplicate detection.",
        responses: { "201": { description: "Patient registered." } }
      }
    },
    "/orders": {
      get: { summary: "List Test Orders" },
      post: {
        summary: "Generate Test Order with Automated Specimen Barcodes & Invoicing",
        description: "Executes an atomic transaction creating the order, required sample barcodes, and financial invoice."
      }
    },
    "/specimens": {
      get: { summary: "Specimen Worklists and Chain-of-Custody" }
    },
    "/results": {
      get: { summary: "Retrieve Analytical Test Results" },
      post: { summary: "Enter and Validate Laboratory Result Entry with Auto-Flagging" }
    },
    "/reports/{id}/verify-and-release": {
      post: {
        summary: "Pathologist Verification and Official Clinical Release",
        description: "Signs diagnostic report with authorized credentials and issues cryptographic verification code."
      }
    },
    "/reports/{id}/pdf": {
      get: { summary: "Download Official Clinical Diagnostic PDF with QR Code" }
    },
    "/analyzers/{id}/simulate": {
      post: { summary: "Trigger Automated Analyzer Transmission (HL7 / ASTM)" }
    },
    "/ai/draft-report": {
      post: { summary: "Server-side Gemini AI Report Interpretation Drafting" }
    },
    "/ai/abnormal-check": {
      post: { summary: "AI Abnormal Value & Reflex Testing Screening" }
    },
    "/ai/assistant": {
      post: { summary: "AI Laboratory Operations Copilot" }
    }
  }
};
