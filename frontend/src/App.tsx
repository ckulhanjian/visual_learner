import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CategoriesPage } from './pages/CategoriesPage'
import { CategoryPage } from './pages/CategoryPage'
import { Home } from './pages/Home'
import { InspoPage } from './pages/InspoPage'
import { SubmitPage } from './pages/SubmitPage'
import { VisualPage } from './pages/VisualPage'

// A second page (per docs/ARCHITECTURE.md's five routes) now exists, so the
// router that was deliberately deferred until then goes in here.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/c/:slug" element={<CategoryPage />} />
        <Route path="/v/:slug" element={<VisualPage />} />
        <Route path="/inspo" element={<InspoPage />} />
        <Route path="/submit" element={<SubmitPage />} />
      </Routes>
    </BrowserRouter>
  )
}
