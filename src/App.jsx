/*
  App.jsx — root component.

  Sets up React Router and wraps everything in <PostsProvider> so any
  page can read/write posts via usePostsContext().

  To add a new page:
    1. Create src/pages/YourPage.jsx
    2. Add <Route path="/your-path" element={<YourPage />} /> below
    3. Add a <DrawerLink> in src/components/Nav.jsx
    That's it — nothing else needs to change.
*/

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PostsProvider } from './context/PostsContext'
import Nav      from './components/Nav'
import Landing  from './pages/Landing'
import BlogList from './pages/BlogList'
import BlogPost from './pages/BlogPost'

export default function App() {
  return (
    <PostsProvider>
      <BrowserRouter>
        {/* Nav is outside <Routes> so it persists across every page */}
        <Nav />
        <Routes>
          <Route path="/"             element={<Landing />}  />
          <Route path="/writings"     element={<BlogList />} />
          <Route path="/writings/:id" element={<BlogPost />} />

          {/*
            Future pages go here, e.g.:
            <Route path="/gallery" element={<Gallery />} />
          */}
        </Routes>
      </BrowserRouter>
    </PostsProvider>
  )
}
