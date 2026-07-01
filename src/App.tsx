import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, Outlet, Navigate } from 'react-router-dom'
const Home = lazy(() => import('./pages/Home'))
const Categories = lazy(() => import('./pages/Categories'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'))
const ArticleViewPage = lazy(() => import('./pages/ArticleViewPage'))
const ContentListPage = lazy(() => import('./pages/ContentListPage'))
const ArticlePage = lazy(() => import('./pages/ArticlePage'))
const AuthorPage = lazy(() => import('./pages/AuthorPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
import SiteLayout from './components/SiteLayout'
const DashboardLogin = lazy(() => import('./dashboard/pages/DashboardLogin'))
import DashboardLayout from './dashboard/DashboardLayout'
const DashboardHome = lazy(() => import('./dashboard/pages/DashboardHome'))
const DashboardArticles = lazy(() => import('./dashboard/pages/DashboardArticles'))
const DashboardArticleEditor = lazy(() => import('./dashboard/pages/DashboardArticleEditor'))
const DashboardCategories = lazy(() => import('./dashboard/pages/DashboardCategories'))
const DashboardUsers = lazy(() => import('./dashboard/pages/DashboardUsers'))
const DashboardAuthors = lazy(() => import('./dashboard/pages/DashboardAuthors'))
const DashboardHomeCustomization = lazy(() => import('./dashboard/pages/DashboardHomeCustomization'))
const DashboardSettings = lazy(() => import('./dashboard/pages/DashboardSettings'))
const DashboardNotifications = lazy(() => import('./dashboard/pages/DashboardNotifications'))
const DashboardFinance = lazy(() => import('./dashboard/pages/DashboardFinance'))
const DashboardBackup = lazy(() => import('./dashboard/pages/DashboardBackup'))
const DashboardGuide = lazy(() => import('./dashboard/pages/DashboardGuide'))
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
            <Route path="/posts" element={<Navigate to="/articles" replace />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/article/:slug" element={<ArticleViewPage />} />
            <Route path="/content" element={<ContentListPage />} />
            <Route path="/post/:id" element={<ArticlePage />} />
            <Route path="/author/:id" element={<AuthorPage />} />

            <Route path="/الأقسام" element={<Navigate to="/categories" replace />} />
            <Route path="/قسم/:slug" element={<CategoryPage />} />
            <Route path="/المقالات" element={<Navigate to="/articles" replace />} />
            <Route path="/مقال/:slug" element={<ArticleViewPage />} />
            <Route path="/محتوى" element={<Navigate to="/content" replace />} />
            <Route path="/محتوى/:slug" element={<ArticlePage />} />
            <Route path="/كاتب/:slug" element={<AuthorPage />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
