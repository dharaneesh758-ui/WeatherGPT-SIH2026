import express from "express";
import cors from "cors";
import "dotenv/config";
import Groq from "groq-sdk";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

const app = express();
const PORT = 3001;

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is missing");
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const AI_MODEL = "openai/gpt-oss-20b";
const WHISPER_MODEL = "whisper-large-v3-turbo";

app.use(cors());

app.use(
  express.json({
    limit: "30mb",
  })
);

// ============================================================
// JSON RESPONSE PARSER
// ============================================================

function parseJsonResponse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {}

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    const possibleJson = cleaned.substring(start, end + 1);

    try {
      return JSON.parse(possibleJson);
    } catch {
      return null;
    }
  }

  return null;
}

// ============================================================
// LANGUAGE VALIDATION
// ============================================================

function detectLanguageLabel(language: string) {
  const allowed = [
    "en",
    "ta",
    "hi",
    "tanglish",
    "mixed",
  ];

  return allowed.includes(language) ? language : "en";
}

// ============================================================
// WEATHER SUMMARY
// ============================================================

function createWeatherSummary(weather: any) {
  if (!weather) {
    return null;
  }

  const current = weather.current;
  const hourly = weather.hourly;
  const daily = weather.daily;
  const airQuality = weather.airQuality;

  // ----------------------------------------------------------
  // Find current hour
  // ----------------------------------------------------------

  let currentHourIndex = 0;

  if (hourly?.time?.length) {
    const now = new Date();

    const foundIndex = hourly.time.findIndex(
      (time: string) => {
        const d = new Date(time);

        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate() &&
          d.getHours() === now.getHours()
        );
      }
    );

    if (foundIndex >= 0) {
      currentHourIndex = foundIndex;
    }
  }

  // ----------------------------------------------------------
  // Next 6 hours
  // ----------------------------------------------------------

  const nextHoursCount = 6;

  const nextHours = hourly
    ? {
        time: hourly.time?.slice(
          currentHourIndex,
          currentHourIndex + nextHoursCount
        ),

        temperature: hourly.temperature?.slice(
          currentHourIndex,
          currentHourIndex + nextHoursCount
        ),

        precipitationProbability:
          hourly.precipitationProbability?.slice(
            currentHourIndex,
            currentHourIndex + nextHoursCount
          ),

        precipitation:
          hourly.precipitation?.slice(
            currentHourIndex,
            currentHourIndex + nextHoursCount
          ),

        weatherCode:
          hourly.weatherCode?.slice(
            currentHourIndex,
            currentHourIndex + nextHoursCount
          ),

        windSpeed:
          hourly.windSpeed?.slice(
            currentHourIndex,
            currentHourIndex + nextHoursCount
          ),

        windGusts:
          hourly.windGusts?.slice(
            currentHourIndex,
            currentHourIndex + nextHoursCount
          ),
      }
    : null;

  // ----------------------------------------------------------
  // Next 3 days
  // ----------------------------------------------------------

  const daysToKeep = 3;

  const dailySummary = daily
    ? {
        time: daily.time?.slice(
          0,
          daysToKeep
        ),

        weatherCode:
          daily.weatherCode?.slice(
            0,
            daysToKeep
          ),

        tempMax:
          daily.tempMax?.slice(
            0,
            daysToKeep
          ),

        tempMin:
          daily.tempMin?.slice(
            0,
            daysToKeep
          ),

        precipitationProbability:
          daily.precipitationProbability?.slice(
            0,
            daysToKeep
          ),

        precipitationSum:
          daily.precipitationSum?.slice(
            0,
            daysToKeep
          ),

        windSpeedMax:
          daily.windSpeedMax?.slice(
            0,
            daysToKeep
          ),

        windGustsMax:
          daily.windGustsMax?.slice(
            0,
            daysToKeep
          ),

        uvIndexMax:
          daily.uvIndexMax?.slice(
            0,
            daysToKeep
          ),
      }
    : null;

  // ----------------------------------------------------------
  // Air Quality
  // ----------------------------------------------------------

  let airQualitySummary = null;

  if (airQuality) {
    airQualitySummary = {
      pm10:
        airQuality.pm10?.slice(
          0,
          3
        ),

      pm2_5:
        airQuality.pm2_5?.slice(
          0,
          3
        ),

      europeanAqi:
        airQuality.europeanAqi?.slice(
          0,
          3
        ),

      usAqi:
        airQuality.usAqi?.slice(
          0,
          3
        ),
    };
  }

  // ----------------------------------------------------------
  // Final compact object
  // ----------------------------------------------------------

  return {
    location: weather.location
      ? {
          name: weather.location.name,
          country: weather.location.country,
        }
      : null,

    timezone: weather.timezone,

    current: current
      ? {
          temperature:
            current.temperature,

          apparentTemperature:
            current.apparentTemperature,

          humidity:
            current.humidity,

          precipitation:
            current.precipitation,

          rain:
            current.rain,

          showers:
            current.showers,

          snowfall:
            current.snowfall,

          weatherCode:
            current.weatherCode,

          windSpeed:
            current.windSpeed,

          windDirection:
            current.windDirection,

          windGusts:
            current.windGusts,

          pressure:
            current.pressure,

          cloudCover:
            current.cloudCover,

          visibility:
            current.visibility,

          uvIndex:
            current.uvIndex,

          isDay:
            current.isDay,

          time:
            current.time,
        }
      : null,

    nextHours,

    daily: dailySummary,

    airQuality:
      airQualitySummary,
  };
}

