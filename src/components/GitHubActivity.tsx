import { useEffect, useState } from "react";

const GITHUB_USERNAME = "chasingtherain";

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const LEVEL_COLORS: Record<number, string> = {
  0: "#161b22",
  1: "#0e4429",
  2: "#006d32",
  3: "#26a641",
  4: "#39d353",
};

function buildGrid(
  contributions: ContributionDay[]
): (ContributionDay | null)[][] {
  const grid: (ContributionDay | null)[][] = Array.from({ length: 7 }, () => []);
  if (contributions.length === 0) return grid;

  const firstDate = new Date(contributions[0].date + "T00:00:00");
  const startDayOfWeek = firstDate.getDay();

  for (let i = 0; i < startDayOfWeek; i++) {
    grid[i].push(null);
  }

  for (const day of contributions) {
    const date = new Date(day.date + "T00:00:00");
    grid[date.getDay()].push(day);
  }

  return grid;
}

function formatLastPushed(isoDate: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  const formatted = date.toLocaleDateString("en-US", options);
  const parts = formatted.split(", ");
  return `${parts[0]}, ${parts.slice(1).join(", ")}`;
}

export default function GitHubActivity() {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [totalContributions, setTotalContributions] = useState(0);
  const [lastPushed, setLastPushed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contribRes, eventsRes] = await Promise.allSettled([
          fetch(
            `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`
          ),
          fetch(
            `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=10`
          ),
        ]);

        if (contribRes.status === "fulfilled" && contribRes.value.ok) {
          const data = await contribRes.value.json();
          setContributions(data.contributions);
          setTotalContributions(data.total?.lastYear ?? 0);
        } else {
          setError(true);
        }

        if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
          const events = await eventsRes.value.json();
          const pushEvent = events.find(
            (e: { type: string }) => e.type === "PushEvent"
          );
          if (pushEvent) {
            setLastPushed(formatLastPushed(pushEvent.created_at));
          }
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const grid = buildGrid(contributions.slice(-120));

  if (!loading && error && contributions.length === 0) {
    return null;
  }

  return (
    <a
      href={`https://github.com/${GITHUB_USERNAME}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-gray-700 bg-[#0d1117] p-4 transition-colors hover:border-gray-500"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-1.5 text-gray-300 text-sm font-medium">
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            fill="currentColor"
          >
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
          </svg>
          <span>Github activity</span>
        </div>
        {!loading && (
          <span className="text-gray-400 text-sm font-medium">
            {totalContributions.toLocaleString()} contributions in the last year
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-[118px] flex items-center justify-center">
          <span className="text-gray-500 text-sm">
            Loading contributions...
          </span>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateRows: "repeat(7, 1fr)",
              gridAutoFlow: "column",
              gridAutoColumns: "1fr",
              gap: "3px",
            }}
          >
            {Array.from(
              { length: Math.max(...grid.map((r) => r.length), 0) },
              (_, colIdx) =>
                grid.map((row, rowIdx) => {
                  const day = row[colIdx] ?? null;
                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      title={
                        day
                          ? `${day.count} contributions on ${day.date}`
                          : undefined
                      }
                      style={{
                        aspectRatio: "1",
                        borderRadius: "2px",
                        backgroundColor: day
                          ? LEVEL_COLORS[day.level]
                          : "transparent",
                      }}
                    />
                  );
                })
            )}
          </div>
        </div>
      )}

      {lastPushed && (
        <p className="mt-4 text-gray-500 text-sm">
          Last pushed on {lastPushed}
        </p>
      )}
    </a>
  );
}
