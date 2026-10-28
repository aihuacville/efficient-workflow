import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Exploration endpoint: ratings saved to a JSON file. Postgres replaces the file later; the
// URL and the JSON stay the same.
// Locally the file is apps/web/data/ratings.json. Vercel's disk is read-only except /tmp,
// which is wiped regularly, so ratings on the live site don't last.
const FILE = process.env.VERCEL
  ? "/tmp/ratings.json"
  : path.join(process.cwd(), "data", "ratings.json");

const MAX_COMMENT = 500;

type Rating = { id: string; stars: number; comment: string; createdAt: string };

async function load(): Promise<Rating[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Rating[];
  } catch {
    return []; // No file yet.
  }
}

async function save(ratings: Rating[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(ratings, null, 2));
}

/** GET /api/ratings: every saved rating, newest first. */
export async function GET() {
  const ratings = await load();
  return Response.json({ ratings: ratings.reverse() });
}

/** POST /api/ratings with { "stars": 1-5, "comment": "optional" }: saves one rating. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the rating as JSON" }, { status: 400 });
  }

  // Never trust what the browser sends: check every field.
  const { stars, comment = "" } = (body ?? {}) as { stars?: unknown; comment?: unknown };
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return Response.json({ error: "stars must be a whole number from 1 to 5" }, { status: 400 });
  }
  if (typeof comment !== "string") {
    return Response.json({ error: "comment must be text" }, { status: 400 });
  }
  if (comment.length > MAX_COMMENT) {
    return Response.json(
      { error: `comment must be ${MAX_COMMENT} characters or fewer` },
      { status: 400 },
    );
  }

  const rating: Rating = {
    id: `r_${randomUUID().slice(0, 8)}`,
    stars,
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
  };
  await save([...(await load()), rating]);

  return Response.json(
    { ...rating, message: `Thanks! Your ${stars}-star rating was saved.` },
    { status: 201 },
  );
}
