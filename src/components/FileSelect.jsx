import { useContext, useState } from "react"
import { SearchContext } from "./SearchContext"


// a multi-select component with a select all option
export const FileSelect = () => {
    const { selectedFiles, setSelectedFiles, availableFiles } = useContext(SearchContext)


    const selectAll = () => {
        setSelectedFiles(availableFiles)
    }

    const selectNone = () => {
        setSelectedFiles([])
    }

    const selectFile = (filename) => {
        if(selectedFiles.includes(filename)){
            setSelectedFiles(selectedFiles.filter((file) => file !== filename))
        } else {
            setSelectedFiles([...selectedFiles, filename])
        }
    }

    // style with bootstrap
    return (
        <div className="d-flex flex-column justify-content-start" style={{
            width: "200px",
        }}>
            <button onClick={selectAll} className="btn btn-primary btn-sm">Select All</button>
            <div className="d-flex flex-column">
                {availableFiles.map((filename, index) => (
                    <div key={index} className="d-flex justify-content-between">
                        <p>{filename}</p>
                        <input type="checkbox" checked={selectedFiles.includes(filename)} onChange={() => selectFile(filename)} />
                    </div>
                ))}
            </div>
        </div>

    )

}




export const UploadTextModal = ({shown, setShown}) => {
    if(!shown) {
        return <button onClick={() => setShown(true)}
        className="btn btn-primary btn-sm"
        >+ Upload Text</button>
    }

    return (
        <div className="modal" style={{display: shown ? "block" : "none"}}>
            <div className="modal-content">
                <span className="close" onClick={() => setShown(false)}>&times;</span>
                <UploadText />
            </div>
        </div>
    )

}


const UploadText = () => {
    const { setTextUploaded, pipelineLoaded, dbClientRef, fileUploadStatus, fileUploadProgress, setFileUploadProgress, setFileUploadStatus  } = useContext(SearchContext)
    const [loading, setLoading] = useState(false)

    const handleUpload = async (event) => {
        event.preventDefault();
        setLoading(true);
    
        const file = event.target[0].files[0];
        const reader = new FileReader();
    
        reader.onload = async (event) => {
            const text = event.target.result;
            const filename = file.name;
            if(!dbClientRef.current) return;
            setFileUploadStatus(`Chunking ${filename}`);
            const chunkedText = dbClientRef.current.chunkText(text);
            setFileUploadStatus(`Embedding ${filename}`);
            await dbClientRef.current.embedText(chunkedText, filename, (progress) => {
                setFileUploadProgress(progress);
        });
    
            setTextUploaded(true);
            setLoading(false);
        };
    
        reader.readAsText(file);
    };

    if(!pipelineLoaded || loading) {
        return (
            <div>
                <h1>Loading...</h1>
                <h2>{fileUploadStatus}</h2>
                { fileUploadProgress > 0 && <p>{fileUploadProgress * 100}%</p>}
            </div>
        )
    }

    return (
        <div>
            <form onSubmit={handleUpload} className="form-control">
                <input type="file" />
                <button type="submit">Upload</button>
            </form>
        </div>
    )
}