import React from 'react';

function Toast({ message, type = 'success' }) {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    return (
        <div className={`toast ${type}`}>
            <span className="toast-icon">{icons[type]}</span>
            <span>{message}</span>
        </div>
    );
}

export default Toast;
