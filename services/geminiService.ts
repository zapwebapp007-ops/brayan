
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { OrderItem, Product } from "../types";

// Base64 decoding helper
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// PCM Audio Decoding helper
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Service to get smart food/drink suggestions based on current orders.
 * Uses gemini-flash-lite-latest for low-latency responses.
 */
export const getSmartSuggestions = async (currentItems: OrderItem[], availableProducts: Product[], roomType: string) => {
  // Always initialize with the direct API key from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const currentOrdersText = currentItems.map(i => `${i.quantity}x ${i.name}`).join(", ");
  const productsList = availableProducts.map(p => `${p.name} (${p.category})`).join(", ");

  const prompt = `
    Context: You are a professional waiter at a premium Restaurant and KTV Bar.
    Customer is currently in a ${roomType}.
    Current items ordered: ${currentOrdersText || "Nothing yet"}.
    Available Menu Items: ${productsList}.
    
    Task: Suggest 3 additional items from the available menu that would pair perfectly or provide a great upsell for the customer.
    If they have drinks, suggest "pulutan" (snacks). If it's a long session, suggest meals.
    Be smart and specific.
  `;

  try {
    const response = await ai.models.generateContent({
      // Fixed: Using the mapped common name 'gemini-flash-lite-latest'
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["name", "reason"]
          }
        }
      }
    });

    // Correctly accessing text property from GenerateContentResponse
    if (response.text) {
      return JSON.parse(response.text.trim());
    }
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
  return [];
};

/**
 * Service to generate and play TTS audio for announcements.
 * Uses gemini-2.5-flash-preview-tts.
 */
export const speakAnnouncement = async (text: string) => {
  try {
    // Re-initialize to ensure latest context/key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say naturally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Warm, helpful voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        audioContext,
        24000,
        1
      );
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    }
  } catch (error) {
    console.error("TTS Generation Error:", error);
  }
};
