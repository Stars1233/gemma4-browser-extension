import { WebMCPTool } from "../agent/webMcp.tsx";

export const searchHistoryTool: WebMCPTool = {
  name: "search_history",
  description:
    "Search through browsing history by keyword. Returns matching pages with title, URL, and last visit time.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to find in page titles and URLs",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return (default: 20)",
        default: 20,
      },
    },
    required: ["query"],
  },
  execute: async (args) => {
    const query = args.query as string;
    const maxResults =
      args.maxResults !== undefined ? (args.maxResults as number) : 20;

    if (!query || typeof query !== "string") {
      return `Error: query parameter must be a non-empty string. Received: ${JSON.stringify(args)}`;
    }

    try {
      const historyItems = await chrome.history.search({
        text: query,
        maxResults: maxResults,
        startTime: 0,
      });

      if (historyItems.length === 0) {
        return `No history entries found for query: "${query}"`;
      }

      const results = historyItems.map((item) => ({
        title: item.title || "Untitled",
        url: item.url,
        lastVisit: item.lastVisitTime
          ? new Date(item.lastVisitTime).toISOString()
          : null,
        visitCount: item.visitCount || 0,
      }));

      return JSON.stringify(results, null, 2);
    } catch (error) {
      return `Error searching history: ${error.toString()}`;
    }
  },
};
