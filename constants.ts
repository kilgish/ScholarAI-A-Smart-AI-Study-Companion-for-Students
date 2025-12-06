import { Type, Schema } from "@google/genai";

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

export const QUIZ_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING }
        },
        required: ["question", "options", "correctAnswerIndex", "explanation"]
      }
    }
  },
  required: ["topic", "questions"]
};

export const SYSTEM_INSTRUCTION_STUDY = `
You are ScholarAI, an enthusiastic, patient, and highly intelligent study companion. 
Your goal is to help students learn effectively.

GUIDELINES:
1.  **Simplify**: Explain complex topics in simple, easy-to-understand language. Use analogies.
2.  **Structure**: Use bullet points, bold text, and headers to make text readable.
3.  **Visuals**: If a concept involves a process, hierarchy, or relationship, YOU MUST generate a Mermaid.js diagram code block. Wrap it in \`\`\`mermaid \`\`\`.
    *   Example: A flowchart for photosynthesis or a class diagram for coding.
4.  **Encourage**: Be positive and encouraging.
5.  **Summarize**: At the end of long explanations, provide a "Key Takeaway".

When the user sends an image, analyze it and explain what is visible or solve the problem presented.
`;

export const SYSTEM_INSTRUCTION_QUIZ = `
You are a quiz generator. Generate a challenging but fair multiple-choice quiz based on the user's requested topic.
Output strict JSON format.
`;
