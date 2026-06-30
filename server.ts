import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/roast", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Initialize the Gemini API client
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Generate a simple understandable, single, dark, witty, and highly sarcastic roast for the name "${name}".
        The roast should be a single every group understandable, daddy type, punchy sentence under 25 words.
        Base it on an imaginative or absurd scenario (like a medical side effect, a failed magic spell, a corporate nightmare, a bad omen, or a ghostly annoyance).
        Do not be genuinely cruel.
        Example style: "Shreyan sounds like a software update that only changes the terms of service."
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ roast: response.text });
    } catch (error) {
      console.error("Error generating roast:", error);
      res.status(500).json({ error: "Sorry, the roast machine is broken. Try again later." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "mpa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    app.get("/admin*", (req, res) => {
      res.sendFile(path.join(distPath, "admin.html"));
    });
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
