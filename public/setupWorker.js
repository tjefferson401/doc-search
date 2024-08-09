// Worker.js


import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

const task = "feature-extraction";
const model = "Supabase/gte-small";
let embed;
const loadPipeline = async () => {
    if (!embed) {
        embed = await pipeline(task, model);
    }
}


onmessage = async (event) => {
    const { chunkedText, startingIndex } = event.data;
    console.log("loading pipeline")

    await loadPipeline();
    console.log("embedding")
    for(let i = 0; i < chunkedText.length; i+= 50) {
        const chunks = chunkedText.slice(i, i + 50);
        const embeddings = await embed(chunks, { pooling: 'mean', normalize: true });
        postMessage({ embeddings, startingIndex: startingIndex + i });
    }
  };


