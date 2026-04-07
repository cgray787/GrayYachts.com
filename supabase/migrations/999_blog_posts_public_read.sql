CREATE POLICY "Public can read published posts" ON public.blog_posts FOR SELECT USING (published = true);
