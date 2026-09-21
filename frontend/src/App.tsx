import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CategoryPage } from './pages/CategoryPage'
import { Home } from './pages/Home'

// A second page (per docs/ARCHITECTURE.md's five routes) now exists, so the
// router that was deliberately deferred until then goes in here.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/c/:slug" element={<CategoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}
