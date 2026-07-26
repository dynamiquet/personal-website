/*
  App.jsx — root component.

  Sets up React Router and wraps everything in <PostsProvider> so any
  page can read/write posts via usePostsContext().
  Auth comes from AuthProvider in main.jsx + useAuth() in pages.
*/

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PostsProvider } from './context/PostsContext'
import { DiscussionProvider } from './context/DiscussionContext'
import Nav      from './components/Nav'
import Landing  from './pages/Landing'
import BlogList from './pages/BlogList'
import BlogPost from './pages/BlogPost'
import Login    from './pages/Login'
import SignUp   from './pages/SignUp'

export default function App() {
  return (
    <PostsProvider>
      <DiscussionProvider>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route path="/"             element={<Landing />}  />
            <Route path="/writings"     element={<BlogList />} />
            <Route path="/writings/:id" element={<BlogPost />} />
            <Route path="/login"        element={<Login />}    />
            <Route path="/signup"       element={<SignUp />}   />
          </Routes>
        </BrowserRouter>
      </DiscussionProvider>
    </PostsProvider>
  )
}
