import { SearchContextProvider } from "./components/SearchContext"
import { SearchAndSee } from "./components/ResultViewer"

function App() {
  return (
    <SearchContextProvider>
      <SearchAndSee/>
    </SearchContextProvider>
  )
}

export default App
