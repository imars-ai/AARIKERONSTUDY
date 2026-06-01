import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize Gemini with the API Key gracefully (handles missing key)
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
    const { task } = await req.json();
    if (!task) {
      return NextResponse.json({ error: "No task defined" }, { status: 400 });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Simulate highly realistic offline response if API Key is not loaded
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      await delay(800); // realistic network delay feeling

      // Basic heuristic to output beautiful mock response based on keyword inputs
      const textLower = task.toLowerCase();
      let subject = "Historia";
      let minutes = 45;
      let workload = "Óptima";
      let steps = [
        { title: "Lectura concentrada sin distracciones", minutes: 15 },
        { title: "Subrayado de ideas principales", minutes: 15 },
        { title: "Resumen integrador del concepto", minutes: 15 }
      ];

      if (textLower.includes("mate") || textLower.includes("ejercicio") || textLower.includes("problema")) {
        subject = "Matemáticas";
        minutes = 75;
        workload = "Alta";
        steps = [
          { title: "Resolución razonada de enunciados complejos", minutes: 30 },
          { title: "Revisión matemática paso a paso", minutes: 20 },
          { title: "Práctica autónoma adicional", minutes: 25 }
        ];
      } else if (textLower.includes("física") || textLower.includes("química") || textLower.includes("lab")) {
        subject = textLower.includes("química") ? "Química" : "Física";
        minutes = 60;
        workload = "Media";
        steps = [
          { title: "Comprensión de fórmulas y unidades", minutes: 20 },
          { title: "Resolución paso a paso del problema", minutes: 25 },
          { title: "Anotación de dudas y fórmulas clave", minutes: 15 }
        ];
      }

      return NextResponse.json({
        estimatedMinutes: minutes,
        workloadRating: workload,
        subjectSuggestion: subject,
        steps,
        note: "Simulado localmente (Establece GEMINI_API_KEY para análisis real)."
      });
    }

    // Call Gemini 3.5 Flash to return structural estimation
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Proporciona una estimación de tiempo realista para un estudiante de secundaria/bachillerato para realizar la siguiente tarea de estudio: "${task}".
      Estima el tiempo en minutos, clasifica la carga de trabajo en una escala ('Óptima', 'Media', 'Alta'), y divide la tarea principal en 3 o 4 pasos prácticos cortos y concretos con su duración asignada (en minutos).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["estimatedMinutes", "workloadRating", "steps", "subjectSuggestion"],
          properties: {
            estimatedMinutes: {
              type: Type.INTEGER,
              description: "Tiempo total estimado en minutos para completar la tarea completa."
            },
            workloadRating: {
              type: Type.STRING,
              description: "Carga de trabajo estimada: 'Óptima', 'Media' o 'Alta'."
            },
            subjectSuggestion: {
              type: Type.STRING,
              description: "Asignatura típica sugerida para esta tarea, ej. 'Matemáticas', 'Historia', 'Lengua', 'Física', 'Inglés', 'Química'."
            },
            steps: {
              type: Type.ARRAY,
              description: "Lista de 3 a 4 pasos recomendados para realizar esta tarea.",
              items: {
                type: Type.OBJECT,
                required: ["title", "minutes"],
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "Breve descripción del paso práctico."
                  },
                  minutes: {
                    type: Type.INTEGER,
                    description: "Duración asignada a este paso."
                  }
                }
              }
            }
          }
        }
      }
    });

    const estimationData = JSON.parse(response.text?.trim() || "{}");
    return NextResponse.json(estimationData);
  } catch (error: any) {
    console.error("Gemini estimation error: ", error);
    return NextResponse.json({
      estimatedMinutes: 60,
      workloadRating: "Media",
      subjectSuggestion: "Historia",
      steps: [
        { title: "Lectura activa del contenido principal", minutes: 20 },
        { title: "Esquematización técnica de conceptos clave", minutes: 20 },
        { title: "Repaso mental y autoevaluación final", minutes: 20 }
      ],
      warning: "Fallback local activado tras error."
    });
  }
}