// ============================================================
// TEXT CHAT PROMPT
// ============================================================

function createWeatherPrompt(
  message: string,
  weather: any,
  risk: any
) {
  const weatherSummary =
    createWeatherSummary(weather);

  return `
You are WeatherGPT, an intelligent weather and disaster-management assistant.

The user may communicate using:

- English
- Tamil
- Hindi
- Tanglish
- Mixed English + Tamil
- Mixed English + Hindi

==================================================
LANGUAGE RULE
==================================================

Detect the language/style from the user's ACTUAL MESSAGE.

If English:
Reply in English.

If Tamil:
Reply in Tamil script.

If Hindi:
Reply in Hindi script.

If Tanglish:
Reply naturally in Tanglish.

If mixed English + Tamil:
Reply naturally in the same mixed style.

If mixed English + Hindi:
Reply naturally in the same mixed style.

DO NOT automatically convert everything to English.

==================================================
USER MESSAGE
==================================================

${message}

==================================================
CURRENT WEATHER DATA
==================================================

${JSON.stringify(weatherSummary)}

==================================================
WEATHER RISK ASSESSMENT
==================================================

${JSON.stringify(risk ?? null)}

==================================================
IMPORTANT INSTRUCTIONS
==================================================

1. Understand exactly what the user is asking.

2. Detect the user's actual language/style.

3. Answer in the same language/style.

4. Use supplied weather data whenever relevant.

5. NEVER invent weather values.

6. NEVER invent official government warnings.

7. Do not describe the AI risk assessment as an official warning.

8. If supplied data is insufficient, clearly say so.

9. For genuine weather risks, provide practical safety advice.

10. Keep answers concise and useful.

11. When weather values are available, use specific values.

12. For current weather questions, use CURRENT WEATHER DATA.

13. For rain questions, use precipitation probability and rainfall amount.

14. For temperature questions, use temperature and apparent temperature.

15. For wind questions, use wind speed and gusts.

16. For tomorrow/forecast questions, use DAILY and NEXT HOURS data.

17. For air-quality questions, use supplied AQI and PM values.

18. For safety/disaster questions, use supplied risk assessment.

19. If unrelated to weather, answer helpfully.

20. Do not produce unnecessarily long explanations.

21. Do not use markdown tables unless explicitly requested.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Use exactly:

{
  "language": "en",
  "response": "your answer"
}

Allowed language values:

"en"
"ta"
"hi"
"tanglish"
"mixed"
`;
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "WeatherGPT API",
    model: AI_MODEL,
    whisper: WHISPER_MODEL,
  });
});

// ============================================================
// TEXT CHAT API
// IMPORTANT:
// Vercel function /api/chat maps to this "/"
// ============================================================

