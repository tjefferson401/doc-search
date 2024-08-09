import { createContext, useEffect, useState, useRef } from "react";
import { calculateCosineSimilarity } from "./utils"
import { DatabaseClient } from "../middle/Client";


const defaultData = {
    chunkedText: "",
    setChunkedText: (newText) => { },
    currentTextPosition: 0,
    setCurrentTextPosition: (newPosition) => { },
    openTextPositions: [],
    setOpenTextPositions: (newPositions) => { },
    textUploaded: false,
    setTextUploaded: (uploaded) => { },
    pipelineLoaded: false,
    search: async (searchQuery) => { },
    topResults: [],
    dbClientRef: null,
    availableFiles: [],
    selectedFiles: [],
    setSelectedFiles: (files) => { },
    searching: false,
    pipelineProgress: 0,
    fileUploadStatus: "",
    fileUploadProgress: 0,
    setFileUploadStatus: (status) => { },
    setFileUploadProgress: (progress) => { }

}

export const SearchContext = createContext(defaultData);

export const SearchContextProvider = ({ children }) => {
    const [chunkedText, setChunkedText] = useState([]);
    const [currentTextPosition, setCurrentTextPosition] = useState(0);
    const [openTextPositions, setOpenTextPositions] = useState([]);
    const [textUploaded, setTextUploaded] = useState(false);
    const [topResults, setTopResults] = useState([]);
    const [availableFiles, setAvailableFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([])
    const [searching, setSearching] = useState(false)
    const dbClientRef = useRef(null);
    const [pipelineLoaded, setPipelineLoaded] = useState(false);
    const [pipelineProgress, setPipelineProgress] = useState(0);
    const [fileUploadStatus, setFileUploadStatus] = useState("");
    const [fileUploadProgress, setFileUploadProgress] = useState(0);




    useEffect(() => {
        dbClientRef.current = new DatabaseClient(
            (files) => {
                setAvailableFiles(files)
                setSelectedFiles(files)
            },
            (e) => {
                if (e.status === "done") {
                    setPipelineLoaded(true)
                } else {
                    setPipelineProgress(e.progress)
                }
            }

        );
    }, [])



    const search = async (searchQuery) => {
        setSearching(true)
        const callback = (result) => {
            setTopResults(result)
            setSearching(false)
        }

        if (!dbClientRef.current) return;
        dbClientRef.current.search(searchQuery, callback, selectedFiles)

    }

    return (
        <SearchContext.Provider value={{ chunkedText, setChunkedText, currentTextPosition, setCurrentTextPosition, openTextPositions, setOpenTextPositions, textUploaded, setTextUploaded, pipelineLoaded, search, topResults, dbClientRef, availableFiles, setSelectedFiles, selectedFiles, searching, pipelineProgress, fileUploadProgress, fileUploadStatus, setFileUploadStatus, setFileUploadProgress }}>
            {children}
        </SearchContext.Provider>
    )
}