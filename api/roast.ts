import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `
      Generate a simple understandable, single, dark, witty, and highly sarcastic roast for the name "${name}".
      The roast should be a single every group understandable, daddy type, punchy sentence under 25 words.
      Base it on an imaginative or absurd scenario (like a medical side effect, a failed magic spell, a corporate nightmare, a bad omen, or a ghostly annoyance).
      Do not be genuinely cruel.
      Example style: "Shreyan sounds like a software update that only changes the terms of service."
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.status(200).json({ roast: response.text });
  } catch (error) {
    console.error('Error generating roast:', error);
    res.status(500).json({ error: 'Sorry, the roast machine is broken. Try again later.' });
  }
}
