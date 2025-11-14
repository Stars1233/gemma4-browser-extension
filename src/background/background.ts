import {
  BackgroundMessages,
  BackgroundTasks,
  ResponseStatus,
} from "../shared/types.ts";
import Agent from "./agent/Agent.ts";
/*import { searchBookmarksTool } from "./tools/bookmarks.ts";
import { searchHistoryTool } from "./tools/history.ts";*/
import { googleSearchTool } from "./tools/search.ts";
import {
  closeTabTool,
  createTabTool,
  getOpenTabsTool,
  goToTabTool,
} from "./tools/tabActions.ts";
import FeatureExtractor from "./utils/FeatureExtractor.ts";

const onModelDownloadProgress = (modelId: string, percentage: number) =>
  chrome.runtime.sendMessage({
    type: BackgroundMessages.DOWNLOAD_PROGRESS,
    modelId,
    percentage,
  });

const agent = new Agent();
const featureExtractor = new FeatureExtractor();

// Register tab management tools
agent.setTool(getOpenTabsTool);
agent.setTool(goToTabTool);
agent.setTool(createTabTool);
agent.setTool(closeTabTool);

// Register search tools
agent.setTool(googleSearchTool);

// Register browser data tools
// removed it for now. they dont work well
// agent.setTool(searchHistoryTool);
// agent.setTool(searchBookmarksTool);

agent.onChatMessageUpdate((messages) =>
  chrome.runtime.sendMessage({
    type: BackgroundMessages.MESSAGES_UPDATE,
    messages,
  })
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === BackgroundTasks.INITIALIZE_MODELS) {
    Promise.all([
      featureExtractor.getFeatureExtractionPipeline(onModelDownloadProgress),
      agent.getTextGenerationPipeline(onModelDownloadProgress),
    ])
      .then(() => {
        sendResponse({ status: ResponseStatus.SUCCESS });
      })
      .catch((error) => {
        console.error("INITIALIZE_MODELS failed:", error);
        sendResponse({ status: ResponseStatus.ERROR, error: error.message });
      });

    return true;
  }

  if (message.type === BackgroundTasks.AGENT_GENERATE_TEXT) {
    agent
      .runAgent(message.prompt)
      .then(() => {
        sendResponse({ status: ResponseStatus.SUCCESS });
      })
      .catch((error) => {
        console.error("GENERATE_TEXT failed:", error);
        sendResponse({ status: ResponseStatus.ERROR, error: error.message });
      });

    return true;
  }

  if (message.type === BackgroundTasks.AGENT_GET_MESSAGES) {
    sendResponse({
      status: ResponseStatus.SUCCESS,
      messages: agent.chatMessages,
    });
    return true;
  }

  if (message.type === BackgroundTasks.AGENT_CLEAR) {
    agent.clear();
    sendResponse({ status: ResponseStatus.SUCCESS });
    return true;
  }

  if (message.type === BackgroundTasks.EXTRACT_FEATURES) {
    featureExtractor
      .extractFeatures([message.text])
      .then((result) => {
        sendResponse({ status: ResponseStatus.SUCCESS, result: result[0] });
      })
      .catch((error) => {
        console.error("EXTRACT_FEATURES failed:", error);
        sendResponse({ status: ResponseStatus.ERROR, error: error.message });
      });

    return true;
  }

  return false;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
