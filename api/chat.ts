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
          precipitation:
            weather.current.precipitation,
          rain: weather.current.rain,
          showers: weather.current.showers,
          weatherCode:
            weather.current.weatherCode,
          windSpeed:
            weather.current.windSpeed,
          windGusts:
            weather.current.windGusts,
          pressure:
            weather.current.pressure,
          cloudCover:
            weather.current.cloudCover,
          visibility:
            weather.current.visibility,
          uvIndex:
            weather.current.uvIndex,
        }
      : null,

    daily: weather.daily
      ? {
          time:
            weather.daily.time?.slice(0, 3),

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

    hourly: weather.hourly
      ? {
          time:
            weather.hourly.time?.slice(0, 6),

          temperature:
            weather.hourly.temperature?.slice(
              0,
              6
            ),

          precipitationProbability:
            weather.hourly
              .precipitationProbability
              ?.slice(0, 6),

          precipitation:
            weather.hourly.precipitation?.slice(
              0,
              6
            ),

          windSpeed:
            weather.hourly.windSpeed?.slice(
              0,
              6
            ),

          windGusts:
            weather.hourly.windGusts?.slice(
              0,
              6
            ),
        }
      : null,

    airQuality: weather.airQuality
      ? {
          pm10:
            weather.airQuality.pm10?.slice(
              0,
              3
            ),

          pm2_5:
            weather.airQuality.pm2_5?.slice(
              0,
              3
            ),

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

function detectLanguage(language: string) {
  const allowed = [
    "en",
    "ta",
    "hi",
    "tanglish",
    "mixed",
  ];

  return allowed.includes(language)
    ? language
    : "en";
}

export async function POST(
  request: Request
) {
  try {
    // --------------------------------------------------------
    // Check API key
    // --------------------------------------------------------

    const apiKey =
      (globalThis as any).process?.env
        ?.GROQ_API_KEY;

    if (!apiKey) {
      console.error(
        "GROQ_API_KEY is missing in Vercel"
      );

      return Response.json(
        {
          error:
            "GROQ_API_KEY is not configured on the server",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------
    // Read request
    // --------------------------------------------------------

    const body = await request.json();

    const message =
      body?.message;

    const weather =
      body?.weather;

    const risk =
      body?.risk ?? null;

    const requestedLanguage =
      body?.language ?? "en";

    // --------------------------------------------------------
    // Validate message
    // --------------------------------------------------------

    if (
      !message ||
      typeof message !== "string"
    ) {
      return Response.json(
        {
          error:
            "Message is required",
        },
        { status: 400 }
      );
    }

    console.log(
      "WeatherGPT user message:",
      message
    );

    // --------------------------------------------------------
    // Prepare compact weather data
    // --------------------------------------------------------

    const compactWeather =
      weatherSummary(weather);

    // --------------------------------------------------------
    // Prompt
    // --------------------------------------------------------

    const prompt = `
You are WeatherGPT, an intelligent weather
and disaster-management assistant.

USER MESSAGE:
${message}

USER PREFERRED LANGUAGE:
${requestedLanguage}

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

IMPORTANT RULES:

1. Understand exactly what the user asks.

2. Use the supplied weather data whenever
   the question is related to weather.

3. NEVER invent weather values.

4. NEVER invent official government warnings.

5. Never describe an AI-generated risk assessment
   as an official government warning.

6. For rain questions, use precipitation
   probability and precipitation amount.

7. For temperature questions, use temperature
   and apparent temperature.

8. For wind questions, use wind speed and gusts.

9. For tomorrow or forecast questions,
   use the supplied daily forecast.

10. For air quality questions,
    use the supplied AQ data.

11. If the supplied data is insufficient,
    clearly tell the user.

12. If the question is unrelated to weather,
    answer helpfully.

13. Keep the answer concise.

14. Reply in the same language/style as
    the user's message.

Language options:

en = English
ta = Tamil
hi = Hindi
tanglish = Tanglish
mixed = Mixed language

Return ONLY valid JSON:

{
  "language": "en",
  "response": "your answer"
}
`;

    // --------------------------------------------------------
    // Groq
    // --------------------------------------------------------

    const groq =
      new Groq({
        apiKey,
      });

    const completion =
      await groq.chat.completions.create({
        model: MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are WeatherGPT. Give concise, accurate weather assistance using only supplied weather data.",
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

    // --------------------------------------------------------
    // Parse AI JSON
    // --------------------------------------------------------

    let parsed: any;

    try {
      parsed =
        JSON.parse(content);
    } catch {
      parsed = {
        language:
          requestedLanguage,

        response:
          content,
      };
    }

    const responseText =
      typeof parsed.response ===
      "string"
        ? parsed.response
        : content;

    const responseLanguage =
      detectLanguage(
        typeof parsed.language ===
          "string"
          ? parsed.language
          : requestedLanguage
      );

    console.log(
      "WeatherGPT response generated."
    );

    return Response.json({
      response:
        responseText,

      language:
        responseLanguage,
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

// ------------------------------------------------------------
// GET health check
// ------------------------------------------------------------

export async function GET() {
  return Response.json({
    status: "ok",
    service: "WeatherGPT API",
    model: MODEL,
  });
}