import { NextRequest, NextResponse } from "next/server";

const WEATHER_CODES: Record<number, string> = {
  0: "Cerah",
  1: "Cerah berawan",
  2: "Berawan sebagian",
  3: "Mendung",
  45: "Berkabut",
  48: "Kabut tebal",
  51: "Gerimis ringan",
  53: "Gerimis sedang",
  55: "Gerimis lebat",
  56: "Gerimis beku ringan",
  57: "Gerimis beku lebat",
  61: "Hujan ringan",
  63: "Hujan sedang",
  65: "Hujan lebat",
  66: "Hujan beku ringan",
  67: "Hujan beku lebat",
  71: "Salju ringan",
  73: "Salju sedang",
  75: "Salju lebat",
  77: "Butiran salju",
  80: "Hujan singkat ringan",
  81: "Hujan singkat sedang",
  82: "Hujan singkat lebat",
  85: "Hujan salju ringan",
  86: "Hujan salju lebat",
  95: "Badai petir",
  96: "Badai petir dengan hujan es ringan",
  99: "Badai petir dengan hujan es lebat",
};

export async function GET(request: NextRequest) {
  try {
    const city = request.nextUrl.searchParams.get("city")?.trim();

    if (!city || city.length > 100) {
      return NextResponse.json(
        { error: "Masukkan nama kota yang valid." },
        { status: 400 }
      );
    }

    // Cari koordinat kota.
    const geocodingUrl = new URL(
      "https://geocoding-api.open-meteo.com/v1/search"
    );

    geocodingUrl.searchParams.set("name", city);
    geocodingUrl.searchParams.set("count", "1");
    geocodingUrl.searchParams.set("language", "id");
    geocodingUrl.searchParams.set("format", "json");

    const geoResponse = await fetch(geocodingUrl.toString(), {
      cache: "no-store",
    });

    if (!geoResponse.ok) {
      return NextResponse.json(
        { error: "Layanan pencarian kota sedang bermasalah." },
        { status: 502 }
      );
    }

    const geoData = await geoResponse.json();
    const place = geoData.results?.[0];

    if (!place) {
      return NextResponse.json(
        {
          error: `Kota "${city}" tidak ditemukan. Coba nama kota lain.`,
        },
        { status: 404 }
      );
    }

    // Ambil cuaca berdasarkan koordinat kota.
    const weatherUrl = new URL(
      "https://api.open-meteo.com/v1/forecast"
    );

    weatherUrl.searchParams.set(
      "latitude",
      String(place.latitude)
    );
    weatherUrl.searchParams.set(
      "longitude",
      String(place.longitude)
    );

    weatherUrl.searchParams.set(
      "current",
      [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "rain",
        "weather_code",
        "is_day",
        "wind_speed_10m",
      ].join(",")
    );

    weatherUrl.searchParams.set(
      "hourly",
      "precipitation_probability"
    );
    weatherUrl.searchParams.set("timezone", "auto");
    weatherUrl.searchParams.set("forecast_days", "1");

    const weatherResponse = await fetch(weatherUrl.toString(), {
      cache: "no-store",
    });

    if (!weatherResponse.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil data cuaca dari Open-Meteo." },
        { status: 502 }
      );
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;

    if (!current) {
      return NextResponse.json(
        { error: "Data cuaca saat ini tidak tersedia." },
        { status: 502 }
      );
    }

    // Cari peluang hujan untuk jam lokal saat ini.
    const currentHour = String(current.time).slice(0, 13);

    const hourlyIndex = weatherData.hourly?.time?.findIndex(
      (time: string) => time.slice(0, 13) === currentHour
    );

    const rainProbability =
      hourlyIndex !== undefined &&
      hourlyIndex >= 0 &&
      weatherData.hourly?.precipitation_probability?.[
        hourlyIndex
      ] != null
        ? weatherData.hourly.precipitation_probability[hourlyIndex]
        : null;

    const weatherCode = Number(current.weather_code);

    return NextResponse.json({
      location: {
        name: place.name,
        region: place.admin1 ?? "",
        country: place.country ?? "",
      },

      current: {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        rain: current.rain,
        windSpeed: current.wind_speed_10m,
        weatherCode,
        description:
          WEATHER_CODES[weatherCode] ?? "Kondisi tidak diketahui",
        isDay: current.is_day === 1,
        rainProbability,
      },

      source: "Open-Meteo",
    });
  } catch (error) {
    console.error("Weather API error:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat mengambil data cuaca.",
      },
      { status: 500 }
    );
  }
}