app.post("/", async (req, res) => {
  try {
    const {
      message,
      weather,
      risk,
      language = "en",
    } = req.body;

    if (
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    console.log(
      "User message:",
      message
    );

    const prompt =
      createWeatherPrompt(
        message,
        weather,
        risk
      );

    console.log(
      "Sending request to Groq..."
    );

    const completion =
      await groq.chat.completions.create({
        model: AI_MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are WeatherGPT. Use only the supplied weather information for weather facts and follow the user's language.",
          },

          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.2,

        response_format: {
          type: "json_object",
        },

        max_tokens: 700,
      });

    const generatedText =
      completion.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new Error(
        "Groq returned an empty response"
      );
    }

    console.log(
      "AI response generated successfully."
    );

    const parsed =
      parseJsonResponse(
        generatedText
      );

    if (parsed) {
      return res.json({
        response:
          typeof parsed.response ===
          "string"
            ? parsed.response
            : generatedText,

        language:
          detectLanguageLabel(
            parsed.language ||
              language
          ),
      });
    }

    return res.json({
      response: generatedText,
      language:
        detectLanguageLabel(
          language
        ),
    });
  } catch (error: any) {
    console.error(
      "Groq text API error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to generate AI response",

      details:
        error?.message ||
        "Unknown Groq API error",
    });
  }
});

// ============================================================
// VOICE CHAT API
// ============================================================

