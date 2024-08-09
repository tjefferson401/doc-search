import { calculateCosineSimilarity, chunkText } from "../components/utils";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = false;


export class DatabaseClient {
    static pipeline = null
    static loadStarted = false

    constructor(filesLoadedCallback, progressCallback=(e) => console.log(e)) {
        this.chunkedText = []
        this.dbname = "chunksData"
        this.dbnumber = 2
        this.tablename = "chunks"
        DatabaseClient.loadPipeline(progressCallback)

        // setup indexedDB with indexes on text, embedding, and position
        const request = window.indexedDB.open(this.dbname, this.dbnumber);

        request.onerror = (event) => {
            // Do something with request.errorCode!
            console.log("Error opening database", event);
        };

        request.onupgradeneeded = (event) => {
            // this is not logging
            const db = event.target.result;
            const objectStore = db.createObjectStore(this.tablename, { autoIncrement: true});
            objectStore.createIndex("text", "text", { unique: false });
            objectStore.createIndex("embedding", "embedding", { unique: false });
            objectStore.createIndex("position", "position", { unique: false });
            objectStore.createIndex("filename", "filename", { unique: false });

            this.getUniqueFiles(filesLoadedCallback);

        }

        request.onsuccess = (event) => {
            const db = event.target.result;

            //check if object stores exist
            const objectStoreNames = db.objectStoreNames;
            if (!objectStoreNames.contains(this.tablename)) {
                const objectStore = db.createObjectStore(this.tablename, { autoIncrement: true});
                objectStore.createIndex("text", "text", { unique: false });
                objectStore.createIndex("embedding", "embedding", { unique: false });
                objectStore.createIndex("position", "position", { unique: false });
                objectStore.createIndex("filename", "filename", { unique: false });
            }
            // Additional logic to check if object stores exist or not
            this.getUniqueFiles(filesLoadedCallback);
        };

        request.onblocked = (event) => {
            console.log("Upgrade blocked due to existing open connections");
        };




    }

    static async loadPipeline(progressCallback = (e) => console.log(e)) {
        if (!DatabaseClient.pipeline && !DatabaseClient.loadStarted) {
            DatabaseClient.loadStarted = true
            console.log("Loading pipeline...");
            DatabaseClient.pipeline = await pipeline('feature-extraction', 'Supabase/gte-small', {
                device: "webgpu",
                dtype: "fp16",
                progress_callback: progressCallback
            });
            console.log("Pipeline loaded");
            console.log(DatabaseClient.pipeline);
        }
        return DatabaseClient.pipeline;
    }


    chunkText(text) {
        return chunkText(text)
    }

    async embedText(chunkedText, filename, progressCallback) {
        // divide chunked text into five equal sized arrays
        const chunkedTextLength = chunkedText.length
        for (let i = 0; i < chunkedTextLength; i += 50) {
            const chunks = chunkedText.slice(i, i + 50)


            await this.embedChunks(chunks, i, filename)
            progressCallback(Math.floor((i / chunkedTextLength) * 100))
        }
    }


