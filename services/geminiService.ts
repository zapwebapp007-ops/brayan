
import { GoogleGenAI, Type } from "@google/genai";
import { OrderItem, Product } from "../types";

/**
 * Service to get smart food/drink suggestions based on current orders.
 */
export const getSmartSuggestions = async (currentItems: OrderItem[], availableProducts: Product[], roomType: string) => {
  // Use strictly required initialization: const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
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
      model: "gemini-3-flash-preview",
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

    // Access text property directly as per guideline
    if (response.text) {
      return JSON.parse(response.text.trim());
    }
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
  return [];
};
