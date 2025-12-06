import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_TEXT_MODEL, GEMINI_IMAGE_MODEL, QUIZ_SCHEMA, SYSTEM_INSTRUCTION_STUDY } from "../constants";
import { Quiz } from "../types";

const apiKey = process.env.API_KEY || '';
// In a real app, we would handle missing API keys more gracefully in the UI.
const ai = new GoogleGenAI({ apiKey });

/**
 * Sends a message to the AI for the study chat.
 * Handles both text and image inputs.
 */
export const sendMessageToGemini = async (
  message: string,
  base64Image?: string,
  history?: { role: string; content: string }[]
): Promise<{ text: string; diagram?: string }> => {
  try {
    const parts: any[] = [];
    
    if (base64Image) {
      // Clean base64 string if it contains metadata header
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg', // Assuming jpeg/png, standardizing
          data: cleanBase64
        }
      });
    }

    parts.push({ text: message });

    // Use a chat session if history is provided
    const chat = ai.chats.create({
        model: GEMINI_TEXT_MODEL,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_STUDY,
            temperature: 0.7,
        },
        history: history?.map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }))
    });

    const result = await chat.sendMessage({
        message: { parts }
    });

    const responseText = result.text || "I couldn't generate a response.";
    
    // Extract mermaid diagram if present
    const mermaidMatch = responseText.match(/```mermaid([\s\S]*?)```/);
    const diagram = mermaidMatch ? mermaidMatch[1].trim() : undefined;
    
    // Clean the text to remove the mermaid block so it doesn't show up twice
    const cleanText = responseText.replace(/```mermaid[\s\S]*?```/g, '').trim();

    return {
      text: cleanText,
      diagram
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Sorry, I encountered an error connecting to the study assistant. Please try again." };
  }
};

/**
 * Generates a quiz based on a topic.
 */
export const generateQuiz = async (topic: string): Promise<Quiz | null> => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: `Create a quiz about: ${topic}. Include 5 questions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
        systemInstruction: "You are a strict JSON quiz generator. Generate valid JSON matching the schema."
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as Quiz;
    }
    return null;
  } catch (error) {
    console.error("Quiz Generation Error:", error);
    return null;
  }
};

/**
 * Generates an illustrative image for a topic.
 */
export const generateTopicImage = async (prompt: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_IMAGE_MODEL,
            contents: {
                parts: [{ text: `A clear, educational illustration of: ${prompt}. White background, schematic style.` }]
            },
        });
        
        // Handling the specific response structure for image generation on Flash 2.5
        // It returns candidates with parts. One part will be the image.
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (e) {
        console.error("Image gen error", e);
        return null;
    }
}