    getUniqueFiles = (filesLoadedCallback) => {
        const request = window.indexedDB.open(this.dbname, this.dbnumber);
        request.onsuccess = (event) => {
            const db = event.target.result;
            let uniqueFiles = []
            const objectStore = db.transaction(this.tablename).objectStore(this.tablename);
            const filenameIndex = objectStore.index("filename")

            filenameIndex.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const filename = cursor.value.filename
                    if (!uniqueFiles.includes(filename)) {
                        uniqueFiles.push(filename)
                    }
                    cursor.continue();
                } else {
                    filesLoadedCallback(uniqueFiles)
                }
            }
        }

        request.onerror =  (event) => {
            console.log("Error opening database", event);
            reject([])
        }
    }

    async embedChunks(chunks, startingIndex, filename) {
        if (!DatabaseClient.pipeline) {
            await DatabaseClient.loadPipeline()
        }
        const embeddings = await DatabaseClient.pipeline(chunks, { pooling: 'mean', normalize: true });
        this.storeEmbeddings(embeddings.tolist(), startingIndex, chunks, filename)
    }


    storeEmbeddings(embeddings, startingIndex, chunks, filename) {
        for (let i = 0; i < embeddings.length; i++) {
            const embedding = embeddings[i]
            const row = {
                text: chunks[i],
                embedding,
                position: startingIndex + i,
                filename
            }

            this.storeRow(row)
        }
    }

    storeRow(row) {
        // Store row in IndexedDB
        const request = window.indexedDB.open(this.dbname, this.dbnumber);
        request.onsuccess = (event) => { 
            const db = event.target.result;
            const transaction = db.transaction(this.tablename, "readwrite");
            const store = transaction.objectStore(this.tablename);
            const newRequest = store.add(row);
            newRequest.onerror = (event) => {
                console.log("Error adding row to database", event);
            };
        };
    
        request.onerror = (event) => {
            console.log("Error adding row to database", event);
        };
    }

    async search(searchQuery, callback, selectedFiles) {

        if(!DatabaseClient.pipeline || !searchQuery) return
        let searchEmbedding = await DatabaseClient.pipeline(searchQuery, { pooling: 'mean', normalize: true });
        searchEmbedding = searchEmbedding.tolist()
        console.log(searchEmbedding)
        const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

        const request = indexedDB.open(this.dbname, 2);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(this.tablename, "readwrite");
            const store = transaction.objectStore(this.tablename);
            const cursor = store.openCursor();
            const findings = [];
            cursor.onsuccess = (event) => {
                const cursor = event.target.result;
                if(cursor) {
                    const chunk = cursor.value;
                    if (!selectedFiles.includes(chunk.filename)) {
                        cursor.continue();
                        return;
                    }
                    const cosineSimilarity = calculateCosineSimilarity(searchEmbedding, chunk.embedding);
                    findings.push({chunk, cosineSimilarity});
                    cursor.continue();
                } else {
                    findings.sort((a, b) => b.cosineSimilarity.dataSync()[0] - a.cosineSimilarity.dataSync()[0]);
                    callback(findings.slice(0, 10));
                }
            }
        }
        request.onerror = (event) => {
            console.log("Error opening database", event);
            callback([])
        }

    }


    getTextAtPreviousPosition(filename, position) {
        // This returns a promise that resolves with the text or null if not found
        return new Promise((resolve, reject) => {
          // Open a connection to the database
          const request = indexedDB.open(this.dbname, this.dbnumber);
      
          request.onerror = (event) => {
            reject('Database error: ' + event.target.errorCode);
          };
      
          request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(this.tablename, 'readonly');
            const store = transaction.objectStore(this.tablename);
            const index = store.index('filename');
      
            // Get all records matching the filename
            const range = IDBKeyRange.only(filename);
            const cursorRequest = index.openCursor(range);
      
            cursorRequest.onerror = (event) => {
              reject('Cursor error: ' + event.target.errorCode);
            };
      
            cursorRequest.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                if (cursor.value.position === position - 1) {
                  resolve(cursor.value.text); // Found the text at the position - 1
                } else {
                  cursor.continue();
                }
              } else {
                // No more entries or not found
                resolve(null);
              }
            };
          };
        });
      }
      

      getTextAtNextPosition(filename, position) {
        // This returns a promise that resolves with the text or null if not found
        return new Promise((resolve, reject) => {
          // Open a connection to the database
          const request = indexedDB.open(this.dbname, this.dbnumber);
      
          request.onerror = (event) => {
            reject('Database error: ' + event.target.errorCode);
          };
      
          request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(this.tablename, 'readonly');
            const store = transaction.objectStore(this.tablename);
            const index = store.index('filename');
      
            // Get all records matching the filename
            const range = IDBKeyRange.only(filename);
            const cursorRequest = index.openCursor(range);
      
            cursorRequest.onerror = (event) => {
              reject('Cursor error: ' + event.target.errorCode);
            };
      
            cursorRequest.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                if (cursor.value.position === position + 1) {
                  resolve(cursor.value.text); // Found the text at the position + 1
                } else {
                  cursor.continue();
                }
              } else {
                // No more entries or not found
                resolve(null);
              }
            };
          };
        });
      }
}