import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const allowedCategories = ["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"];

const allowedStyles = ["Casual", "Formal", "Smart Casual", "Streetwear", "Minimalist", "Sporty", "Vintage"];

const allowedActivities = ["College", "Work", "Hangout", "Special Event"];

type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  style: string;
};

type GeneratedOutfit = {
  itemIds: string[];
  outfitName: string;
  reason: string;
};

// Mencoba ulang jika Gemini sedang sibuk atau terkena rate limit.
async function generateWithRetry(ai: GoogleGenAI, prompt: string) {
  const delays = [1000, 2500, 5000];

  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      const isTemporary = /503|UNAVAILABLE|high demand|429|RESOURCE_EXHAUSTED/i.test(message);

      if (!isTemporary || attempt >= delays.length) {
        throw error;
      }

      console.warn(`Gemini gagal pada percobaan ${attempt + 1}. Mencoba kembali...`);

      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY belum dikonfigurasi." }, { status: 500 });
    }

    const body = await request.json();
    const { wardrobe, style, activity, weather } = body;

    if (!Array.isArray(wardrobe) || !allowedStyles.includes(style) || !allowedActivities.includes(activity)) {
      return NextResponse.json({ error: "Data outfit tidak valid." }, { status: 400 });
    }

    const items: WardrobeItem[] = wardrobe
      .filter((item: WardrobeItem) => item && typeof item.id === "string" && typeof item.name === "string" && allowedCategories.includes(item.category) && typeof item.color === "string" && typeof item.style === "string")
      .map((item: WardrobeItem) => ({
        id: item.id.slice(0, 100),
        name: item.name.slice(0, 100),
        category: item.category,
        color: item.color.slice(0, 50),
        style: item.style.slice(0, 50),
      }));

    // Pastikan ada atasan dan bawahan.
    if (!items.some((item) => item.category === "Tops") || !items.some((item) => item.category === "Bottoms")) {
      return NextResponse.json(
        {
          error: "Tambahkan minimal satu atasan dan satu bawahan.",
        },
        { status: 400 },
      );
    }

    // Pastikan ID barang tidak duplikat.
    const uniqueItemIds = new Set(items.map((item) => item.id));

    if (uniqueItemIds.size !== items.length) {
      return NextResponse.json({ error: "Terdapat ID pakaian yang duplikat." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are a personal fashion stylist for Styleora.

Create one outfit using ONLY the clothing items in the wardrobe.
Never invent clothing items. Return their exact IDs.

User's preferred style: ${style}
Occasion: ${activity}

Weather context:
${JSON.stringify(
  weather
    ? {
        location: weather.location?.name,
        temperature: weather.current?.temperature,
        feelsLike: weather.current?.feelsLike,
        condition: weather.current?.description,
        humidity: weather.current?.humidity,
        windSpeed: weather.current?.windSpeed,
        rainProbability: weather.current?.rainProbability,
      }
    : null,
)}

Weather styling rules:
- Consider the actual temperature and weather condition.
- If rain is likely, prefer suitable outerwear and footwear if available.
- In hot weather, prefer lighter-looking outfits if available.
- In cooler weather, consider layering if available.
- Never invent items or claim an item is waterproof, breathable, or insulated unless that information is provided.
- Weather is an additional factor; the user's requested style and occasion still matter.
- If weather data is unavailable, generate the outfit without weather-based assumptions.


Wardrobe:
${JSON.stringify(items)}

Requirements:
- Include exactly one Tops item and one Bottoms item.
- You may add suitable Outerwear, Shoes, or Accessories if available.
- Use only item IDs from the wardrobe.
- Consider color harmony, style compatibility, and the occasion.
- Do not select the same item more than once.
- Keep the outfit practical and cohesive.
- Explain briefly in English why the pieces work together.
- Return ONLY valid JSON in this format:
{
  "itemIds": ["exact-id-1", "exact-id-2"],
  "outfitName": "A short outfit name",
  "reason": "A brief explanation of the styling choices."
}
`;

    const response = await generateWithRetry(ai, prompt);
    const responseText = response.text;

    if (!responseText) {
      throw new Error("Gemini tidak mengembalikan hasil.");
    }

    const result = JSON.parse(responseText) as GeneratedOutfit;

    if (!Array.isArray(result.itemIds) || !result.itemIds.every((id: unknown) => typeof id === "string")) {
      throw new Error("Format itemIds dari AI tidak valid.");
    }

    if (typeof result.outfitName !== "string" || typeof result.reason !== "string") {
      throw new Error("Format nama outfit atau alasan tidak valid.");
    }

    // Hilangkan ID duplikat dan tolak ID yang tidak ada di wardrobe.
    const selectedIds: string[] = [...new Set(result.itemIds)];

    const selectedItems = selectedIds.map((id) => items.find((item) => item.id === id));

    if (selectedItems.some((item) => !item)) {
      throw new Error("Gemini memilih pakaian yang tidak tersedia di wardrobe.");
    }

    const validSelectedItems = selectedItems as WardrobeItem[];

    const topsCount = validSelectedItems.filter((item) => item.category === "Tops").length;

    const bottomsCount = validSelectedItems.filter((item) => item.category === "Bottoms").length;

    if (topsCount !== 1 || bottomsCount !== 1) {
      throw new Error("Outfit dari Gemini harus memiliki tepat satu atasan dan satu bawahan.");
    }

    return NextResponse.json({
      itemIds: selectedIds,
      outfitName: result.outfitName.slice(0, 100),
      reason: result.reason.slice(0, 500),
    });
  } catch (error) {
    console.error("Generate outfit error:", error);

    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
