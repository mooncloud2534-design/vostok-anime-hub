-- Создаем enum для ролей пользователей
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Таблица профилей пользователей
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свой профиль" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Таблица ролей пользователей (отдельная для безопасности)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все видят роли" ON public.user_roles
  FOR SELECT USING (true);

-- Функция для проверки роли (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Таблица категорий
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все видят категории" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Только админы создают категории" ON public.categories
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы обновляют категории" ON public.categories
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы удаляют категории" ON public.categories
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Таблица аниме
CREATE TABLE public.anime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
  release_year INTEGER,
  status TEXT DEFAULT 'ongoing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все видят аниме" ON public.anime
  FOR SELECT USING (true);

CREATE POLICY "Только админы создают аниме" ON public.anime
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы обновляют аниме" ON public.anime
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы удаляют аниме" ON public.anime
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Связующая таблица аниме-категории
CREATE TABLE public.anime_categories (
  anime_id UUID REFERENCES public.anime(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (anime_id, category_id)
);

ALTER TABLE public.anime_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все видят связи аниме-категории" ON public.anime_categories
  FOR SELECT USING (true);

CREATE POLICY "Только админы создают связи" ON public.anime_categories
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы удаляют связи" ON public.anime_categories
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Таблица серий/эпизодов
CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id UUID REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT,
  video_url TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(anime_id, episode_number)
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все видят серии" ON public.episodes
  FOR SELECT USING (true);

CREATE POLICY "Только админы создают серии" ON public.episodes
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы обновляют серии" ON public.episodes
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы удаляют серии" ON public.episodes
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Таблица рекламы
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  redirect_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все видят активную рекламу" ON public.advertisements
  FOR SELECT USING (is_active = true);

CREATE POLICY "Админы видят всю рекламу" ON public.advertisements
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы создают рекламу" ON public.advertisements
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы обновляют рекламу" ON public.advertisements
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Только админы удаляют рекламу" ON public.advertisements
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Триггер для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_anime_updated_at
  BEFORE UPDATE ON public.anime
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Создаем storage bucket для обложек аниме
INSERT INTO storage.buckets (id, name, public)
VALUES ('anime-covers', 'anime-covers', true);

-- RLS политики для storage
CREATE POLICY "Все видят обложки" ON storage.objects
  FOR SELECT USING (bucket_id = 'anime-covers');

CREATE POLICY "Админы загружают обложки" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'anime-covers' AND 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Админы обновляют обложки" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'anime-covers' AND 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Админы удаляют обложки" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'anime-covers' AND 
    public.has_role(auth.uid(), 'admin')
  );