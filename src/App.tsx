import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { PatientResultsPage } from './pages/PatientResultsPage';
import { PatientResultDetailPage } from './pages/PatientResultDetailPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { FacilityDashboardPage } from './pages/FacilityDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route
          path="patient/results/:resultId"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <PatientResultDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="patient/results"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <PatientResultsPage />
            </RequireAuth>
          }
        />
        <Route
          path="patient/*"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <PatientDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="doctor/*"
          element={
            <RequireAuth allowedRoles={['doctor']}>
              <DoctorDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="facility/*"
          element={
            <RequireAuth allowedRoles={['facility']}>
              <FacilityDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/*"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminDashboardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
