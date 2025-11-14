import { WebMCPTool } from "../agent/webMcp.tsx";

export const searchBookmarksTool: WebMCPTool = {
  name: "search_bookmarks",
  description:
    "Search through bookmarks by keyword. Returns matching bookmarks with title, URL, and folder path.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to find in bookmark titles and URLs",
      },
    },
    required: ["query"],
  },
  execute: async (args) => {
    const query = args.query as string;

    try {
      const bookmarkTreeNodes = await chrome.bookmarks.search(query);

      if (bookmarkTreeNodes.length === 0) {
        return `No bookmarks found for query: "${query}"`;
      }

      const getFolderPath = async (nodeId: string): Promise<string[]> => {
        const path: string[] = [];
        let currentId = nodeId;

        while (currentId) {
          try {
            const nodes = await chrome.bookmarks.get(currentId);
            const node = nodes[0];

            if (node.title && node.parentId) {
              path.unshift(node.title);
            }

            if (!node.parentId) break;
            currentId = node.parentId;
          } catch {
            break;
          }
        }

        return path;
      };

      const bookmarkResults = await Promise.all(
        bookmarkTreeNodes
          .filter((node) => node.url) // Only bookmarks, not folders
          .map(async (node) => {
            const folderPath = node.parentId
              ? await getFolderPath(node.parentId)
              : [];

            return {
              title: node.title,
              url: node.url,
              folderPath: folderPath.join(" > ") || "Root",
              dateAdded: node.dateAdded
                ? new Date(node.dateAdded).toISOString()
                : null,
            };
          })
      );

      return JSON.stringify(bookmarkResults, null, 2);
    } catch (error) {
      return `Error searching bookmarks: ${error.toString()}`;
    }
  },
};
