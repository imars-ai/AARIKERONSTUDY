import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Offline fallback
      const lastUserMessage = messages[messages.length - 1]?.parts?.[0]?.text || "Hola";
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      await delay(800);

      let mockReply = "¡Hola! Estoy funcionando en **modo local** (sin conexión con Gemini). ";
      const textLower = lastUserMessage.toLowerCase();
      
      if (textLower.includes("consejo") || textLower.includes("estudiar") || textLower.includes("organizar")) {
        mockReply += "Te recomiendo usar el temporizador **Pomodoro** (25 minutos de estudio y 5 de descanso) para mantener la concentración. Divide tus tareas de asignaturas como Plástica, Música o PIAR en pasos pequeños.";
      } else if (textLower.includes("plastica") || textLower.includes("plástica")) {
        mockReply += "Para Plástica, la clave es la paciencia. Organiza tus entregas de dibujo técnico o artístico dedicando al menos un bloque Pomodoro continuo por lámina.";
      } else if (textLower.includes("música") || textLower.includes("musica")) {
        mockReply += "En Música, intenta cantar la melodía o repasar el ritmo con percusión corporal antes de tocar el instrumento. Eso asienta el ritmo mucho más rápido.";
      } else if (textLower.includes("piar") || textLower.includes("religion") || textLower.includes("reli")) {
        mockReply += "Para PIAR o Religión, asocia los valores éticos y relatos con dilemas de la vida real. Esto te ayudará a asimilar las reflexiones de forma más profunda.";
      } else {
        mockReply += "Como tu compañero en **Aarikeron Study**, te sugiero planificar tus semanas equilibrando la carga de materias duras (como Matemáticas) con artísticas/humanísticas (Plástica, Música, PIAR, Religión). ¿En qué más puedo ayudarte hoy?";
      }

      return NextResponse.json({
        text: mockReply,
        isMock: true
      });
    }

    // Call Gemini 3.5 Flash
    // We map client messages to Google GenAI structure if they aren't already
    const contents = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: Array.isArray(msg.parts) ? msg.parts : [{ text: msg.content || msg.text || "" }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: "Eres Aarikeron AI, el tutor académico y asistente de estudio virtual de la plataforma Aarikeron Study. Tu misión es motivar, guiar y dar consejos de estudio prácticos a los alumnos de secundaria/bachillerato en castellano. Eres amigable, empático, claro, usas un lenguaje fresco pero respetuoso (puedes llamarle 'crack', 'fiera', 'máquina' de forma agradable si quieres, ya que el usuario usa esa jerga simpática). Ayúdales con asignaturas como Plástica, Música, PIAR, Religión, Matemáticas, Lengua, Física, Inglés, etc. Da ideas de organización y aconseja cómo balancear la carga de trabajo semanalmente. Brinda respuestas con formato markdown bonito."
      }
    });

    return NextResponse.json({
      text: response.text || "No obtuve respuesta de la IA. Inténtalo de nuevo.",
      isMock: false
    });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    return NextResponse.json({
      text: "Vaya, ha ocurrido un error al conectar con Gemini. Por favor, asegúrate de haber configurado tu clave API GEMINI_API_KEY o inténtalo más tarde.",
      error: error.message
    }, { status: 500 });
  }
}
