import React, { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import ReceiptGallery from './components/ReceiptGallery';
import Toast from './components/Toast';

const CATEGORIES = [
    'Doctor Visit',
    'Prescription',
    'Lab Work',
    'Dental',
    'Vision',
    'Therapy',
    'Medical Equipment',
    'Hospital',
    'Urgent Care',
    'Other'
];

function App() {
    const [activeTab, setActiveTab] = useState('upload');
    const [receipts, setReceipts] = useState([]);
    const [totals, setTotals] = useState({ total: 0, byCategory: {} });
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState(null);
    const [toasts, setToasts] = useState([]);

    // Fetch receipts and config on mount
    useEffect(() => {
        fetchReceipts();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            setConfig(data);
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    };

    // Check for auth success in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('auth') === 'success') {
            showToast('Successfully connected to Google Drive!', 'success');
            fetchConfig();
            // Clean up URL
            window.history.replaceState({}, document.title, '/');
        }
    }, []);

    const handleLogin = async () => {
        try {
            const response = await fetch('/api/auth/login');
            const data = await response.json();
            if (data.authUrl) {
                window.location.href = data.authUrl;
            }
        } catch (error) {
            showToast('Failed to start login', 'error');
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            showToast('Logged out', 'success');
            fetchConfig();
        } catch (error) {
            showToast('Failed to logout', 'error');
        }
    };

    const fetchReceipts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/receipts');
            const data = await response.json();
            setReceipts(data.receipts || []);
            setTotals(data.totals || { total: 0, byCategory: {} });
        } catch (error) {
            console.error('Failed to fetch receipts:', error);
            showToast('Failed to load receipts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const handleUploadSuccess = (receipt) => {
        setReceipts(prev => [receipt, ...prev]);
        setTotals(prev => ({
            total: prev.total + receipt.amount,
            byCategory: {
                ...prev.byCategory,
                [receipt.category]: (prev.byCategory[receipt.category] || 0) + receipt.amount
            }
        }));
        showToast('Receipt uploaded successfully!', 'success');
        setActiveTab('gallery');
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
            if (response.ok) {
                const deletedReceipt = receipts.find(r => r.id === id);
                setReceipts(prev => prev.filter(r => r.id !== id));
                if (deletedReceipt) {
                    setTotals(prev => ({
                        total: prev.total - deletedReceipt.amount,
                        byCategory: {
                            ...prev.byCategory,
                            [deletedReceipt.category]: (prev.byCategory[deletedReceipt.category] || 0) - deletedReceipt.amount
                        }
                    }));
                }
                showToast('Receipt deleted', 'success');
            }
        } catch (error) {
            showToast('Failed to delete receipt', 'error');
        }
    };

    const handleSync = async (id) => {
        try {
            const response = await fetch(`/api/receipts/${id}/sync`, { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                setReceipts(prev => prev.map(r => r.id === id ? data.receipt : r));
                showToast('Synced to Google Drive!', 'success');
            } else {
                showToast(data.error || 'Sync failed', 'error');
            }
        } catch (error) {
            showToast('Failed to sync to Google Drive', 'error');
        }
    };

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="container header-content">
                    <a href="/" className="logo">
                        <div className="logo-icon">💊</div>
                        <span>HSA Tracker</span>
                    </a>

                    <nav className="nav-tabs">
                        <button
                            className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
                            onClick={() => setActiveTab('upload')}
                        >
                            📤 Upload
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'gallery' ? 'active' : ''}`}
                            onClick={() => setActiveTab('gallery')}
                        >
                            📋 Receipts ({receipts.length})
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {activeTab === 'upload' && (
                    <>
                        {/* Hero Section */}
                        <section className="hero">
                            <div className="container hero-content animate-fade-in">
                                <div className="hero-badge">
                                    <span className={`hero-badge-dot ${config?.isAuthenticated ? '' : 'pending'}`}></span>
                                    {config?.isAuthenticated
                                        ? (config?.isSheetsConfigured ? 'Drive & Sheets Connected' : 'Google Drive Connected')
                                        : 'Not Connected'
                                    }
                                </div>
                                {!config?.isAuthenticated && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleLogin}
                                        style={{ marginBottom: 'var(--space-lg)' }}
                                    >
                                        🔐 Sign in with Google
                                    </button>
                                )}
                                {config?.isAuthenticated && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                                        <button
                                            onClick={handleLogout}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                                <h1>
                                    Track Your <span>HSA Expenses</span><br />
                                    Effortlessly
                                </h1>
                                <p className="hero-description">
                                    Upload medical receipts, organize by category, and automatically sync to Google Drive.
                                    Keep your HSA documentation organized and accessible.
                                </p>
                            </div>
                        </section>

                        {/* Stats */}
                        {receipts.length > 0 && (
                            <section className="container">
                                <div className="stats-grid animate-slide-up">
                                    <div className="stat-card">
                                        <div className="stat-value">${totals.total.toFixed(2)}</div>
                                        <div className="stat-label">Total Expenses</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{receipts.length}</div>
                                        <div className="stat-label">Receipts</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{receipts.filter(r => r.syncedToDrive).length}</div>
                                        <div className="stat-label">Synced to Drive</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{Object.keys(totals.byCategory).length}</div>
                                        <div className="stat-label">Categories</div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Upload Zone */}
                        <section className="upload-section container">
                            <UploadZone
                                categories={CATEGORIES}
                                onUploadSuccess={handleUploadSuccess}
                                onError={(msg) => showToast(msg, 'error')}
                            />
                        </section>
                    </>
                )}

                {activeTab === 'gallery' && (
                    <section className="gallery-section container">
                        <ReceiptGallery
                            receipts={receipts}
                            totals={totals}
                            categories={CATEGORIES}
                            loading={loading}
                            onDelete={handleDelete}
                            onSync={handleSync}
                            onRefresh={fetchReceipts}
                        />
                    </section>
                )}
            </main>

            {/* Toast Notifications */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast key={toast.id} message={toast.message} type={toast.type} />
                ))}
            </div>
        </div>
    );
}

export default App;
