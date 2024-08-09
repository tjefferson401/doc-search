import { useContext, useEffect, useState } from "react";
import { SearchContext } from "./SearchContext";
import { FileSelect, UploadTextModal } from "./FileSelect";
import styled from "styled-components";


export const SearchAndSee = () => {
    const [searchQuery, setSearchQuery] = useState("")
    const { search, topResults, searching, pipelineLoaded, pipelineProgress } = useContext(SearchContext)
    const [show, setShow] = useState(false)


    if(!pipelineLoaded) {
        return (
            <div className="w-100 h-100 d-flex justify-content-center align-items-center">
                <p>Loading pipeline {pipelineProgress}%</p>
            </div>
        )
    }


    return (
        <>
            <div className="d-flex w-100 justify-content-between">
                <UploadTextModal  shown={show} setShown={setShow} />
                <div className="d-flex p-3">
                    <input className="form-control m-1" type="text" onChange={(e) => setSearchQuery(e.target.value)} />
                    <button className="btn btn-primary m-1" onClick={() => search(searchQuery)} disabled={searching}>Search</button>
                </div>
                <FileSelect />
            </div>
           {searching ? <div className="w-100 h-100 d-flex justify-content-center align-items-center">
                <p>Searching...</p>
            </div> : <div>
                <Results topResults={topResults} />
            </div>}
        </>
    )

}


const Results = ({ topResults }) => {
    const [selectedChunk, setSelectedChunk] = useState({
        filename: undefined,
        position: undefined,
        text: undefined,
        embedding: undefined
    })
    const [show, setShow] = useState(false)

    return  (
        <div className="d-flex flex-column justify-content-center align-items-center h-100">
            {topResults.map((result, index) => (
                <SearchResult key={index} result={result} setSelectedChunk={setSelectedChunk} setShow={setShow} />
            ))}
            <ContentReviewModal show={show} setShow={setShow} startingChunk={selectedChunk} />
        </div>
    )
}


const SearchResult = ({ result, setSelectedChunk, setShow}) => {
    const cosineSimilarity = result.cosineSimilarity.dataSync()[0]
    const handleClick = () => {
        setSelectedChunk(result.chunk)
        setShow(true)
    }


    return (
        <ResultButton onClick={handleClick}>
            <pre className="text-wrap text-align-left">{result.chunk.text}</pre>
            <p className="badge badge-info">{result.chunk.filename}</p>
        </ResultButton>
    )
}


const ContentReviewModal = ({ show, setShow, startingChunk = {
    filename: undefined,
    position: undefined,
    text: undefined,
    embedding: undefined
}}) => {
    const {filename, position, text} = startingChunk




    return (
        <div className="modal h-100" style={{display: show ? "block" : "none"}}>
            <div className="modal-content p-3 bg-light h-100 d-flex justify-content-center align-items-center">
                <span className="close " onClick={() => setShow(false)}>&times;</span>
                <ContentReview filename={filename} position={position} text={text}/>
            </div>
        </div>
    )

}


const ContentReview = ({ filename, position, text }) => {
    const  { dbClientRef } = useContext(SearchContext)
    const [textList, setTextList] = useState([
        text
    ])

    const getPreviousText = async () => {
        if(!dbClientRef.current) return;
        dbClientRef.current.getTextAtPreviousPosition(filename, position).then((text) => {
            console.log(text)
            setTextList((prev) => [text, ...prev])
        });
    }

    const getNextText = async () => {
        if(!dbClientRef.current) return;
        dbClientRef.current.getTextAtNextPosition(filename, position).then((text) => {
            setTextList((prev) => [...prev, text])
        });
    }

    useEffect(() => {
        setTextList((prev) => [ text])
    }, [text])


    if(!filename || !position || !text) {
        return <div>
            No Content Available
        </div>
    }


    return (
        <div>
            <button onClick={getPreviousText}>Previous context</button>
            {
                textList.map((text, index) => (
                    console.log(text),
                    <pre key={index}>{text} </pre>
                ))
            }
            <button onClick={getNextText}>Next Context</button>
        </div>
    )
}



// add onHover
const ResultButton = styled.button`
    border: 1px solid black;
    border-radius: 5px;
    margin: 5px;
    padding: 5px;
    display: flex;
    flex-direction: column;
    transition: 0.5s;
    background-color: white;
    &:hover {
     padding: 10px;
    }
`