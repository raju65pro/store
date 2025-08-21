const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const POSTS_URL = "https://raw.githubusercontent.com/mahbuburrahmanraju/store/refs/heads/main/vid.json"; // replace with your remote posts.json
const SITE_URL = "https://example.com/site.json";   // replace with your remote site.json

let posts = [];
let site = {};

async function loadData() {
  try {
    const postsRes = await fetch(POSTS_URL);
    posts = await postsRes.json();

    const siteRes = await fetch(SITE_URL);
    site = await siteRes.json();

    console.log("Data loaded successfully!");
  } catch (err) {
    console.error("Error loading JSON data:", err);
  }
}

loadData();

setInterval(loadData, 5 * 60 * 1000);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get(["/", "/page/:page"], async (req, res) => {
  if (!posts.length || !site.name) await loadData();

  const perPage = 20;
  const page = parseInt(req.params.page) || 1;

  const start = (page - 1) * perPage;
  const end = start + perPage;

  const paginatedPosts = posts.slice(start, end);

  res.render("index", {
    site,
    posts: paginatedPosts,
    currentPage: page,
    totalPages: Math.ceil(posts.length / perPage),
  });
});

app.get("/category/:category", async (req, res) => {
  if (!posts.length || !site.name) await loadData();

  const category = req.params.category;
  const page = parseInt(req.query.page) || 1;
  const perPage = 20;

  const categoryPosts = posts.filter(p => p.category.toLowerCase() === category.toLowerCase());
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginated = categoryPosts.slice(start, end);
  const hasMore = end < categoryPosts.length;

  if (categoryPosts.length === 0) return res.status(404).render("404", { site });

  res.render("category", { site, category, posts: paginated, page, hasMore });
});

app.get("/tag/:tag", async (req, res) => {
  if (!posts.length || !site.name) await loadData();

  const tag = req.params.tag;
  const page = parseInt(req.query.page) || 1;
  const perPage = 20;

  const tagPosts = posts.filter(p => p.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginated = tagPosts.slice(start, end);
  const hasMore = end < tagPosts.length;

  if (tagPosts.length === 0) return res.status(404).render("404", { site });

  res.render("tag", { site, tag, posts: paginated, page, hasMore });
});

app.get("/:slug", async (req, res, next) => {
  if (!posts.length || !site.name) await loadData();

  const slug = req.params.slug;

  // Skip reserved slugs
  if (slug === "page" || slug === "category" || slug === "tag") return next();

  const post = posts.find(p => p.slug === slug);
  if (!post) return res.status(404).render("404", { site });

  const related = posts.filter(p => p.category === post.category && p.slug !== post.slug).slice(0, 5);

  res.render("post", { site, post, related });
});

app.get("/sitemap.xml", async (req, res) => {
  if (!posts.length || !site.name) await loadData();

  const baseUrl = site.url;
  const perPage = 20;
  const totalPages = Math.ceil(posts.length / perPage);

  let urls = [];

  // Homepage + pagination
  urls.push(`<url><loc>${baseUrl}/</loc></url>`);
  for (let i = 2; i <= totalPages; i++) {
    urls.push(`<url><loc>${baseUrl}/page/${i}</loc></url>`);
  }

  posts.forEach(post => urls.push(`<url><loc>${baseUrl}/${post.slug}</loc></url>`));

  const categories = [...new Set(posts.map(p => p.category))];
  categories.forEach(cat => urls.push(`<url><loc>${baseUrl}/category/${cat}</loc></url>`));

  const tags = [...new Set(posts.flatMap(p => p.tags))];
  tags.forEach(tag => urls.push(`<url><loc>${baseUrl}/tag/${tag}</loc></url>`));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join("\n  ")}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap);
});

app.use((req, res) => {
  res.status(404).render("404", { site });
});

app.listen(PORT, () => {
  console.log(`Server running at https://nudemms.com`);
});
