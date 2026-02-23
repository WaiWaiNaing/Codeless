-- Codeless v4 – Initial schema (User, Post, Comment)
-- Run: npx codeless migrate

CREATE TABLE IF NOT EXISTS "User" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  age INTEGER
);

CREATE TABLE IF NOT EXISTS "Post" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  authorId INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "Comment" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postId INTEGER NOT NULL,
  text TEXT NOT NULL,
  author TEXT
);
