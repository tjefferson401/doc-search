import * as tf from '@tensorflow/tfjs';



// Chunk into 50 word sections
// export const chunkText = (text) => {
//     const words = text.split(" ");
//     const chunkedText = [];
//     for (let i = 0; i < words.length; i += 50) {
//         chunkedText.push(words.slice(i, i + 50).join(" "));
//     }
//     return chunkedText;
// }

// export function chunkText(text, chunkSize = 100) {
//     // Normalize white space
//     const normalizedText = text.replaceAll(/\s+/g, ' ').trim();

//     // Split the text into words
//     const words = normalizedText.split(' ');

//     // Prepare the chunks array
//     const chunks = [];

//     // Loop through words and build chunks
//     for (let i = 0; i < words.length; i += chunkSize) {
//         // Slice the words array to get a chunk of the specified size
//         const chunk = words.slice(i, i + chunkSize).join(' ');
//         chunks.push(chunk);
//     }

//     console.log(chunks.length)
//     return chunks;
// }

// Put into chunks of approximately 3 sentences and no more than 100 words
// also maintain white space
export const chunkText = (text, maxTokens=150) =>  {
    // Function to split text into sentences
    const splitIntoSentences = text => text.match(/[^\.!\?]+[\.!\?]+/g) || [];

    // Function to count tokens in a sentence
    const countTokens = sentence => sentence.split(/\s+/).length;

    // Split the text into sentences
    const sentences = splitIntoSentences(text);

    const chunks = [];
    let currentChunk = [];
    let currentTokenCount = 0;

    sentences.forEach(sentence => {
        const tokenCount = countTokens(sentence);
        // Check if adding this sentence would exceed the max token limit
        if (currentTokenCount + tokenCount > maxTokens) {
            // If so, push the current chunk to chunks and start a new one
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
            currentTokenCount = 0;
        }
        // Add the sentence to the current chunk
        currentChunk.push(sentence);
        currentTokenCount += tokenCount;
    });

    // Don't forget to add the last chunk if it exists
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    return chunks;
}


export const calculateCosineSimilarity = (a, b) => {
    const dotProduct = tf.dot(a, b);
    const aNorm = tf.norm(a);
    const bNorm = tf.norm(b);
    const cosineSimilarity = dotProduct.div(aNorm.mul(bNorm));
    return cosineSimilarity;
}

// export const chunkText = (text) => {
//     const chunkSize = 50;
//     const regex = new RegExp(`(?:\\S+\\s*){1,${chunkSize}}`, 'g');
//     const chunkedText = [];
//     let match;

//     while ((match = regex.exec(text)) !== null) {
//         chunkedText.push(match[0].trim());
//     }

//     return chunkedText;
// };
