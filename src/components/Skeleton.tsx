import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    circle?: boolean;
    className?: string;
    borderRadius?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({
    width,
    height,
    circle,
    className = '',
    borderRadius
}) => {
    const style: React.CSSProperties = {
        width,
        height,
        borderRadius: circle ? '50%' : borderRadius,
    };

    return <div className={`skeleton-box ${className}`} style={style} />;
};

export default Skeleton;
