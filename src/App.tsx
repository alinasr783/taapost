import { BrowserRouter, Route, Routes, Outlet } from 'react-router-dom'
import Home from './pages/Home'
import Categories from './pages/Categories'
import CategoryPage from './pages/CategoryPage'
import Articles from './pages/Articles'
import ArticlePage from './pages/ArticlePage'
import SiteLayout from './components/SiteLayout'
import DashboardLogin from './dashboard/pages/DashboardLogin'
import DashboardLayout from './dashboard/DashboardLayout'
import DashboardHome from './dashboard/pages/DashboardHome'
import DashboardArticles from './dashboard/pages/DashboardArticles'
import DashboardCategories from './dashboard/pages/DashboardCategories'
import DashboardUsers from './dashboard/pages/DashboardUsers'
import DashboardAuthors from './dashboard/pages/DashboardAuthors'
import DashboardHomeCustomization from './dashboard/pages/DashboardHomeCustomization'
import DashboardSettings from './dashboard/pages/DashboardSettings'
import ScrollToTop from './components/ScrollToTop'

function PublicLayout() {
  return (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Dashboard Routes */}
        <Route path="/dashboard/login" element={<DashboardLogin />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="articles" element={<DashboardArticles />} />
          <Route path="categories" element={<DashboardCategories />} />
          <Route path="users" element={<DashboardUsers />} />
          <Route path="authors" element={<DashboardAuthors />} />
          <Route path="home-customization" element={<DashboardHomeCustomization />} />
          <Route path="settings" element={<DashboardSettings />} />
        </Route>

        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/الأقسام" element={<Categories />} />
          <Route path="/قسم/:slug" element={<CategoryPage />} />
          <Route path="/المقالات" element={<Articles />} />
          <Route path="/مقال/:slug" element={<ArticlePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
