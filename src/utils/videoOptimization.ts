import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const loadFFmpeg = async () => {
    if (ffmpeg) return ffmpeg;

    ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    return ffmpeg;
};

export const optimizeVideo = async (file: File, onProgress?: (progress: number) => void): Promise<Blob> => {
    const ffmpeg = await loadFFmpeg();
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    ffmpeg.on('progress', ({ progress }) => {
        if (onProgress) onProgress(Math.round(progress * 100));
    });

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Faststart: -movflags faststart (moves moov atom to front for instant play)
    // Scale for compatibility and speed: -vf scale=-2:720
    // Crf 28 for good compression vs quality
    await ffmpeg.exec([
        '-i', inputName,
        '-movflags', 'faststart',
        '-vcodec', 'libx264',
        '-crf', '28',
        '-preset', 'ultrafast',
        '-vf', 'scale=-2:720',
        '-acodec', 'aac',
        outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    return new Blob([data as any], { type: 'video/mp4' });
};
