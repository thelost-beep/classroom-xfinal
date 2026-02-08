import React from 'react';
import './LoadingSpinner.css';

interface Props {
    fullPage?: boolean;
    message?: string;
}

const LoadingSpinner: React.FC<Props> = ({ fullPage, message = 'Loading ClassroomX...' }) => (
    <div className={`loading-container ${fullPage ? 'full-page' : ''}`}>
        <div className="spinner-wrapper">
            <div className="spinner-orbit"><div className="spinner-dot"></div></div>
            <div className="spinner-text">{message}</div>
        </div>
    </div>
);
export default LoadingSpinner;
