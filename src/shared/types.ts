export enum ResponseStatus {
  SUCCESS,
  ERROR,
  STARTED,
}

export enum BackgroundTasks {
  EXTRACT_FEATURES,
  INITIALIZE_MODELS,
  AGENT_GENERATE_TEXT,
  AGENT_GET_MESSAGES,
  AGENT_CLEAR,
}

export enum BackgroundMessages {
  DOWNLOAD_PROGRESS,
  MESSAGES_UPDATE,
}

export type Dtype = "fp32" | "fp16" | "q4" | "q4f16";
