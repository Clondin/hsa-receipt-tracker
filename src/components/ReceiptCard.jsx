import React, { useState } from 'react';

function ReceiptCard({ receipt, onDelete, onSync }) {
    const [imageError, setImageError] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm('Delete this receipt? This cannot be undone.')) return;
        setDeleting(true);
        await onDelete(receipt.id);
        setDeleting(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        await onSync(receipt.id);
        setSyncing(false);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="receipt-card">
            {/* Image */}
            {!imageError ? (
                <img
                    src={`/api/receipts/${receipt.id}/image`}
                    alt={`Receipt from ${receipt.provider}`}
                    className="receipt-image"
                    onError={() => setImageError(true)}
                />
            ) : (
                <div
                    className="receipt-image"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                        fontSize: '2rem'
                    }}
                >
                    📄
                </div>
            )}

            {/* Body */}
            <div className="receipt-body">
                <div className="receipt-header">
                    <div className="receipt-provider">{receipt.provider}</div>
                    <div className="receipt-amount">${receipt.amount.toFixed(2)}</div>
                </div>

                <div className="receipt-meta">
                    <span className="receipt-meta-item">
                        📅 {formatDate(receipt.date)}
                    </span>
                    <span className="receipt-category">{receipt.category}</span>
                </div>

                {receipt.notes && (
                    <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        marginBottom: 'var(--space-sm)'
                    }}>
                        {receipt.notes}
                    </p>
                )}

                {/* Sync Status */}
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                    {receipt.syncedToDrive ? (
                        <span className="sync-badge synced">
                            ✓ Synced to Drive
                        </span>
                    ) : (
                        <span className="sync-badge pending">
                            ⏳ Pending Sync
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="receipt-actions">
                    {receipt.driveLink && (
                        <a
                            href={receipt.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                        >
                            📂 View in Drive
                        </a>
                    )}
                    {!receipt.syncedToDrive && (
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleSync}
                            disabled={syncing}
                        >
                            {syncing ? '⏳' : '☁️'} Sync
                        </button>
                    )}
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? '...' : '🗑️'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ReceiptCard;
