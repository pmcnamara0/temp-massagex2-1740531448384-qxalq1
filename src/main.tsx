import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { AppProvider } from './context/AppContext'

import AppLayout from './components/layout/AppLayout'
import DiscoverPage from './pages/DiscoverPage'
import ChatListPage from './pages/ChatListPage'
import ChatDetailPage from './pages/ChatDetailPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: '/discover',
        element: <DiscoverPage />,
      },
      {
        path: '/chats',
        element: <ChatListPage />,
      },
      {
        path: '/chats/:chatId',
        element: <ChatDetailPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </React.StrictMode>,
)
