import React from 'react';
import { Edit2, Trash2, Reply, Forward, Copy } from 'lucide-react';
import './MessageContextMenu.css';

interface MessageContextMenuProps {
    isOwn: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onReply: () => void;
    onForward: () => void;
    onCopy: () => void;
    onClose: () => void;
}

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
    isOwn,
    onEdit,
    onDelete,
    onReply,
    onForward,
    onCopy,
    onClose
}) => {
    return (
        <div className="message-context-menu" onClick={e => e.stopPropagation()}>
            <button className="context-menu-item" onClick={() => { onReply(); onClose(); }}>
                <Reply size={16} />
                <span>Reply</span>
            </button>
            <button className="context-menu-item" onClick={() => { onCopy(); onClose(); }}>
                <Copy size={16} />
                <span>Copy</span>
            </button>
            <button className="context-menu-item" onClick={() => { onForward(); onClose(); }}>
                <Forward size={16} />
                <span>Forward</span>
            </button>
            {isOwn && (
                <>
                    <div className="menu-divider" />
                    <button className="context-menu-item" onClick={() => { onEdit(); onClose(); }}>
                        <Edit2 size={16} />
                        <span>Edit</span>
                    </button>
                    <button className="context-menu-item danger" onClick={() => { onDelete(); onClose(); }}>
                        <Trash2 size={16} />
                        <span>Delete</span>
                    </button>
                </>
            )}
        </div>
    );
};

export default MessageContextMenu;
