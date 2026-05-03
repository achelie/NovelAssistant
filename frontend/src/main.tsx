import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NovelProvider } from './contexts/NovelContext'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NovelProvider>
        <RouterProvider router={router} />
      </NovelProvider>
    </AuthProvider>
  </StrictMode>,
)
