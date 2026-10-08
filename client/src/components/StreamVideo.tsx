import { useEffect, useRef } from "react";
import { MicOff, User } from "lucide-react";
import { cn } from "../lib/cn";

interface StreamVideoProps {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
  audioMuted?: boolean;
  cameraOff?: boolean;
}

function StreamVideo({
  stream,
  label,
  muted = false,
  mirrored = false,
  audioMuted = false,
  cameraOff = false,
}: StreamVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
    }
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="video-ring relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
      <div className="aspect-video w-full">
        {stream && !cameraOff ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={cn("h-full w-full object-cover", mirrored && "mirror")}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-900 text-zinc-600">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
              <User className="h-6 w-6" />
            </span>
            <p className="text-xs font-medium">
              {cameraOff ? "Camera is off" : "Waiting for video…"}
            </p>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur">
          {label}
        </span>
        {audioMuted && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-1 text-[11px] font-medium text-white">
            <MicOff className="h-3 w-3" />
            Muted
          </span>
        )}
      </div>
    </div>
  );
}

export default StreamVideo;
