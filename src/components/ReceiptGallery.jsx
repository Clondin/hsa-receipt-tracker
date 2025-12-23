import React, { useState } from 'react';
import ReceiptCard from './ReceiptCard';

function ReceiptGallery({ receipts, totals, categories, loading, onDelete, onSync, onRefresh }) {
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredReceipts = receipts.filter(receipt => {
        const matchesFilter = filter === 'all' || receipt.category === filter;
        const matchesSearch = searchQuery === '' ||
            receipt.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
            receipt.notes?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const filteredTotal = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);

    if (loading) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                <div className="loading-spinner"></div>
                <p style={{ color: 'var(--text-secondary)' }}>Loading receipts...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header with Stats */}
            <div className="gallery-header">
                <div>
                    <h2 className="gallery-title">📋 Your Receipts</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
                        {filteredReceipts.length} receipts • ${filteredTotal.toFixed(2)} total
                    </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
                    🔄 Refresh
                </button>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-md)',
                    marginBottom: 'var(--space-md)',
                    flexWrap: 'wrap'
                }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 Search by provider or notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: '1', minWidth: '200px' }}
                    />
                </div>

                <div className="gallery-filters">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({receipts.length})
                    </button>
                    {categories
                        .filter(cat => receipts.some(r => r.category === cat))
                        .map(cat => (
                            <button
                                key={cat}
                                className={`filter-btn ${filter === cat ? 'active' : ''}`}
                                onClick={() => setFilter(cat)}
                            >
                                {cat} ({receipts.filter(r => r.category === cat).length})
                            </button>
                        ))}
                </div>
            </div>

            {/* Summary Cards */}
            {receipts.length > 0 && (
                <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card">
                        <div className="stat-value">${totals.total.toFixed(2)}</div>
                        <div className="stat-label">Total Tracked</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{receipts.filter(r => r.syncedToDrive).length}/{receipts.length}</div>
                        <div className="stat-label">Synced to Drive</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{new Date().getFullYear()}</div>
                        <div className="stat-label">Tax Year</div>
                    </div>
                </div>
            )}

            {/* Receipt Grid */}
            {filteredReceipts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h3>No receipts found</h3>
                    <p>
                        {receipts.length === 0
                            ? "Upload your first receipt to get started"
                            : "Try adjusting your search or filter"}
                    </p>
                </div>
            ) : (
                <div className="gallery-grid">
                    {filteredReceipts.map(receipt => (
                        <ReceiptCard
                            key={receipt.id}
                            receipt={receipt}
                            onDelete={onDelete}
                            onSync={onSync}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default ReceiptGallery;
