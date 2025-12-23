import React, { useState, useRef } from 'react';

function UploadZone({ categories, onUploadSuccess, onError }) {
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        provider: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: categories[0],
        notes: ''
    });

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleFileSelect = (file) => {
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            onError('Invalid file type. Please upload an image or PDF.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            onError('File too large. Maximum size is 10MB.');
            return;
        }

        setSelectedFile(file);

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            onError('Please select a file first');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const form = new FormData();
            form.append('receipt', selectedFile);
            form.append('provider', formData.provider);
            form.append('amount', formData.amount);
            form.append('date', formData.date);
            form.append('category', formData.category);
            form.append('notes', formData.notes);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: form
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            const data = await response.json();

            if (response.ok) {
                onUploadSuccess(data.receipt);
                // Reset form
                setSelectedFile(null);
                setPreview(null);
                setFormData({
                    provider: '',
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    category: categories[0],
                    notes: ''
                });
            } else {
                onError(data.error || 'Upload failed');
            }
        } catch (error) {
            onError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const resetFile = () => {
        setSelectedFile(null);
        setPreview(null);
    };

    return (
        <div className="card animate-slide-up">
            <div className="card-header">
                <h2 className="card-title">📤 Upload Receipt</h2>
            </div>

            {!selectedFile ? (
                <div
                    className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="upload-icon">📄</div>
                    <h3>Drop your receipt here</h3>
                    <p>or click to browse files</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Supports: JPG, PNG, GIF, WebP, PDF (max 10MB)
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="upload-input"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                    />
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    {/* File Preview */}
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-lg)',
                        marginBottom: 'var(--space-xl)',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="Receipt preview"
                                    style={{
                                        width: '100%',
                                        maxHeight: '250px',
                                        objectFit: 'contain',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-tertiary)'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    height: '150px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-secondary)'
                                }}>
                                    📄 {selectedFile.name}
                                </div>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={resetFile}
                                style={{ marginTop: 'var(--space-sm)', width: '100%' }}
                            >
                                Change File
                            </button>
                        </div>

                        <div style={{ flex: '2', minWidth: '280px' }}>
                            {/* Form Fields */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Provider / Vendor *</label>
                                    <input
                                        type="text"
                                        name="provider"
                                        className="form-input"
                                        placeholder="e.g., CVS Pharmacy"
                                        value={formData.provider}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount ($) *</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        className="form-input"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Date *</label>
                                    <input
                                        type="date"
                                        name="date"
                                        className="form-input"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category *</label>
                                    <select
                                        name="category"
                                        className="form-select"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Notes (optional)</label>
                                <input
                                    type="text"
                                    name="notes"
                                    className="form-input"
                                    placeholder="Any additional notes..."
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {uploading && (
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span>
                                Uploading...
                            </>
                        ) : (
                            <>
                                ☁️ Upload & Sync to Google Drive
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}

export default UploadZone;
