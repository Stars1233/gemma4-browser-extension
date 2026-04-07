import { ToolCallPayload } from "./types.ts";

const parseGemmaArguments = (rawArguments: string): Record<string, any> => {
  const normalized = rawArguments
    .replace(/<\|\"\|>/g, '"')
    .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":');

  try {
    return JSON.parse(normalized);
  } catch {
    return {};
  }
};

export const extractToolCalls = (
  text: string
): { toolCalls: ToolCallPayload[]; message: string } => {
  const cleanedText = text.replace(/<\|end_of_text\|>/g, "");
  const jsonMatches = Array.from(
    cleanedText.matchAll(/<tool_call>([\s\S]*?)<\/tool_call>/g)
  );
  const gemmaMatches = Array.from(
    cleanedText.matchAll(/<\|tool_call\>([\s\S]*?)<tool_call\|>/g)
  );
  const toolCalls: ToolCallPayload[] = [];

  for (const match of jsonMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed.name === "string") {
        toolCalls.push({
          name: parsed.name,
          arguments: parsed.arguments ?? {},
          id: JSON.stringify({
            name: parsed.name,
            arguments: parsed.arguments ?? {},
          }),
        });
      }
    } catch {
      // ignore malformed tool call payloads
    }
  }

  for (const match of gemmaMatches) {
    const payload = match[1].trim();
    const nameMatch = payload.match(/^call:([^\{]+)\{/);
    const argsMatch = payload.match(/^call:[^\{]+(\{[\s\S]*\})$/);

    if (!nameMatch) {
      continue;
    }

    const name = nameMatch[1].trim();
    const args = argsMatch ? parseGemmaArguments(argsMatch[1]) : {};

    toolCalls.push({
      name,
      arguments: args,
      id: JSON.stringify({
        name,
        arguments: args,
      }),
    });
  }

  // Remove both complete and incomplete tool calls
  // Complete: <tool_call>...</tool_call>
  // Incomplete: <tool_call>... (no closing tag yet)
  const message = text
    .replace(/<\|end_of_text\|>/g, "")
    .replace(/<\|tool_response\>[\s\S]*?(?:<tool_response\|>|$)/g, "")
    .replace(/<tool_response>[\s\S]*?(?:<\/tool_response>|$)/g, "")
    .replace(/<\|tool_call\>[\s\S]*?(?:<tool_call\|>|$)/g, "")
    .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/g, "")
    .trim();

  return { toolCalls, message };
};
