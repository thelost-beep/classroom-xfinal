import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, Maximize, Square, Image as ImageIcon } from 'lucide-react';
import { getCroppedImg } from '../utils/cropUtils';
import './ImageCropModal.css';

interface ImageCropModalProps {
    image: string;
    onCropComplete: (croppedImage: Blob) => void;
    onClose: () => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ image, onCropComplete, onClose }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspect, setAspect] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = useCallback((crop: { x: number; y: number }) => {
        setCrop(crop);
    }, []);

    const onZoomChange = useCallback((zoom: number) => {
        setZoom(zoom);
    }, []);

    const onCropAreaComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            const croppedImage = await getCroppedImg(image, croppedAreaPixels);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="crop-modal-overlay">
            <div className="crop-modal-content card animate-scaleIn">
                <div className="crop-modal-header">
                    <h3>Edit Photo</h3>
                    <button onClick={onClose} className="close-btn">
                        <X size={20} />
                    </button>
                </div>

                <div className="crop-container">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={onCropChange}
                        onCropComplete={onCropAreaComplete}
                        onZoomChange={onZoomChange}
                    />
                </div>

                <div className="crop-controls">
                    <div className="aspect-ratios">
                        <button
                            className={`aspect-btn ${aspect === 1 ? 'active' : ''}`}
                            onClick={() => setAspect(1)}
                            title="1:1 Square"
                        >
                            <Square size={18} />
                            <span>1:1</span>
                        </button>
                        <button
                            className={`aspect-btn ${aspect === 4 / 5 ? 'active' : ''}`}
                            onClick={() => setAspect(4 / 5)}
                            title="4:5 Portrait"
                        >
                            <ImageIcon size={18} />
                            <span>4:5</span>
                        </button>
                        <button
                            className={`aspect-btn ${aspect === 16 / 9 ? 'active' : ''}`}
                            onClick={() => setAspect(16 / 9)}
                            title="16:9 Landscape"
                        >
                            <Maximize size={18} />
                            <span>16:9</span>
                        </button>
                    </div>

                    <div className="zoom-slider-container">
                        <span>Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => onZoomChange(Number(e.target.value))}
                            className="zoom-range"
                        />
                    </div>
                </div>

                <div className="crop-modal-footer">
                    <button className="btn outline" onClick={onClose}>Cancel</button>
                    <button className="btn primary" onClick={handleSave}>
                        <Check size={18} />
                        Apply Crop
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropModal;
