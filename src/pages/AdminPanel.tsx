import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Anime form
  const [animeTitle, setAnimeTitle] = useState("");
  const [animeDescription, setAnimeDescription] = useState("");
  const [animeCover, setAnimeCover] = useState("");
  const [animeRating, setAnimeRating] = useState("");
  const [animeYear, setAnimeYear] = useState("");
  const [animeStatus, setAnimeStatus] = useState("ongoing");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Episode form
  const [selectedAnimeForEpisode, setSelectedAnimeForEpisode] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeVideoUrl, setEpisodeVideoUrl] = useState("");
  
  // Category form
  const [categoryName, setCategoryName] = useState("");
  
  // Advertisement form
  const [adTitle, setAdTitle] = useState("");
  const [adVideoUrl, setAdVideoUrl] = useState("");
  const [adRedirectUrl, setAdRedirectUrl] = useState("");
  
  // Lists
  const [categories, setCategories] = useState<any[]>([]);
  const [animeList, setAnimeList] = useState<any[]>([]);
  const [advertisements, setAdvertisements] = useState<any[]>([]);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const checkAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!data) {
        toast({
          title: "Доступ запрещён",
          description: "У вас нет прав администратора",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    const [categoriesData, animeData, adsData] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("anime").select("*").order("created_at", { ascending: false }),
      supabase.from("advertisements").select("*").order("created_at", { ascending: false }),
    ]);

    if (categoriesData.data) setCategories(categoriesData.data);
    if (animeData.data) setAnimeList(animeData.data);
    if (adsData.data) setAdvertisements(adsData.data);
  };

  const handleAddAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: anime, error } = await supabase
        .from("anime")
        .insert({
          title: animeTitle,
          description: animeDescription,
          cover_image: animeCover,
          rating: animeRating ? parseFloat(animeRating) : null,
          release_year: animeYear ? parseInt(animeYear) : null,
          status: animeStatus,
        })
        .select()
        .single();

      if (error) throw error;

      // Add categories
      if (selectedCategories.length > 0 && anime) {
        await supabase.from("anime_categories").insert(
          selectedCategories.map((catId) => ({
            anime_id: anime.id,
            category_id: catId,
          }))
        );
      }

      toast({ title: "Успех", description: "Аниме добавлено" });
      
      // Reset form
      setAnimeTitle("");
      setAnimeDescription("");
      setAnimeCover("");
      setAnimeRating("");
      setAnimeYear("");
      setSelectedCategories([]);
      
      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("episodes").insert({
        anime_id: selectedAnimeForEpisode,
        episode_number: parseInt(episodeNumber),
        title: episodeTitle || null,
        video_url: episodeVideoUrl,
      });

      if (error) throw error;

      toast({ title: "Успех", description: "Серия добавлена" });
      
      setEpisodeNumber("");
      setEpisodeTitle("");
      setEpisodeVideoUrl("");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = categoryName.toLowerCase().replace(/\s+/g, "-");
      
      const { error } = await supabase.from("categories").insert({
        name: categoryName,
        slug,
      });

      if (error) throw error;

      toast({ title: "Успех", description: "Категория добавлена" });
      setCategoryName("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddAdvertisement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("advertisements").insert({
        title: adTitle,
        video_url: adVideoUrl,
        redirect_url: adRedirectUrl,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Успех", description: "Реклама добавлена" });
      
      setAdTitle("");
      setAdVideoUrl("");
      setAdRedirectUrl("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Успех", description: "Категория удалена" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleAd = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("advertisements")
        .update({ is_active: !currentStatus })
        .eq("id", id);
        
      if (error) throw error;
      
      toast({ 
        title: "Успех", 
        description: currentStatus ? "Реклама отключена" : "Реклама включена" 
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 gradient-hero bg-clip-text text-transparent">
          Админ-панель
        </h1>

        <Tabs defaultValue="anime" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="anime">Аниме</TabsTrigger>
            <TabsTrigger value="episodes">Серии</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
            <TabsTrigger value="ads">Реклама</TabsTrigger>
          </TabsList>

          {/* Anime Tab */}
          <TabsContent value="anime">
            <Card className="p-6 gradient-card border-border/50">
              <h2 className="text-2xl font-bold mb-6">Добавить аниме</h2>
              <form onSubmit={handleAddAnime} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Название *</Label>
                  <Input
                    id="title"
                    value={animeTitle}
                    onChange={(e) => setAnimeTitle(e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={animeDescription}
                    onChange={(e) => setAnimeDescription(e.target.value)}
                    rows={4}
                    className="bg-background/50"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cover">URL обложки</Label>
                    <Input
                      id="cover"
                      value={animeCover}
                      onChange={(e) => setAnimeCover(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rating">Рейтинг (0-10)</Label>
                    <Input
                      id="rating"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={animeRating}
                      onChange={(e) => setAnimeRating(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Год выхода</Label>
                    <Input
                      id="year"
                      type="number"
                      value={animeYear}
                      onChange={(e) => setAnimeYear(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Статус</Label>
                    <Select value={animeStatus} onValueChange={setAnimeStatus}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing">Выходит</SelectItem>
                        <SelectItem value="completed">Завершён</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Категории</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        type="button"
                        variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedCategories((prev) =>
                            prev.includes(category.id)
                              ? prev.filter((id) => id !== category.id)
                              : [...prev, category.id]
                          );
                        }}
                        className={selectedCategories.includes(category.id) ? "gradient-hero" : ""}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="gradient-hero">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить аниме
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Episodes Tab */}
          <TabsContent value="episodes">
            <Card className="p-6 gradient-card border-border/50">
              <h2 className="text-2xl font-bold mb-6">Добавить серию</h2>
              <form onSubmit={handleAddEpisode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="anime-select">Выберите аниме *</Label>
                  <Select value={selectedAnimeForEpisode} onValueChange={setSelectedAnimeForEpisode}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Выберите аниме..." />
                    </SelectTrigger>
                    <SelectContent>
                      {animeList.map((anime) => (
                        <SelectItem key={anime.id} value={anime.id}>
                          {anime.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="episode-number">Номер серии *</Label>
                    <Input
                      id="episode-number"
                      type="number"
                      min="1"
                      value={episodeNumber}
                      onChange={(e) => setEpisodeNumber(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="episode-title">Название серии</Label>
                    <Input
                      id="episode-title"
                      value={episodeTitle}
                      onChange={(e) => setEpisodeTitle(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-url">URL видео *</Label>
                  <Input
                    id="video-url"
                    value={episodeVideoUrl}
                    onChange={(e) => setEpisodeVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/embed/..."
                    required
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Используйте embed-ссылку для YouTube или другого видеохостинга
                  </p>
                </div>

                <Button type="submit" className="gradient-hero" disabled={!selectedAnimeForEpisode}>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить серию
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 gradient-card border-border/50">
                <h2 className="text-2xl font-bold mb-6">Добавить категорию</h2>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Название категории *</Label>
                    <Input
                      id="category-name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <Button type="submit" className="gradient-hero">
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить категорию
                  </Button>
                </form>
              </Card>

              <Card className="p-6 gradient-card border-border/50">
                <h2 className="text-2xl font-bold mb-6">Существующие категории</h2>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-background/30 rounded-lg"
                    >
                      <span className="font-medium">{category.name}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      Нет категорий
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Ads Tab */}
          <TabsContent value="ads">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 gradient-card border-border/50">
                <h2 className="text-2xl font-bold mb-6">Добавить рекламу</h2>
                <form onSubmit={handleAddAdvertisement} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ad-title">Название *</Label>
                    <Input
                      id="ad-title"
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ad-video">URL видео *</Label>
                    <Input
                      id="ad-video"
                      value={adVideoUrl}
                      onChange={(e) => setAdVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/embed/..."
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ad-redirect">Ссылка перехода *</Label>
                    <Input
                      id="ad-redirect"
                      value={adRedirectUrl}
                      onChange={(e) => setAdRedirectUrl(e.target.value)}
                      placeholder="https://example.com"
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <Button type="submit" className="gradient-hero">
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить рекламу
                  </Button>
                </form>
              </Card>

              <Card className="p-6 gradient-card border-border/50">
                <h2 className="text-2xl font-bold mb-6">Существующая реклама</h2>
                <div className="space-y-2">
                  {advertisements.map((ad) => (
                    <div
                      key={ad.id}
                      className="flex items-center justify-between p-3 bg-background/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{ad.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {ad.is_active ? "🟢 Активна" : "🔴 Отключена"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAd(ad.id, ad.is_active)}
                      >
                        {ad.is_active ? "Отключить" : "Включить"}
                      </Button>
                    </div>
                  ))}
                  {advertisements.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      Нет рекламы
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;
