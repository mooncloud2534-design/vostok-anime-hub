import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Anime {
  id: string;
  title: string;
  cover_image: string | null;
  rating: number | null;
  categories?: string[];
  episodeCount?: number;
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      
      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Load anime
      let query = supabase
        .from("anime")
        .select(`
          id,
          title,
          cover_image,
          rating,
          episodes (count)
        `)
        .order("created_at", { ascending: false });

      const searchQuery = searchParams.get("search");
      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data: animeData, error } = await query;

      if (error) throw error;

      if (animeData) {
        // Load categories for each anime
        const animeWithCategories = await Promise.all(
          animeData.map(async (anime) => {
            const { data: animeCategories } = await supabase
              .from("anime_categories")
              .select("category_id, categories(name)")
              .eq("anime_id", anime.id);

            return {
              ...anime,
              categories: animeCategories?.map((ac: any) => ac.categories.name) || [],
              episodeCount: anime.episodes?.[0]?.count || 0,
            };
          })
        );

        setAnimeList(animeWithCategories);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить аниме",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAnime = selectedCategory === "all" 
    ? animeList 
    : animeList.filter(anime => anime.categories?.includes(
        categories.find(c => c.id === selectedCategory)?.name || ""
      ));

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 gradient-hero bg-clip-text text-transparent">
            Добро пожаловать в Anime Dom Pro
          </h1>
          <p className="text-xl text-muted-foreground">
            Смотрите лучшие аниме онлайн в высоком качестве
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className={selectedCategory === "all" ? "gradient-hero" : ""}
            >
              Все
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id ? "gradient-hero" : ""}
              >
                {category.name}
              </Button>
            ))}
          </div>
        )}

        {/* Anime Grid */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredAnime.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredAnime.map((anime) => (
              <AnimeCard
                key={anime.id}
                id={anime.id}
                title={anime.title}
                coverImage={anime.cover_image || undefined}
                rating={anime.rating || undefined}
                categories={anime.categories}
                episodeCount={anime.episodeCount}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-2xl text-muted-foreground">
              {searchParams.get("search") 
                ? "Аниме не найдено" 
                : "Пока нет доступных аниме"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