app.post(
  "/api/chat/audio",

  express.json({
    limit: "30mb",
  }),

  async (req, res) => {
    let tempFilePath = "";

    try {
      const {
        audio,
        mimeType = "audio/webm",
        weather,
        risk,
      } = req.body;

      // ------------------------------------------------------
      // Validate audio
      // ------------------------------------------------------

      if (
        !audio ||
        typeof audio !== "string"
      ) {
        return res.status(400).json({
          error:
            "Audio data is required",
        });
      }

      const cleanMimeType =
        mimeType
          .split(";")[0]
          .trim();

      console.log(
        `Received voice message. MIME: ${cleanMimeType}`
      );

      // ------------------------------------------------------
      // Determine extension
      // ------------------------------------------------------

      let extension = ".webm";

      if (
        cleanMimeType.includes(
          "wav"
        )
      ) {
        extension = ".wav";
      } else if (
        cleanMimeType.includes(
          "mp3"
        )
      ) {
        extension = ".mp3";
      } else if (
        cleanMimeType.includes(
          "mpeg"
        )
      ) {
        extension = ".mp3";
      } else if (
        cleanMimeType.includes(
          "mp4"
        )
      ) {
        extension = ".mp4";
      } else if (
        cleanMimeType.includes(
          "ogg"
        )
      ) {
        extension = ".ogg";
      } else if (
        cleanMimeType.includes(
          "m4a"
        )
      ) {
        extension = ".m4a";
      }

      // ------------------------------------------------------
      // Convert Base64 audio
      // ------------------------------------------------------

      const audioBuffer =
        Buffer.from(
          audio,
          "base64"
        );

      if (
        !audioBuffer.length
      ) {
        return res.status(400).json({
          error:
            "Invalid audio data",
        });
      }

      // ------------------------------------------------------
      // Temporary file
      // ------------------------------------------------------

      const fileName =
        `weathergpt-${crypto.randomUUID()}${extension}`;

      tempFilePath =
        path.join(
          os.tmpdir(),
          fileName
        );

      fs.writeFileSync(
        tempFilePath,
        audioBuffer
      );

      console.log(
        "Temporary audio file created."
      );

      // ------------------------------------------------------
      // Whisper transcription
      // ------------------------------------------------------

      console.log(
        "Sending audio to Whisper..."
      );

      const transcription =
        await groq.audio.transcriptions.create(
          {
            file:
              fs.createReadStream(
                tempFilePath
              ),

            model:
              WHISPER_MODEL,

            response_format:
              "json",

            temperature: 0,

            prompt:
              "The speaker may use English, Tamil, Hindi, Tanglish, or mixed languages. Preserve the speaker's original language and wording as accurately as possible. Do not translate the speech into English. Preserve Tamil and Hindi words when possible.",
          }
        );

      const transcript =
        transcription.text?.trim();

      if (!transcript) {
        throw new Error(
          "Whisper returned an empty transcription"
        );
      }

      console.log(
        "Transcript:",
        transcript
      );

      // ------------------------------------------------------
      // Weather summary
      // ------------------------------------------------------

      const weatherSummary =
        createWeatherSummary(
          weather
        );

      // ------------------------------------------------------
      // Voice prompt
      // ------------------------------------------------------

      const voicePrompt = `
You are WeatherGPT, a multilingual voice weather assistant.

==================================================
USER VOICE TRANSCRIPT
==================================================

"${transcript}"

==================================================
LANGUAGE
==================================================

Identify the language/style from the transcript.

Possible styles:

1. English
2. Tamil
3. Hindi
4. Tanglish
5. Mixed English + Tamil
6. Mixed English + Hindi

==================================================
RESPONSE LANGUAGE
==================================================

If English:
Reply in English.

If Tamil:
Reply in Tamil script.

If Hindi:
Reply in Hindi script.

If Tanglish:
Reply naturally in Tanglish.

If mixed:
Reply naturally in the same mixed style.

Do NOT translate the user's language into English unless requested.

==================================================
CURRENT WEATHER DATA
==================================================

${JSON.stringify(
  weatherSummary
)}

==================================================
WEATHER RISK
==================================================

${JSON.stringify(
  risk ?? null
)}

==================================================
RULES
==================================================

1. Use supplied weather data.

2. NEVER invent weather values.

3. NEVER invent official government warnings.

4. Do not describe AI risk assessment as an official warning.

5. Provide practical safety advice when appropriate.

6. Keep the answer concise.

7. If weather data is insufficient, say so.

8. Do not use markdown tables.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

{
  "language": "en",
  "response": "WeatherGPT answer"
}

Allowed language values:

"en"
"ta"
"hi"
"tanglish"
"mixed"
`;

      // ------------------------------------------------------
      // Groq response
      // ------------------------------------------------------

      console.log(
        "Sending voice transcript to Groq..."
      );

      const completion =
        await groq.chat.completions.create({
          model: AI_MODEL,

          messages: [
            {
              role: "system",
              content:
                "You are WeatherGPT. You are a multilingual voice assistant. Preserve the user's language and style. Use only supplied weather information for weather facts.",
            },

            {
              role: "user",
              content:
                voicePrompt,
            },
          ],

          temperature: 0.2,

          response_format: {
            type: "json_object",
          },

          max_tokens: 700,
        });

      const generatedText =
        completion.choices?.[0]?.message?.content?.trim();

      if (!generatedText) {
        throw new Error(
          "Groq returned an empty voice response"
        );
      }

      const parsed =
        parseJsonResponse(
          generatedText
        );

      if (parsed) {
        const detectedLanguage =
          detectLanguageLabel(
            parsed.language ||
              "en"
          );

        const responseText =
          typeof parsed.response ===
          "string"
            ? parsed.response
            : generatedText;

        return res.json({
          transcript,

          language:
            detectedLanguage,

          response:
            responseText,
        });
      }

      return res.json({
        transcript,

        language: "en",

        response:
          generatedText,
      });
    } catch (error: any) {
      console.error(
        "Groq voice API error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to process voice message",

        details:
          error?.message ||
          "Unknown Groq voice API error",
      });
    } finally {
      // ------------------------------------------------------
      // Delete temporary file
      // ------------------------------------------------------

      if (
        tempFilePath &&
        fs.existsSync(
          tempFilePath
        )
      ) {
        try {
          fs.unlinkSync(
            tempFilePath
          );
        } catch (cleanupError) {
          console.error(
            "Could not delete temporary audio file:",
            cleanupError
          );
        }
      }
    }
  }
);

// ============================================================
// LOCAL DEVELOPMENT
// Vercel does NOT run app.listen()
// ============================================================

if (process.env.VERCEL !== "1") {
  console.log(
    "Starting WeatherGPT server..."
  );

  app.listen(PORT, () => {
    console.log(
      `WeatherGPT API running at http://localhost:${PORT}`
    );

    console.log(
      `AI model: ${AI_MODEL}`
    );

    console.log(
      `Whisper model: ${WHISPER_MODEL}`
    );
  });
}

// ============================================================
// VERCEL EXPORT
// ============================================================

export default app;