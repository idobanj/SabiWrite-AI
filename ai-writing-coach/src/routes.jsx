/** @format */

import {Routes, Route} from 'react-router-dom';
import {AppShell} from './components/AppShell';
import {PageTransition} from './components/PageTransition';
import {ProtectedRoute} from './components/ProtectedRoute';

import {LandingPage} from './pages/LandingPage';
import {LoginPage} from './pages/LoginPage';
import {SignupPage} from './pages/SignupPage';
import {WritingDesk} from './pages/WritingDesk';
import {ProgressDashboard} from './pages/ProgressDashboard';
import {PracticeModule} from './pages/PracticeModule';
import {HistoryPage} from './pages/HistoryPage';
import {ProfilePage} from './pages/ProfilePage';

/**
 * Top-level route map.
 * - "/" is public (landing)
 * - "/login" and "/signup" are public (auth flow, Phase 1)
 * - "/app/*" is gated by ProtectedRoute
 */
export function AppRoutes() {
    return (
        <Routes>
            <Route element={<AppShell />}>
                <Route
                    index
                    element={
                        <PageTransition>
                            <LandingPage />
                        </PageTransition>
                    }
                />
                <Route
                    path='login'
                    element={
                        <PageTransition>
                            <LoginPage />
                        </PageTransition>
                    }
                />
                <Route
                    path='signup'
                    element={
                        <PageTransition>
                            <SignupPage />
                        </PageTransition>
                    }
                />
                <Route path='app' element={<ProtectedRoute />}>
                    <Route
                        path='workspace'
                        element={
                            <PageTransition>
                                <WritingDesk />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='analytics'
                        element={
                            <PageTransition>
                                <ProgressDashboard />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='focus'
                        element={
                            <PageTransition>
                                <PracticeModule />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='history'
                        element={
                            <PageTransition>
                                <HistoryPage />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='profile'
                        element={
                            <PageTransition>
                                <ProfilePage />
                            </PageTransition>
                        }
                    />
                </Route>
                <Route path='*' element={<NotFound />} />
            </Route>
        </Routes>
    );
}

function NotFound() {
    return (
        <div className='flex flex-col items-center justify-center h-full text-center px-6 py-12 space-y-4'>
            <h1 className='text-4xl font-extrabold text-slate-900 dark:text-white'>
                404
            </h1>
            <p className='text-sm text-slate-500 dark:text-slate-400'>
                We couldn't find that page. It may be coming...
            </p>
        </div>
    );
}
