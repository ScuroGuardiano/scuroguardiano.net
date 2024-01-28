/*
  Content compiler will compile blog posts from src/content/blog
  Each language version of blogpost should be in it's own language directory
  otherwise it's undefined behaviour [I am too lazy to define it]

  Also in each languge version date should be the same, this compiler will take
  date from first language version so be careful.

  Every blog post should have front matters attributes: title, slug, lang and date
  otherwise - undefined behaviour XDD

  Optionally it can also have a description
*/

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';
// I don't know which version of Node cloudflare uses, so for compatibility I will use
// this core js import
import 'core-js/actual/array/to-sorted.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const blogDir = path.join(__dirname, 'src', 'content', 'blog');
const outputDir = path.join(__dirname, 'src', 'assets', '__sg', 'blog');

const blogs = new Map();

async function createDirIfNotExists(path) {
  await fs.access(path)
  .catch(err => {
    return fs.mkdir(path, { recursive: true })
  })
  .catch(err => console.error(err));
}

/**
 *
 * @param { string } relativePath
 * @param { any } mattered
 */
function blogMetadata(relativePath, mattered) {
  const originalPathParsed = path.parse(relativePath);
  const key = originalPathParsed.name;
  const date = mattered.date;

  const targetPath = path.format({
    dir: originalPathParsed.dir,
    name: mattered.slug ?? key,
    ext: ".html"
  });

  const languageVersions = [{
    lang: mattered.lang,
    title: mattered.title,
    slug: mattered.slug,
    description: mattered.description,
    path: targetPath
  }];

  return { key, date, languageVersions };
}

function setOrMerge(blogMetadata) {
  if (blogs.has(blogMetadata.key)) {
    const m = blogs.get(blogMetadata.key);
    m.languageVersions = [...m.languageVersions, ...blogMetadata.languageVersions];
    return;
  }
  blogs.set(blogMetadata.key, blogMetadata);
}

function makeTargetPath(mdRelativePath, slug) {
  if (slug) {
    const parsedPath = path.parse(mdRelativePath);
    return path.join(
      outputDir,
      path.format({ dir: parsedPath.dir, name: slug, ext: '.html' })
    );
  }
  return path.join(
    outputDir,
    mdRelativePath.replace('.md', '.html')
  );
}

const entries = await fs.readdir(blogDir, { recursive: true });
let adiagoPromises = entries
  .filter(e => e.endsWith(".md"))
  .map(async entry => {
    const data = await fs.readFile(path.join(blogDir, entry), { encoding: 'utf-8' });
    const mattered = matter(data);
    const metadata = blogMetadata(entry, mattered.data);
    const parsed = marked.parse(mattered.content, { mangle: false, headerIds: false });
    const targetPath = makeTargetPath(entry, mattered.data.slug);

    await createDirIfNotExists(path.dirname(targetPath));

    await fs.writeFile(targetPath, parsed);
    setOrMerge(metadata);
  });

await Promise.all(adiagoPromises);
adiagoPromises = [];

// metadata for each post, filename will be [slug].json so I can easily find other language versions
for (const value of blogs.values()) {
  value.languageVersions.forEach(langVersion => {
    const path = makeTargetPath(langVersion.path, langVersion.slug);

    // I will make current language first, so when I am using this on frontend I can do
    // post.languageVersions[0].title to get title and so on.
    const valueWithCurrentLanguageFirst = { ...value, languageVersions: value.languageVersions.toSorted(lv => lv == langVersion ? -1 : 1) };

    adiagoPromises.push(fs.writeFile(path.replace('.html', '.json'), JSON.stringify(valueWithCurrentLanguageFirst)));
  });
}

// And now let's just save list of posts sorted by date ^^
// But wait! You want to use this JSON as a source for your blog list?! It will get huge to load
// Well it will be somewhere about 0.7-1KB per post without compression,
// not a big issue unless I will have like 420 posts.
const postsSorted = Array.from(blogs.values()).sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
adiagoPromises.push(fs.writeFile(path.join(outputDir, 'posts.json'), JSON.stringify(postsSorted)));

await Promise.all(adiagoPromises);
