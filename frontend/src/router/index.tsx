import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import WritingPage from '../pages/WritingPage'
import NovelPage from '../pages/NovelPage'
import ChapterPage from '../pages/ChapterPage'
import CharacterPage from '../pages/CharacterPage'
import WorldSettingPage from '../pages/WorldSettingPage'
import SummaryPage from '../pages/SummaryPage'
import CharacterRelationPage from '../pages/CharacterRelationPage'
import PlotTimelinePage from '../pages/PlotTimelinePage'
import ProtectedRoute from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <WritingPage /> },
      { path: 'novels', element: <NovelPage /> },
      { path: 'chapters', element: <ChapterPage /> },
      { path: 'characters', element: <CharacterPage /> },
      { path: 'character-relations', element: <CharacterRelationPage /> },
      { path: 'plot-timeline', element: <PlotTimelinePage /> },
      { path: 'world-setting', element: <WorldSettingPage /> },
      { path: 'summaries', element: <SummaryPage /> },
    ],
  },
])
