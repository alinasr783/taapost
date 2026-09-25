import { Suspense } from 'react'
import { BrowserRouter, Route, Routes, Outlet } from 'react-router-dom'
import { lazyWithRetry } from './utils/lazyWithRetry'
// Public pages are imported eagerly: they are the hot navigation paths and
// lazy-chunk loading was adding ~1-2s of blank "جاري التحميل..." on every
// menu/card tap. Dashboard stays lazy (admin only, heavy editors).
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import ArticlesPage from './pages/ArticlesPage'
import ArticleViewPage from './pages/ArticleViewPage'
import ArticlePage from './pages/ArticlePage'
import ContentListPage from './pages/ContentListPage'
import AuthorPage from './pages/AuthorPage'
const Categories = lazyWithRetry(() => import('./pages/Categories'))
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))
const LegacyRedirect = lazyWithRetry(() => import('./pages/LegacyRedirect'))
import SiteLayout from './components/SiteLayout'
const DashboardLogin = lazyWithRetry(() => import('./dashboard/pages/DashboardLogin'))
import DashboardLayout from './dashboard/DashboardLayout'
const DashboardHome = lazyWithRetry(() => import('./dashboard/pages/DashboardHome'))
const DashboardArticles = lazyWithRetry(() => import('./dashboard/pages/DashboardArticles'))
const DashboardArticleEditor = lazyWithRetry(() => import('./dashboard/pages/DashboardArticleEditor'))
const DashboardCategories = lazyWithRetry(() => import('./dashboard/pages/DashboardCategories'))
const DashboardUsers = lazyWithRetry(() => import('./dashboard/pages/DashboardUsers'))
const DashboardAuthors = lazyWithRetry(() => import('./dashboard/pages/DashboardAuthors'))
const DashboardHomeCustomization = lazyWithRetry(() => import('./dashboard/pages/DashboardHomeCustomization'))
const DashboardSettings = lazyWithRetry(() => import('./dashboard/pages/DashboardSettings'))
const DashboardNotifications = lazyWithRetry(() => import('./dashboard/pages/DashboardNotifications'))
const DashboardFinance = lazyWithRetry(() => import('./dashboard/pages/DashboardFinance'))
const DashboardBackup = lazyWithRetry(() => import('./dashboard/pages/DashboardBackup'))
const DashboardGuide = lazyWithRetry(() => import('./dashboard/pages/DashboardGuide'))
import ScrollToTop from './components/ScrollToTop'

function PublicLayout() {
  return (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  )
}

function PageFallback() {
  return (
    <div className="container flex min-h-[50dvh] items-center justify-center py-10 text-muted-foreground">
      جاري التحميل...
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/dashboard/login" element={<DashboardLogin />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="articles" element={<DashboardArticles />} />
            <Route path="articles/new" element={<DashboardArticleEditor />} />
            <Route path="articles/edit/:id" element={<DashboardArticleEditor />} />
            <Route path="categories" element={<DashboardCategories />} />
            <Route path="users" element={<DashboardUsers />} />
            <Route path="authors" element={<DashboardAuthors />} />
            <Route path="home-customization" element={<DashboardHomeCustomization />} />
            <Route path="settings" element={<DashboardSettings />} />
            <Route path="notifications" element={<DashboardNotifications />} />
            <Route path="finance" element={<DashboardFinance />} />
            <Route path="backup" element={<DashboardBackup />} />
            <Route path="guide" element={<DashboardGuide />} />
          </Route>

          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/category/:id" element={<CategoryPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/article/:id" element={<ArticleViewPage />} />
            <Route path="/content" element={<ContentListPage />} />
            <Route path="/post/:id" element={<ArticlePage />} />
            <Route path="/author/:id" element={<AuthorPage />} />

            <Route path="/قسم/:slug" element={<LegacyRedirect type="category" />} />
            <Route path="/مقال/:slug" element={<LegacyRedirect type="article" />} />
            <Route path="/كاتب/:slug" element={<LegacyRedirect type="author" />} />
            <Route path="/محتوى/:slug" element={<LegacyRedirect type="post" />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
