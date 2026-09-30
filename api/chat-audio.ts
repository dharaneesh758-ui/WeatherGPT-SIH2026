import Groq from "groq-sdk";
// @ts-ignore Node modules are available in the server runtime.
import fs from "fs";
// @ts-ignore Node modules are available in the server runtime.
import path from "path";
// @ts-ignore Node modules are available in the server runtime.
import os from "os";
// @ts-ignore Node modules are available in the server runtime.
import crypto from "crypto";

const MODEL = "openai/gpt-oss-20b";
const WHISPER_MODEL = "whisper-large-v3-turbo";

function weatherSummary(weather: any) {
  if (!weather) return null;

  return {
    location: weather.location
      ? {
          name: weather.location.name,
          country: weather.location.country,
        }
      : null,

    timezone: weather.timezone,

    current: weather.current
      ? {
          temperature: weather.current.temperature,
          apparentTemperature:
            weather.current.apparentTemperature,
          humidity: weather.current.humidity,
          precipitation: weather.current.precipitation,
          rain: weather.current.rain,
          showers: weather.current.showers,
          weatherCode: weather.current.weatherCode,
          windSpeed: weather.current.windSpeed,
          windGusts: weather.current.windGusts,
          pressure: weather.current.pressure,
          cloudCover: weather.current.cloudCover,
          visibility: weather.current.visibility,
          uvIndex: weather.current.uvIndex,
        }
      : null,

    daily: weather.daily
      ? {
          time: weather.daily.time?.slice(0, 3),
          weatherCode:
            weather.daily.weatherCode?.slice(0, 3),
          tempMax:
            weather.daily.tempMax?.slice(0, 3),
          tempMin:
            weather.daily.tempMin?.slice(0, 3),
          precipitationProbability:
            weather.daily.precipitationProbability?.slice(
              0,
              3
            ),
          precipitationSum:
            weather.daily.precipitationSum?.slice(
              0,
              3
            ),
          windSpeedMax:
            weather.daily.windSpeedMax?.slice(
              0,
              3
            ),
          windGustsMax:
            weather.daily.windGustsMax?.slice(
              0,
              3
            ),
        }
      : null,

    airQuality: weather.airQuality
      ? {
          pm10:
            weather.airQuality.pm10?.slice(0, 3),
          pm2_5:
            weather.airQuality.pm2_5?.slice(0, 3),
          europeanAqi:
            weather.airQuality.europeanAqi?.slice(
              0,
              3
            ),
          usAqi:
            weather.airQuality.usAqi?.slice(
              0,
              3
            ),
        }
      : null,
  };
}

function detectScript(text: string) {
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return "ta";
  }

  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }

  return null;
}

function detectTanglish(text: string) {
  const words = [
    "da",
    "dei",
    "machi",
    "bro",
    "enna",
    "epdi",
    "iruku",
    "irukku",
    "venum",
    "pannu",
    "sollu",
    "inga",
    "anga",
    "mazhai",
    "veyil",
    "kaathu",
    "nalla",
    "romba",
    "eppo",
    "varuma",
    "poguma",
    "happened",
  ];

  const lower = text.toLowerCase();

  return words.some((word) =>
    lower.includes(word)
  );
}

function detectLanguage(
  transcript: string,
  languageHint?: string
) {
  const script =
    detectScript(transcript);

  if (script) {
    return script;
  }

  if (detectTanglish(transcript)) {
    return "tanglish";
  }

  const hint =
    String(languageHint || "")
      .toLowerCase();

  if (hint.includes("tanglish")) {
    return "tanglish";
  }

  if (hint === "ta") {
    return "ta";
  }

  if (hint === "hi") {
    return "hi";
  }

  return "en";
}

function getExtension(
  mimeType: string
) {
  const mime =
    mimeType.toLowerCase();

  if (mime.includes("webm")) {
    return ".webm";
  }

  if (mime.includes("mp4")) {
    return ".mp4";
  }

  if (mime.includes("mpeg")) {
    return ".mp3";
  }

  if (mime.includes("wav")) {
    return ".wav";
  }

  if (mime.includes("ogg")) {
    return ".ogg";
  }

  return ".webm";
}

