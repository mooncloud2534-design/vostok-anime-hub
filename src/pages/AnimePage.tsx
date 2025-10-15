import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Play, Clock, Calendar, ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Episode {
  id: string;
  episode_number: number;
  title: string | null;
  video_url: string;
  duration: number | null;
}

interface Advertisement {
  id: string;
  video_url: string;
  redirect_url: string;
  title: string;
}

const AnimePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAnimeData();
      loadAdvertisement();
    }
  }, [id]);

  const loadAnimeData = async () => {
    try {
      // Load anime details
      const { data: animeData, error: animeError } = await supabase
        .from("anime")
        .select("*")
        .eq("id", id)
        .single();

      if (animeError) throw animeError;
      setAnime(animeData);

      // Load episodes
      const { data: episodesData, error: episodesError } = await supabase
        .from("episodes")
        .select("*")
        .eq("anime_id", id)
        .order("episode_number");

      if (episodesError) throw episodesError;
      if (episodesData && episodesData.length > 0) {
        setEpisodes(episodesData);
        setSelectedEpisode(episodesData[0]);
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from("anime_categories")
        .select("categories(name)")
        .eq("anime_id", id);

      if (categoriesData) {
        setCategories(categoriesData.map((c: any) => c.categories.name));
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные аниме",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAdvertisement = async () => {
    const { data } = await supabase
      .from("advertisements")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setAdvertisement(data);
    }
  };

  const handleAdClick = () => {
    if (advertisement) {
      window.open(advertisement.redirect_url, "_blank");
    }
  };

  if (loading || !anime) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к каталогу
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <Card className="overflow-hidden gradient-card border-border/50 shadow-card">
              {selectedEpisode ? (
                <div className="aspect-video bg-black">
                  <iframe
                    src={selectedEpisode.video_url}
                    className="w-full h-full"
                    allowFullScreen
                    title={`${anime.title} - Серия ${selectedEpisode.episode_number}`}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Нет доступных серий</p>
                  </div>
                </div>
              )}
              
              {selectedEpisode && (
                <div className="p-4 border-t border-border">
                  <h3 className="font-bold text-lg">
                    Серия {selectedEpisode.episode_number}
                    {selectedEpisode.title && `: ${selectedEpisode.title}`}
                  </h3>
                </div>
              )}
            </Card>

            {/* Episodes List */}
            {episodes.length > 0 && (
              <Card className="p-6 gradient-card border-border/50">
                <h3 className="font-bold text-xl mb-4">Серии</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {episodes.map((episode) => (
                    <Button
                      key={episode.id}
                      variant={selectedEpisode?.id === episode.id ? "default" : "outline"}
                      onClick={() => setSelectedEpisode(episode)}
                      className={selectedEpisode?.id === episode.id ? "gradient-hero" : ""}
                    >
                      {episode.episode_number}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {/* Advertisement */}
            {advertisement && (
              <Card 
                className="overflow-hidden gradient-card border-primary/50 shadow-card cursor-pointer hover-scale"
                onClick={handleAdClick}
              >
                <div className="relative">
                  <div className="aspect-video">
                    <iframe
                      src={advertisement.video_url}
                      className="w-full h-full pointer-events-none"
                      title={advertisement.title}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end">
                    <div className="p-4 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{advertisement.title}</span>
                        <ExternalLink className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Description */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="description">Описание</TabsTrigger>
                <TabsTrigger value="details">Детали</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="mt-4">
                <Card className="p-6 gradient-card border-border/50">
                  <p className="text-foreground leading-relaxed">
                    {anime.description || "Описание отсутствует"}
                  </p>
                </Card>
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                <Card className="p-6 gradient-card border-border/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Год выхода:</span>
                    <span className="font-semibold">{anime.release_year || "Неизвестно"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Статус:</span>
                    <Badge variant="secondary">{anime.status === "ongoing" ? "Выходит" : "Завершён"}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Серий:</span>
                    <span className="font-semibold">{episodes.length}</span>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="overflow-hidden gradient-card border-border/50 shadow-card">
              {anime.cover_image && (
                <div className="aspect-[2/3] relative">
                  <img 
                    src={anime.cover_image} 
                    alt={anime.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              )}
              
              <div className="p-6 space-y-4">
                <h1 className="text-2xl font-bold">{anime.title}</h1>
                
                {anime.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{anime.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">/10</span>
                  </div>
                )}

                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge 
                        key={category}
                        variant="secondary"
                        className="bg-secondary/20"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnimePage;
