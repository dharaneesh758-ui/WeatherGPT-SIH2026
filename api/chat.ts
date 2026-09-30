import Groq from "groq-sdk";

const MODEL = "openai/gpt-oss-20b";

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
          weatherCode: weather.daily.weatherCode?.slice(0, 3),
          tempMax: weather.daily.tempMax?.slice(0, 3),
          tempMin: weather.daily.tempMin?.slice(0, 3),
          precipitationProbability:
            weather.daily.precipitationProbability?.slice(0, 3),
          precipitationSum:
            weather.daily.precipitationSum?.slice(0, 3),
          windSpeedMax:
            weather.daily.windSpeedMax?.slice(0, 3),
          windGustsMax:
            weather.daily.windGustsMax?.slice(0, 3),
        }
      : null,

    hourly: weather.hourly
      ? {
          time: weather.hourly.time?.slice(0, 6),
          temperature:
            weather.hourly.temperature?.slice(0, 6),
          precipitationProbability:
            weather.hourly.precipitationProbability?.slice(0, 6),
          precipitation:
            weather.hourly.precipitation?.slice(0, 6),
          windSpeed:
            weather.hourly.windSpeed?.slice(0, 6),
          windGusts:
            weather.hourly.windGusts?.slice(0, 6),
        }
      : null,

    airQuality: weather.airQuality
      ? {
          pm10: weather.airQuality.pm10?.slice(0, 3),
          pm2_5: weather.airQuality.pm2_5?.slice(0, 3),
          europeanAqi:
            weather.airQuality.europeanAqi?.slice(0, 3),
          usAqi:
            weather.airQuality.usAqi?.slice(0, 3),
        }
      : null,
  };
}

function detectLanguage(language: string) {
  const value = String(language || "")
    .toLowerCase()
    .trim();

  if (
    value === "ta" ||
    value.includes("tamil")
  ) {
    return "ta";
  }

  if (
    value === "hi" ||
    value.includes("hindi")
  ) {
    return "hi";
  }

  if (
    value.includes("tanglish")
  ) {
    return "tanglish";
  }

  if (
    value.includes("mixed")
  ) {
    return "mixed";
  }

  return "en";
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

export async function POST(request: Request) {
  try {
    const apiKey =
      (globalThis as any).process?.env?.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY is not configured on the server",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const message = body?.message;
    const weather = body?.weather;
    const risk = body?.risk ?? null;
    const requestedLanguage =
      body?.language ?? "en";

    if (
      !message ||
      typeof message !== "string"
    ) {
      return Response.json(
        {
          error: "Message is required",
        },
        { status: 400 }
      );
    }

    const compactWeather =
      weatherSummary(weather);

    /*
     * If the actual message contains Tamil/Hindi
     * script, trust the message over the UI selector.
     */
    const scriptLanguage =
      detectScript(message);

    const language =
      scriptLanguage ||
      detectLanguage(requestedLanguage);

    const prompt = `
You are WeatherGPT, an intelligent
weather and disaster-management assistant.

USER MESSAGE:
${message}

USER LANGUAGE:
${language}

CURRENT WEATHER DATA:
${JSON.stringify(
  compactWeather,
  null,
  2
)}

WEATHER RISK ASSESSMENT:
${JSON.stringify(
  risk,
  null,
  2
)}

LANGUAGE REQUIREMENTS:

1. You MUST reply in the same language and
style as the user.

2. If USER LANGUAGE is "ta", reply completely
in Tamil.

3. If USER LANGUAGE is "hi", reply completely
in Hindi.

4. If USER LANGUAGE is "en", reply in English.

5. If USER LANGUAGE is "tanglish", reply in
Tanglish using natural Tamil words written
in English letters.

6. If USER LANGUAGE is "mixed", preserve the
user's mixture of English and Tamil/Hindi.

7. NEVER automatically translate a Tamil,
Hindi or Tanglish question into English.

8. Do not change Tanglish into formal Tamil
unless the user asks for it.

9. Keep the response natural and conversational.

WEATHER RULES:

1. Use supplied weather data for weather questions.

2. NEVER invent weather values.

3. NEVER invent official government warnings.

4. Never describe an AI risk assessment as an
official government warning.

5. For rain questions, use precipitation
probability and precipitation amount.

6. For temperature questions, use temperature
and apparent temperature.

7. For wind questions, use wind speed and gusts.

8. For forecast questions, use daily/hourly data.

9. For air-quality questions, use AQ data.

10. If data is insufficient, clearly say so.

11. If unrelated to weather, answer helpfully.

12. Keep the answer concise.

Return ONLY valid JSON:

{
  "language": "${language}",
  "response": "answer in the required language"
}
`;

    const groq = new Groq({
      apiKey,
    });

    const completion =
      await groq.chat.completions.create({
        model: MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are WeatherGPT. Always follow the user's requested language and never unnecessarily switch to English.",
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
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        language,
        response: content,
      };
    }

    const responseText =
      typeof parsed.response === "string"
        ? parsed.response
        : content;

    const responseLanguage =
      detectLanguage(
        parsed.language || language
      );

    return Response.json({
      response: responseText,
      language: responseLanguage,
    });
  } catch (error: any) {
    console.error(
      "WeatherGPT API ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to generate AI response",
        details:
          error?.message ||
          "Unknown server error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return Response.json({
    status: "ok",
    service: "WeatherGPT API",
    model: MODEL,
  });
}