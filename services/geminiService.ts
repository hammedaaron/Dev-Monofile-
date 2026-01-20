import { GoogleGenAI, Type, Chat } from "@google/genai";
import { FileNode, ConceptBundle, Project } from "../types";
import { AI_CONFIG, STORAGE_KEYS } from "../constants";

// Helper to get key from local storage with migration support
const getAiClient = () => {
    const key = localStorage.getItem(STORAGE_KEYS.API_KEY) || localStorage.getItem('user_gemini_key');
    if (!key) throw new Error("API_KEY_MISSING: Please restart the session and enter your API key.");
    return new GoogleGenAI({ apiKey: key });
};

const PROMPT_SUMMARY = `
You are a Principal Software Architect conducting a technical audit.
Analyze the provided codebase structure and content to generate a comprehensive "Codebase Executive Summary".
Format required (Markdown):
# Codebase Executive Summary
## 1. System Overview
## 2. Architecture & Patterns
## 3. Core Capabilities
## 4. Key Technical Components
## 5. Technology Stack
## 6. Ideal Use Cases
`;

const PROMPT_CONTEXT = `
You are an expert AI Data Engineer. Rewrite the essence of this codebase into a logic-dense "AI Context" format.
Output Format (Markdown):
# AI Context Optimized Context
## 1. Architectural Blueprint
## 2. Data Flow & State Management
## 3. Critical Path Analysis
## 4. Key Dependencies
## 5. Developer "Gotchas"
`;

const PROMPT_CONCEPTS = `
Analyze the provided codebase and identify 5 to 10 distinct "Feature Concepts" or "Architectural Bundles".
Return ONLY a JSON array of objects with "id" (kebab-case), "name" (Title Case), and "description" (one short sentence).
`;

const PROMPT_RECREATOR = `
You are a 'System Recreator'. Based on the provided codebase and the SELECTED CONCEPTS, generate a 'Recreation Blueprint'.
Goal: Provide exactly what is needed to rebuild ONLY THESE FEATURES in a new project.

Selected Concepts to Extract: {{CONCEPTS}}

Output Format (Markdown):
# Reconstruction DNA Package: [Concept Names]
## 1. Core Logic Rules
## 2. Data Contract & State
## 3. Implementation Blueprint (Pseudo-Code)
## 4. Master Reconstructor Prompt
`;

export const generateAIInsights = async (
  flattenedCode: string, 
  files: FileNode[]
): Promise<{ summary: string; aiContext: string; concepts: ConceptBundle[] }> => {
  
  const ai = getAiClient();
  const model = AI_CONFIG.FAST_MODEL; 
  const fileTree = files.slice(0, 150).map(f => f.path).join('\n');
  const contextInput = `Structure:\n${fileTree}\n\nContent:\n${flattenedCode.substring(0, 500000)}`;

  const runTask = async (prompt: string, config?: any) => {
    try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }, { text: contextInput }] }],
          config
        });
        return response.text || "";
    } catch (e) {
        console.warn("Primary model failed, trying fallback...", e);
        const fallbackResponse = await ai.models.generateContent({
            model: AI_CONFIG.FALLBACK_MODEL,
            contents: [{ parts: [{ text: prompt }, { text: contextInput }] }],
            config
        });
        return fallbackResponse.text || "";
    }
  };

  const [summary, aiContext, conceptsRaw] = await Promise.all([
    runTask(PROMPT_SUMMARY),
    runTask(PROMPT_CONTEXT),
    runTask(PROMPT_CONCEPTS, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["id", "name", "description"]
        }
      }
    })
  ]);

  let concepts: ConceptBundle[] = [];
  try {
    concepts = JSON.parse(conceptsRaw || "[]");
  } catch (e) {
    concepts = [{ id: 'core', name: 'Core Logic', description: 'Fundamental system operations.' }];
  }

  return { summary, aiContext, concepts };
};

export const recreateFeatureContext = async (
  flattenedCode: string,
  selectedConcepts: ConceptBundle[]
): Promise<string> => {
  const ai = getAiClient();
  const model = AI_CONFIG.SMART_MODEL;
  const conceptNames = selectedConcepts.map(c => c.name).join(", ");
  const prompt = PROMPT_RECREATOR.replace("{{CONCEPTS}}", conceptNames);
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }, { text: `Context:\n${flattenedCode.substring(0, 500000)}` }] }]
  });
  return response.text || "Failed to generate blueprint.";
};

export const startCodebaseChat = (currentProject: Project, otherProjects: Project[]): Chat => {
  const ai = getAiClient();

  let fullContext = `Current Project [${currentProject.name}] Source:\n${currentProject.outputs.flattened.substring(0, 400000)}\n\n`;

  if (currentProject.knowledgeBridgeEnabled) {
    const bridged = otherProjects.filter(p => p.knowledgeBridgeEnabled && p.id !== currentProject.id);
    if (bridged.length > 0) {
      fullContext += `--- KNOWLEDGE BRIDGE ---\n`;
      bridged.forEach(p => {
        fullContext += `PROJECT: ${p.name}\nSUMMARY: ${p.outputs.summary}\n`;
      });
    }
  }

  return ai.chats.create({
    model: AI_CONFIG.SMART_MODEL,
    config: {
      systemInstruction: `You are a Codebase Intelligence Assistant. Answer technical questions based on the provided source code context.\n\nContext:\n${fullContext}`
    }
  });
};
