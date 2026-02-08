import React from 'react';
import { X } from 'lucide-react';
import './ChatDetailsModal.css';

interface ChatDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    participants: any[];
    chatName: string;
}

const ChatDetailsModal: React.FC<ChatDetailsModalProps> = ({ isOpen, onClose, participants, chatName }) => {
    if (!isOpen) return null;

    return (
        <div className="details-modal-overlay" onClick={onClose}>
            <div className="details-modal" onClick={e => e.stopPropagation()}>
                <div className="details-header">
                    <h2>Chat Details</h2>
                    <button className="close-details" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="chat-summary">
                    <p className="section-label">Group Name</p>
                    <h3 className="group-display-name">{chatName}</h3>
                </div>

                <div className="settings-section">
                    <h4 className="section-title">Members ({participants.length})</h4>
                    <div className="member-list">
                        {participants.map((p: any) => (
                            <div key={p.user_id} className="member-item">
                                {p.profiles.avatar_url ? (
                                    <img src={p.profiles.avatar_url} alt={p.profiles.name} className="member-avatar" />
                                ) : (
                                    <div className="member-placeholder">{p.profiles.name?.[0]?.toUpperCase()}</div>
                                )}
                                <div className="member-info">
                                    <p className="member-name">{p.profiles.name}</p>
                                    <p className="member-role">{p.profiles.role || 'Student'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="settings-section">
                    <div className="setting-row">
                        <span className="setting-label">Read Receipts</span>
                        <label className="switch">
                            <input type="checkbox" defaultChecked />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatDetailsModal;
