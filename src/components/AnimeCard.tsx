import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Play } from "lucide-react";

interface AnimeCardProps {
  id: string;
  title: string;
  coverImage?: string;
  rating?: number;
  categories?: string[];
  episodeCount?: number;
}

export const AnimeCard = ({ 
  id, 
  title, 
  coverImage, 
  rating,
  categories = [],
  episodeCount = 0
}: AnimeCardProps) => {
  return (
    <Link to={`/anime/${id}`}>
      <Card className="group relative overflow-hidden gradient-card border-border/50 hover-scale hover-glow cursor-pointer">
        <div className="aspect-[2/3] relative overflow-hidden">
          {coverImage ? (
            <img 
              src={coverImage} 
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Play className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Rating badge */}
          {rating && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-white">{rating.toFixed(1)}</span>
            </div>
          )}
          
          {/* Episode count */}
          {episodeCount > 0 && (
            <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-sm rounded-lg px-2 py-1">
              <span className="text-xs font-bold">{episodeCount} серий</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, 3).map((category) => (
                <Badge 
                  key={category} 
                  variant="secondary"
                  className="text-xs bg-secondary/20"
                >
                  {category}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
};
