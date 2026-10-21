import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/Header.tsx';
import { Sidebar, TabType } from './components/Sidebar.tsx';
import { VerifyModal } from './components/VerifyModal.tsx';
import { AiAssistantModal } from './components/AiAssistantModal.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';

// Pages
import { DashboardPage } from './pages/DashboardPage.tsx';
import { PatientsPage } from './pages/PatientsPage.tsx';
import { OrdersPage } from './pages/OrdersPage.tsx';
import { SpecimensPage } from './pages/SpecimensPage.tsx';
import { WorkflowPage } from './pages/WorkflowPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { PatientPortalPage } from './pages/PatientPortalPage.tsx';
import { BillingPage } from './pages/BillingPage.tsx';
import { AnalyzersPage } from './pages/AnalyzersPage.tsx';
import { QualityControlPage } from './pages/QualityControlPage.tsx';
import { StaffPage } from './pages/StaffPage.tsx';
import { ApiDocsPage } from './pages/ApiDocsPage.tsx';
import { AdminPanelPage } from './pages/AdminPanelPage.tsx';

function MainApp() {
  const { role, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // If switched to Patient role, automatically navigate to Patient Portal
  useEffect(() => {
    if (role === 'patient') {
      setActiveTab('patient_portal');
    } else if (activeTab === 'patient_portal') {
      setActiveTab('dashboard');
    }
  }, [role]);

  if (!user) return <AuthScreen />;
  if (role === 'super_admin' && activeTab === 'admin') {
    return <AdminPanelPage onBack={() => setActiveTab('dashboard')} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenAiAssistant={() => setIsAiOpen(true)}
          onOpenVerifyModal={() => setIsVerifyOpen(true)}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
          {activeTab === 'patients' && <PatientsPage onNavigateToOrderWithPatient={() => setActiveTab('orders')} />}
          {activeTab === 'orders' && <OrdersPage onNavigateToWorkflow={() => setActiveTab('workflow')} />}
          {activeTab === 'specimens' && <SpecimensPage />}
          {activeTab === 'workflow' && <WorkflowPage onNavigateToReports={() => setActiveTab('reports')} />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'patient_portal' && <PatientPortalPage />}
          {activeTab === 'billing' && <BillingPage />}
          {activeTab === 'analyzers' && <AnalyzersPage />}
          {activeTab === 'qc' && <QualityControlPage />}
          {activeTab === 'staff' && <StaffPage />}
          {activeTab === 'apidocs' && <ApiDocsPage />}
        </main>
      </div>

      {/* Global Modals */}
      <VerifyModal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)} />
      <AiAssistantModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
