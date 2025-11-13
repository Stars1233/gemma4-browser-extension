import {
  AutoModelForCausalLM,
  AutoTokenizer,
  Message,
  PreTrainedModel,
  PreTrainedTokenizer,
  TextStreamer,
} from "@huggingface/transformers";

import { MODELS } from "../../shared/constants.ts";
import { calculateDownloadProgress } from "../utils/calculateDownloadProgress.ts";

interface Pipeline {
  tokenizer: PreTrainedTokenizer;
  model: PreTrainedModel;
}

class Agent {
  private pastKeyValues: any = null;
  private pipeline: Pipeline = null;
  private _messages: Array<Message> = [
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
  ];
  private messagesListener: Array<(messages: Array<Message>) => void> = [];

  constructor() {}

  get messages() {
    return this._messages;
  }

  set messages(messages: Array<Message>) {
    this._messages = messages;
    console.log(messages);
    this.messagesListener.forEach((listener) => listener(messages));
  }

  public onMessageUpdate(callback: (messages: Array<Message>) => void) {
    this.messagesListener.push(callback);
  }

  public getTextGenerationPipeline = async (
    onDownloadProgress: (id: string, percentage: number) => void = () => {}
  ): Promise<Pipeline> => {
    if (this.pipeline) return this.pipeline;

    try {
      const m = MODELS.granite3B;

      const tokenizer = await AutoTokenizer.from_pretrained(m.modelId, {
        progress_callback: calculateDownloadProgress(({ percentage }) =>
          onDownloadProgress(m.modelId, percentage)
        ),
      });

      const model = await AutoModelForCausalLM.from_pretrained(m.modelId, {
        dtype: m.dtype,
        device: "webgpu",
        progress_callback: calculateDownloadProgress(({ percentage }) =>
          onDownloadProgress(m.modelId, percentage)
        ),
      });
      this.pipeline = { tokenizer, model };
      return this.pipeline;
    } catch (error) {
      console.error("Failed to initialize feature extraction pipeline:", error);
      throw error;
    }
  };

  public generateText = async (prompt: string): Promise<string> => {
    this.messages = [...this.messages, { role: "user", content: prompt }];
    const { tokenizer, model } = await this.getTextGenerationPipeline();

    const input = tokenizer.apply_chat_template(this.messages, {
      //tools,
      add_generation_prompt: true,
      return_dict: true,
    });

    let response = "";

    this.messages.push({ role: "assistant", content: "" });

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: false,
      callback_function: (token: string) => {
        response = response + token;
        this.messages = this.messages.map((message, index, all) => ({
          ...message,
          content: index === all.length - 1 ? response : message.content,
        }));
      },
    });

    // Generate the response
    const output: any = await model.generate({
      ...input,
      past_key_values: this.pastKeyValues,
      max_new_tokens: 512,
      do_sample: false,
      streamer,
      return_dict_in_generate: true,
    });
    const { sequences, past_key_values } = output;
    this.pastKeyValues = past_key_values;

    const inputIds = (input as any).input_ids;
    response = tokenizer
      .batch_decode(sequences.slice(null, [inputIds.dims[1], null]), {
        skip_special_tokens: false,
      })[0]
      .replace(/<\|end_of_text\|>$/, "");

    this.messages = this.messages.map((message, index, all) => ({
      ...message,
      content: index === all.length - 1 ? response : message.content,
    }));
    return response;
  };
}

export default Agent;
