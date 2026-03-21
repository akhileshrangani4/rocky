type SearchRepoInput = {
  repo: string;
  query: string;
  type: "code" | "files" | "readme";
};

type CreatePRInput = {
  repo: string;
  branch: string;
  title: string;
  body: string;
  baseBranch: string;
};

export async function searchRepo(input: SearchRepoInput) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { success: false, error: "GitHub not configured. Set GITHUB_TOKEN." };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  if (input.type === "readme") {
    const res = await fetch(
      `https://api.github.com/repos/${input.repo}/readme`,
      { headers },
    );
    if (!res.ok) return { success: false, error: "Could not fetch README" };
    const data = await res.json();
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return { success: true, content: content.slice(0, 5000) };
  }

  if (input.type === "files") {
    const res = await fetch(
      `https://api.github.com/repos/${input.repo}/git/trees/HEAD?recursive=1`,
      { headers },
    );
    if (!res.ok) return { success: false, error: "Could not fetch file tree" };
    const data = await res.json();
    const files = data.tree
      ?.filter((f: { type: string; path: string }) =>
        f.type === "blob" && f.path.includes(input.query),
      )
      .map((f: { path: string }) => f.path)
      .slice(0, 50);
    return { success: true, files };
  }

  // Code search
  const res = await fetch(
    `https://api.github.com/search/code?q=${encodeURIComponent(input.query)}+repo:${input.repo}`,
    { headers },
  );
  if (!res.ok) return { success: false, error: "Code search failed" };
  const data = await res.json();
  const results = data.items?.slice(0, 10).map((item: { path: string; html_url: string }) => ({
    path: item.path,
    url: item.html_url,
  }));
  return { success: true, results };
}

export async function createPullRequest(input: CreatePRInput) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { success: false, error: "GitHub not configured. Set GITHUB_TOKEN." };
  }

  const res = await fetch(
    `https://api.github.com/repos/${input.repo}/pulls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        head: input.branch,
        base: input.baseBranch,
      }),
    },
  );

  if (!res.ok) {
    const error = await res.text();
    return { success: false, error: `PR creation failed: ${error}` };
  }

  const pr = await res.json();
  return {
    success: true,
    prNumber: pr.number,
    url: pr.html_url,
    summary: `Opened PR #${pr.number}: ${pr.title}`,
  };
}
