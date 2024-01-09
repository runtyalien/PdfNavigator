// import { OpenAIApi, Configuration } from "openai-edge";

// const config = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const openai = new OpenAIApi(config);

// export async function getEmbeddings(text: string) {
//   try {
//     const response = await openai.createEmbedding({
//       model: "text-embedding-ada-002",
//       input: text.replace(/\n/g, " "),
//     });
//     const result = await response.json();
//     console.log(result);

//     return result.data[0].embedding as number[];
//   } catch (error) {
//     console.log("error calling openai embeddings api", error);
//     throw error;
//   }
// }

import { OpenAIApi, Configuration } from "openai-edge";
import { setTimeout } from "timers/promises";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

type QueueItem = {
  text: string;
  resolve: (value: number[]) => void;
  reject: (reason: any) => void;
};

let queue: QueueItem[] = [];
let isProcessingQueue = false;

export function getEmbeddings(text: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    queue.push({ text, resolve, reject });

    if (!isProcessingQueue) {
      isProcessingQueue = true;
      processQueue();
    }
  });
}

async function processQueue() {
  while (queue.length > 0) {
    for (let i = 0; i < Math.min(3, queue.length); i++) {
      const queueItem = queue.shift();
      if (queueItem !== undefined) {
        try {
          const response = await openai.createEmbedding({
            model: "text-embedding-ada-002",
            input: queueItem.text.replace(/\n/g, " "),
          });
          const result = await response.json();
          console.log(result);

          // Resolve the Promise associated with this text with the embeddings
          queueItem.resolve(result.data[0].embedding as number[]);
        } catch (error) {
          console.log("error calling openai embeddings api", error);

          // Reject the Promise associated with this text with the error
          queueItem.reject(error);
        }
      }
    }
    await setTimeout(60000); // Wait for 1 minute before processing the next batch
  }
  isProcessingQueue = false;
}
