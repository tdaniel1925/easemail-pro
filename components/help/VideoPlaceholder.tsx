'use client';

import { PlayCircle, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VideoPlaceholderProps {
  title: string;
  description?: string;
  duration?: string;
  thumbnail?: string;
  category?: string;
  onPlay?: () => void;
}

export default function VideoPlaceholder({
  title,
  description,
  duration = '5:30',
  thumbnail,
  category,
  onPlay,
}: VideoPlaceholderProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={onPlay}>
      <div className="relative aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30" />
        )}

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="bg-white rounded-full p-4 group-hover:scale-110 transition-transform shadow-xl">
            <PlayCircle className="h-12 w-12 text-purple-600 fill-purple-600" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3">
          <Badge variant="secondary" className="bg-black/70 text-white hover:bg-black/70">
            {duration}
          </Badge>
        </div>

        {/* Category Badge */}
        {category && (
          <div className="absolute top-3 left-3">
            <Badge variant="default">{category}</Badge>
          </div>
        )}

        {/* Coming Soon Indicator */}
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-yellow-500/90 text-black border-yellow-600">
            Video Coming Soon
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <Video className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
          <h3 className="font-semibold text-lg group-hover:text-purple-600 transition-colors">
            {title}
          </h3>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
      </div>
    </Card>
  );
}
