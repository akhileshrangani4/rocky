type BrowseInput = {
  url: string;
  instruction: string;
};

export async function browsePage(input: BrowseInput) {
  // Use a simple fetch + HTML-to-text approach
  // For full agent-browser integration, this can be upgraded to use
  // Vercel's agent-browser CLI or Playwright
  try {
    const res = await fetch(input.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RockyBot/1.0; +https://rocky.dev)",
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const html = await res.text();

    // Basic HTML to text extraction
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    return {
      success: true,
      url: input.url,
      content: text,
      instruction: input.instruction,
      note: "Content extracted. Use this to answer the user's question about the page.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to browse page",
    };
  }
}
