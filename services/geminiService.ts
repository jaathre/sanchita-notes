import { GoogleGenAI, Type, Schema } from "@google/genai";

export interface AIAnalysisResult {
  title: string;
  summary: string;
  tags: string[];
}

export const analyzeNoteContent = async (content: string): Promise<AIAnalysisResult | null> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found for Gemini.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A concise, relevant title for the note." },
        summary: { type: Type.STRING, description: "A very short summary of the content (max 20 words)." },
        tags: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Up to 5 relevant single-word lowercase tags (e.g. 'ideas', 'work', 'recipe')."
        }
      },
      required: ["title", "summary", "tags"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following note text and provide metadata: "${content.substring(0, 5000)}"`, // Limit input context
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3 // Lower temperature for more deterministic/factual results
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as AIAnalysisResult;
      return data;
    }
    return null;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return null;
  }
};