export async function POST(
  request: Request
) {
  let tempFile = "";

  try {
    const apiKey =
      (globalThis as any).process?.env
        ?.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY is not configured",
        },
        { status: 500 }
      );
    }

    const body =
      await request.json();

    const audio =
      body?.audio;

    const mimeType =
      body?.mimeType ||
      "audio/webm";

    const weather =
      body?.weather;

    const languageHint =
      body?.languageHint ||
      "en";

    if (
      !audio ||
      typeof audio !== "string"
    ) {
      return Response.json(
        {
          error:
            "Audio data is required",
        },
        { status: 400 }
      );
    }

    /*
     * Create temporary audio file.
     */

    const extension =
      getExtension(mimeType);

    const filename =
      `weathergpt-${crypto.randomUUID()}${extension}`;

    tempFile =
      path.join(
        os.tmpdir(),
        filename
      );

    const binaryAudio =
      atob(audio);
    const audioBuffer =
      Uint8Array.from(
        binaryAudio,
        (character) => character.charCodeAt(0)
      );

    fs.writeFileSync(
      tempFile,
      audioBuffer
    );

    const groq =
      new Groq({
        apiKey,
      });

    /*
     * ==========================================
     * WHISPER
     * ==========================================
     */

    const transcription =
      await groq.audio.transcriptions.create(
        {
          file:
            fs.createReadStream(
              tempFile
            ),

          model:
            WHISPER_MODEL,

          response_format:
            "json",

          temperature: 0,

          prompt:
            "The speaker may use English, Tamil, Hindi, Tanglish, or mixed English and Indian languages. Preserve the spoken words accurately.",
        }
      );

    const transcript =
      String(
        transcription.text || ""
      ).trim();

    if (!transcript) {
      throw new Error(
        "Could not transcribe audio"
      );
    }

    console.log(
      "Whisper transcript:",
      transcript
    );

    /*
     * ==========================================
     * LANGUAGE DETECTION
     * ==========================================
     */

    const language =
      detectLanguage(
        transcript,
        languageHint
      );

    /*
     * ==========================================
     * WEATHER DATA
     * ==========================================
     */

    const compactWeather =
      weatherSummary(weather);

    /*
     * ==========================================
     * GPT PROMPT
     * ==========================================
     */

    const prompt = `
You are WeatherGPT, an intelligent
weather and disaster-management assistant.

VOICE TRANSCRIPT:
${transcript}

DETECTED LANGUAGE:
${language}

CURRENT WEATHER DATA:
${JSON.stringify(
  compactWeather,
  null,
  2
)}

LANGUAGE RULES:

1. Reply in the same language as the
spoken question.

2. If language is "ta", reply in Tamil.

3. If language is "hi", reply in Hindi.

4. If language is "en", reply in English.

5. If language is "tanglish", reply in
natural Tanglish using English letters.

6. If the user speaks mixed language,
preserve the mixed conversational style.

7. NEVER automatically translate Tamil,
Hindi or Tanglish into English.

8. Keep the response short and natural.

WEATHER RULES:

1. Use only the supplied weather data.

2. Never invent weather values.

3. Never invent official government warnings.

4. Never call an AI risk assessment an
official government warning.

5. If information is unavailable,
clearly say so.

6. Answer unrelated questions helpfully.

Return ONLY valid JSON:

{
  "language": "${language}",
  "response": "answer in the same language"
}
`;

    const completion =
      await groq.chat.completions.create({
        model: MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are WeatherGPT. Always answer in the language used by the speaker.",
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

    const content =
      completion.choices?.[0]
        ?.message?.content
        ?.trim();

    if (!content) {
      throw new Error(
        "Groq returned an empty response"
      );
    }

    let parsed: any;

    try {
      parsed =
        JSON.parse(content);
    } catch {
      parsed = {
        language,
        response: content,
      };
    }

    return Response.json({
      transcript,

      language:
        parsed.language ||
        language,

      response:
        typeof parsed.response ===
        "string"
          ? parsed.response
          : content,
    });
  } catch (error: any) {
    console.error(
      "WeatherGPT voice API error:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to process voice",
        details:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );
  } finally {
    /*
     * Delete temporary audio file.
     */

    if (
      tempFile &&
      fs.existsSync(tempFile)
    ) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export async function GET() {
  return Response.json({
    status: "ok",
    service:
      "WeatherGPT Voice API",
    model: WHISPER_MODEL,
  });
}