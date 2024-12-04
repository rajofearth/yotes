import { useEffect } from "react"
import Home from "./pages/home"

function App() {
  useEffect(() => {
    // Check system preference and set dark mode
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <>
      <Home />
    </>
  )
}

export default App
