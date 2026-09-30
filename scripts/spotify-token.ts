/**
 * One-time Spotify login that prints a refresh token for .env.
 * Usage: SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… bun scripts/spotify-token.ts
 * Add http://127.0.0.1:8888/callback as a redirect URI in the Spotify app first.
 */

const id = process.env.SPOTIFY_CLIENT_ID;
const secret = process.env.SPOTIFY_CLIENT_SECRET;
if (!id || !secret)
  throw new Error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET");

const redirect = "http://127.0.0.1:8888/callback";
const auth = new URL("https://accounts.spotify.com/authorize");
auth.search = new URLSearchParams({
  client_id: id,
  response_type: "code",
  redirect_uri: redirect,
  scope: "user-read-currently-playing user-read-recently-played user-top-read",
}).toString();

console.log(
  `Open this, log in, then paste the URL you land on (it may not load):\n\n${auth}\n`,
);
const pasted = prompt("URL:") ?? "";
const code = new URL(pasted).searchParams.get("code");
if (!code) throw new Error("No code in that URL");

const res = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
  }),
});
const json = (await res.json()) as { refresh_token?: string };
if (!json.refresh_token) throw new Error(JSON.stringify(json));
console.log(`\nSPOTIFY_REFRESH_TOKEN=${json.refresh_token}`);
