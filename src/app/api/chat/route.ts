import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_INSTRUCTION = `
You are a supportive, knowledgeable, and empathetic pregnancy nutrition Doula named "Nourish Doula".
Your goal is to provide safe, evidence-based nutrition advice for pregnant women.
- Tone: Warm, encouraging, non-judgmental.
- Focus: Hydration, balanced meals, managing symptoms (nausea, heartburn).
- Safety: Always suggest consulting a doctor for medical issues. Do NOT give medical advice.
- Constraints: Keep answers concise (under 3 sentences) unless asked for a detailed plan.
`;

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

        // Using gemini-flash-latest which works with the current API key
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // Build conversation context from history
        let conversationContext = "";
        if (history && history.length > 0) {
            conversationContext = history
                .slice(-5)
                .map((msg: any) => `${msg.role === "doula" ? "Assistant" : "User"}: ${msg.text}`)
                .join("\n");
            conversationContext += "\n";
        }

        const prompt = conversationContext + `User: ${message}\nAssistant:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error("Gemini API Error:", error?.message || error);
        return NextResponse.json(
            { text: "I'm having a little trouble connecting right now. Remember to drink some water!" },
            { status: 500 }
        );
    }
}
