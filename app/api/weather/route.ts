import { getWeather } from "@/lib/weather/weather";

export async function GET() {
  return Response.json(await getWeather());
}
