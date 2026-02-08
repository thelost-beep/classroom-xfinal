import React from 'react';
import Skeleton from './Skeleton';
import './LayoutSkeletons.css';

export const PostSkeleton: React.FC = () => (
    <div className="post-skeleton card">
        <div className="skeleton-header">
            <Skeleton circle width={40} height={40} />
            <div className="skeleton-header-text">
                <Skeleton width="120px" height="14px" />
                <Skeleton width="80px" height="10px" />
            </div>
        </div>
        <div className="skeleton-body">
            <Skeleton width="100%" height="16px" className="mb-sm" />
            <Skeleton width="90%" height="16px" className="mb-md" />
            <div className="skeleton-media">
                <Skeleton width="100%" height="300px" />
            </div>
        </div>
        <div className="skeleton-footer">
            <Skeleton width="60px" height="20px" />
            <Skeleton width="60px" height="20px" />
        </div>
    </div>
);

export const ProfileHeaderSkeleton: React.FC = () => (
    <div className="profile-header-skeleton card">
        <div className="skeleton-cover">
            <Skeleton width="100%" height="150px" borderRadius="0" />
        </div>
        <div className="skeleton-profile-essentials">
            <div className="skeleton-avatar-wrap">
                <Skeleton circle width={150} height={150} className="skeleton-avatar-large" />
            </div>
            <div className="skeleton-info">
                <Skeleton width="200px" height="28px" className="mb-sm" />
                <Skeleton width="150px" height="14px" className="mb-md" />
                <div className="skeleton-stats">
                    <Skeleton width="60px" height="16px" />
                    <Skeleton width="60px" height="16px" />
                    <Skeleton width="60px" height="16px" />
                </div>
            </div>
        </div>
    </div>
);

export const ClassmateCardSkeleton: React.FC = () => (
    <div className="classmate-card-skeleton card">
        <Skeleton width="100%" height="200px" borderRadius="var(--radius-xl) var(--radius-xl) 0 0" />
        <div className="skeleton-card-body">
            <Skeleton width="140px" height="18px" className="mb-xs" />
            <Skeleton width="100px" height="12px" />
        </div>
    </div>
);

export const GridItemSkeleton: React.FC = () => (
    <div className="grid-item-skeleton">
        <Skeleton width="100%" height="100%" borderRadius="0" />
    </div>
);
